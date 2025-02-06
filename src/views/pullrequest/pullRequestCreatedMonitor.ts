import * as path from 'path';
import * as vscode from 'vscode';
import { BitbucketContext } from '../../bitbucket/bbContext';
import { clientForSite } from '../../bitbucket/bbUtils';
import { Commands } from '../../commands';
import { Logger } from '../../logger';

export class PullRequestCreatedMonitor implements BitbucketActivityMonitor {
    private _lastCheckedTime = new Map<String, Date>();

    constructor(private _bbCtx: BitbucketContext) {
        this._bbCtx.getBitbucketRepositories().forEach((repo) => this._lastCheckedTime.set(repo.rootUri, new Date()));
    }

    checkForNewActivity() {
        const promises = this._bbCtx.getBitbucketRepositories().map(async (wsRepo) => {
            const site = wsRepo.mainSiteRemote.site;
            if (!site) {
                return [];
            }
            const bbApi = await clientForSite(site);

            return bbApi.pullrequests
                .getLatest(wsRepo)
                .then((prList) => {
                    const lastChecked = this._lastCheckedTime.has(wsRepo.rootUri)
                        ? this._lastCheckedTime.get(wsRepo.rootUri)!
                        : new Date();
                    this._lastCheckedTime.set(wsRepo.rootUri, new Date());

                    let newPRs = prList.data.filter((i) => {
                        const timestamp = typeof i.data.ts === 'number' ? i.data.ts : Date.parse(i.data.ts!);
                        return timestamp > lastChecked.getTime();
                    });
                    return newPRs;
                })
                .catch((e) => {
                    Logger.error(e, 'Error while fetching latest pull requests');
                    return [];
                });
        });
        Promise.all(promises)
            .then((result) => result.reduce((prev, curr) => prev.concat(curr), []))
            .then((allPRs) => {
                const choice = vscode.l10n.t('Show');
                if (allPRs.length === 1) {
                    let repoName = path.basename(allPRs[0].site.repoSlug);
                    vscode.window
                        .showInformationMessage(
                            vscode.l10n.t('New pull request "{0}" for repo "{1}"', allPRs[0].data.title, repoName),
                            choice,
                        )
                        .then((usersChoice) => {
                            if (usersChoice === choice) {
                                vscode.commands.executeCommand(Commands.BitbucketShowPullRequestDetails, allPRs[0]);
                            }
                        });
                } else if (allPRs.length > 0) {
                    let repoNames = [...new Set(allPRs.map((r) => path.basename(r.site.repoSlug)))].join(', ');
                    vscode.window
                        .showInformationMessage(
                            vscode.l10n.t('New pull requests found for the following repositories: {0}', repoNames),
                            choice,
                        )
                        .then((usersChoice) => {
                            if (usersChoice === choice) {
                                vscode.commands.executeCommand('workbench.view.extension.atlascode-drawer');
                                vscode.commands.executeCommand(Commands.BitbucketRefreshPullRequests);
                            }
                        });
                }
            });
    }
}
