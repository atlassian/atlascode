import * as path from 'path';
import * as vscode from 'vscode';

import { BitbucketContext } from '../../bitbucket/bbContext';
import { BitbucketLogger } from '../../bitbucket/bbLogger';
import { clientForSite } from '../../bitbucket/bbUtils';
import { WorkspaceRepo } from '../../bitbucket/model';
import { Commands } from '../../constants';
import { Logger } from '../../logger';
import { categorizeNetworkError } from '../../util/retry';
import { BitbucketActivityMonitor } from '../BitbucketActivityMonitor';

export class PullRequestCreatedMonitor implements BitbucketActivityMonitor {
    private _lastCheckedTime = new Map<string, Date>();
    private _lastSuccessfulFetch = new Map<string, Date | undefined>();
    private _consecutiveFailures = new Map<string, number>();
    private _failedCredentials = new Set<string>(); // Track credentials that failed auth/network this cycle
    private _invalidatedCredentials = new Set<string>(); // Permanently track invalidated credentials - never retry
    private readonly MAX_CONSECUTIVE_FAILURES = 5;

    constructor(private _bbCtx: BitbucketContext) {
        this._bbCtx.getBitbucketRepositories().forEach((repo) => {
            this._lastCheckedTime.set(repo.rootUri, new Date());
            this._consecutiveFailures.set(repo.rootUri, 0);
        });
    }

    checkForNewActivity() {
        // Reset failed credentials at the start of each check cycle
        this._failedCredentials.clear();

        // Group repos by credential to process sequentially per credential
        const reposByCredential = new Map<string, WorkspaceRepo[]>();
        for (const wsRepo of this._bbCtx.getBitbucketRepositories()) {
            const site = wsRepo.mainSiteRemote.site;
            if (!site) {
                continue;
            }
            const credentialId = site.details.credentialId;
            if (!reposByCredential.has(credentialId)) {
                reposByCredential.set(credentialId, []);
            }
            reposByCredential.get(credentialId)!.push(wsRepo);
        }

        // Process each credential group independently (in parallel across credentials, sequential within)
        const promises = Array.from(reposByCredential.entries()).map(async ([credentialId, repos]) => {
            const results: any[] = [];

            // Process repos with same credential sequentially to enable early termination
            for (const wsRepo of repos) {
                const site = wsRepo.mainSiteRemote.site!;

                // Skip if credential is permanently invalidated
                if (this._invalidatedCredentials.has(credentialId)) {
                    Logger.debug(
                        `Skipping ${path.basename(wsRepo.rootUri)} - credential ${credentialId} has been invalidated`,
                    );
                    continue;
                }

                // Skip if this credential already failed this cycle
                if (this._failedCredentials.has(credentialId)) {
                    Logger.debug(
                        `Skipping ${path.basename(wsRepo.rootUri)} - credential ${credentialId} already failed this cycle`,
                    );
                    continue;
                }

                try {
                    const bbApi = await clientForSite(site);

                    if (!bbApi.pullrequests) {
                        Logger.warn(`Pull requests API not available for ${path.basename(wsRepo.rootUri)}`);
                        continue;
                    }

                    const prList = await bbApi.pullrequests.getLatest(wsRepo);

                    this._consecutiveFailures.set(wsRepo.rootUri, 0);
                    this._lastSuccessfulFetch.set(wsRepo.rootUri, new Date());

                    // Clear invalidated credential on successful auth
                    this._invalidatedCredentials.delete(credentialId);

                    const lastChecked = this._lastCheckedTime.has(wsRepo.rootUri)
                        ? this._lastCheckedTime.get(wsRepo.rootUri)!
                        : new Date();
                    this._lastCheckedTime.set(wsRepo.rootUri, new Date());

                    const newPRs = prList.data.filter((i) => {
                        const timestamp = typeof i.data.ts === 'number' ? i.data.ts : Date.parse(i.data.ts!);
                        return timestamp > lastChecked.getTime();
                    });
                    results.push(...newPRs);
                } catch (e: any) {
                    const errorInfo = categorizeNetworkError(e);
                    const repoName = wsRepo.rootUri;

                    // Check if credentials are invalidated - never retry these
                    const errorMessage = e.message?.toLowerCase() || '';
                    if (
                        errorMessage.includes('credentials invalidated') ||
                        errorMessage.includes('credential invalidated')
                    ) {
                        this._invalidatedCredentials.add(credentialId);
                        Logger.warn(
                            `Credential ${credentialId} has been invalidated - will not retry until re-authenticated`,
                        );
                    }

                    // Mark credential as failed for systemic errors
                    if (['auth', 'network', 'dns', 'timeout'].includes(errorInfo.category)) {
                        this._failedCredentials.add(credentialId);
                    }

                    const failures = (this._consecutiveFailures.get(wsRepo.rootUri) || 0) + 1;
                    this._consecutiveFailures.set(wsRepo.rootUri, failures);

                    const lastSuccess = this._lastSuccessfulFetch.get(wsRepo.rootUri);
                    const timeSinceLastSuccess = lastSuccess ? Date.now() - lastSuccess.getTime() : -1;

                    const logMessage = `Error while fetching latest pull requests for ${repoName}`;
                    const logTags = [
                        `error_category:${errorInfo.category}`,
                        `error_details:${errorInfo.message}`,
                        `consecutive_failures:${failures}`,
                        `time_since_last_success_ms:${timeSinceLastSuccess}`,
                    ];

                    // Auth errors (401/403) are expected when credentials expire - warn instead of error
                    if (errorInfo.category === 'auth') {
                        Logger.warn(`${logMessage} - ${logTags.join(', ')}`);
                    } else {
                        BitbucketLogger.error(e, logMessage, ...logTags);
                    }

                    if (failures >= this.MAX_CONSECUTIVE_FAILURES) {
                        const repoBaseName = path.basename(repoName);
                        Logger.warn(
                            `Persistent PR fetch failures for "${repoBaseName}": ${failures} consecutive ${errorInfo.category} errors. Auto-retry continues.`,
                        );
                    }
                }
            }

            return results;
        });
        Promise.all(promises)
            .then((result) => result.reduce((prev, curr) => prev.concat(curr), []))
            .then((allPRs) => {
                if (allPRs.length === 1) {
                    const repoName = path.basename(allPRs[0].site.repoSlug);
                    vscode.window
                        .showInformationMessage(
                            `New pull request "${allPRs[0].data.title}" for repo "${repoName}"`,
                            'Show',
                        )
                        .then((usersChoice) => {
                            if (usersChoice === 'Show') {
                                vscode.commands.executeCommand(Commands.BitbucketShowPullRequestDetails, allPRs[0]);
                            }
                        });
                } else if (allPRs.length > 0) {
                    const repoNames = [...new Set(allPRs.map((r) => path.basename(r.site.repoSlug)))].join(', ');
                    vscode.window
                        .showInformationMessage(
                            `New pull requests found for the following repositories: ${repoNames}`,
                            'Show',
                        )
                        .then((usersChoice) => {
                            if (usersChoice === 'Show') {
                                vscode.commands.executeCommand('workbench.view.extension.atlascode-drawer');
                                vscode.commands.executeCommand(Commands.BitbucketRefreshPullRequests);
                            }
                        });
                }
            });
    }
}
