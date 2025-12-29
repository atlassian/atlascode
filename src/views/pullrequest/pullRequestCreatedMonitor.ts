import * as path from 'path';
import * as vscode from 'vscode';

import { BitbucketContext } from '../../bitbucket/bbContext';
import { BitbucketLogger } from '../../bitbucket/bbLogger';
import { clientForSite } from '../../bitbucket/bbUtils';
import { Commands } from '../../constants';
import { Logger } from '../../logger';
import { categorizeNetworkError, retryWithBackoff } from '../../util/retry';
import { BitbucketActivityMonitor } from '../BitbucketActivityMonitor';

export class PullRequestCreatedMonitor implements BitbucketActivityMonitor {
    private _lastCheckedTime = new Map<string, Date>();
    private _lastSuccessfulFetch = new Map<string, Date | undefined>();
    private _consecutiveFailures = new Map<string, number>();
    private readonly MAX_CONSECUTIVE_FAILURES = 5;

    constructor(private _bbCtx: BitbucketContext) {
        this._bbCtx.getBitbucketRepositories().forEach((repo) => {
            this._lastCheckedTime.set(repo.rootUri, new Date());
            this._consecutiveFailures.set(repo.rootUri, 0);
        });
    }

    checkForNewActivity() {
        const promises = this._bbCtx.getBitbucketRepositories().map(async (wsRepo) => {
            const site = wsRepo.mainSiteRemote.site;
            if (!site) {
                return [];
            }

            try {
                const bbApi = await clientForSite(site);

                const prList = await retryWithBackoff(() => bbApi.pullrequests.getLatest(wsRepo), {
                    maxAttempts: 3,
                    initialDelayMs: 1000,
                    maxDelayMs: 5000,
                });

                this._consecutiveFailures.set(wsRepo.rootUri, 0);
                this._lastSuccessfulFetch.set(wsRepo.rootUri, new Date());

                const lastChecked = this._lastCheckedTime.has(wsRepo.rootUri)
                    ? this._lastCheckedTime.get(wsRepo.rootUri)!
                    : new Date();
                this._lastCheckedTime.set(wsRepo.rootUri, new Date());

                const newPRs = prList.data.filter((i) => {
                    const timestamp = typeof i.data.ts === 'number' ? i.data.ts : Date.parse(i.data.ts!);
                    return timestamp > lastChecked.getTime();
                });
                return newPRs;
            } catch (e: any) {
                const errorInfo = categorizeNetworkError(e);
                const repoName = wsRepo.rootUri;

                const failures = (this._consecutiveFailures.get(wsRepo.rootUri) || 0) + 1;
                this._consecutiveFailures.set(wsRepo.rootUri, failures);

                const lastSuccess = this._lastSuccessfulFetch.get(wsRepo.rootUri);
                const timeSinceLastSuccess = lastSuccess ? Date.now() - lastSuccess.getTime() : -1;

                BitbucketLogger.error(
                    e,
                    `Error while fetching latest pull requests for ${repoName}`,
                    `error_category:${errorInfo.category}`,
                    `error_details:${errorInfo.message}`,
                    `consecutive_failures:${failures}`,
                    `time_since_last_success_ms:${timeSinceLastSuccess}`,
                );

                if (failures >= this.MAX_CONSECUTIVE_FAILURES) {
                    const repoBaseName = path.basename(repoName);
                    Logger.warn(
                        `Persistent PR fetch failures for "${repoBaseName}": ${failures} consecutive ${errorInfo.category} errors. Auto-retry continues.`,
                    );
                }

                return [];
            }
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
