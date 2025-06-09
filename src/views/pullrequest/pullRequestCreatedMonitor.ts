import * as path from 'path';
import * as vscode from 'vscode';

import { BitbucketContext } from '../../bitbucket/bbContext';
import { clientForSite } from '../../bitbucket/bbUtils';
import { Commands } from '../../constants';
import { Logger } from '../../logger';
import { BitbucketActivityMonitor } from '../BitbucketActivityMonitor';

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

                    const newPRs = prList.data.filter((i) => {
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
