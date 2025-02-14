import * as path from 'path';
import * as vscode from 'vscode';
import { clientForSite } from '../../bitbucket/bbUtils';
import { BitbucketIssue, WorkspaceRepo } from '../../bitbucket/model';
import { Commands } from '../../commands';
import { BitbucketActivityMonitor } from '../BitbucketActivityMonitor';

export class BitbucketIssuesMonitor implements BitbucketActivityMonitor {
    private _lastCheckedTime = new Map<String, Date>();

    constructor(private _repos: WorkspaceRepo[]) {
        this._repos.forEach((repo) => this._lastCheckedTime.set(repo.rootUri, new Date()));
    }

    async checkForNewActivity() {
        const promises = this._repos.map(async (wsRepo) => {
            const site = wsRepo.mainSiteRemote.site;
            if (!site) {
                return [];
            }
            const bbApi = await clientForSite(site);

            return bbApi.issues!.getLatest(wsRepo).then((issuesList) => {
                const lastChecked = this._lastCheckedTime.has(wsRepo.rootUri)
                    ? this._lastCheckedTime.get(wsRepo.rootUri)!
                    : new Date();
                this._lastCheckedTime.set(wsRepo.rootUri, new Date());

                const newIssues = issuesList.data.filter((i) => Date.parse(i.data.created_on!) > lastChecked.getTime());

                if (newIssues.length > 0) {
                    const repoName = path.basename(wsRepo.rootUri);
                    return [{ repo: repoName, issues: newIssues }];
                }
                return [];
            });
        });
        Promise.all(promises)
            .then((result) => result.reduce((prev, curr) => prev.concat(curr), []))
            .then((notifiableRepos) => {
                if (notifiableRepos.length === 1 && notifiableRepos[0].issues.length === 1) {
                    const issue: BitbucketIssue = notifiableRepos[0].issues[0];
                    vscode.window
                        .showInformationMessage(
                            `New Bitbucket issue "${issue.data.title}" was created for repo "${notifiableRepos[0].repo}"`,
                            'Show',
                        )
                        .then((usersChoice) => {
                            if (usersChoice === 'Show') {
                                vscode.commands.executeCommand(Commands.ShowBitbucketIssue, issue);
                            }
                        });
                } else if (notifiableRepos.length > 0) {
                    vscode.window
                        .showInformationMessage(
                            `New Bitbucket issues were created for the following repositories: ${notifiableRepos
                                .map((nr) => nr.repo)
                                .join(', ')}`,
                            'Show',
                        )
                        .then((usersChoice) => {
                            if (usersChoice === 'Show') {
                                vscode.commands.executeCommand('workbench.view.extension.atlascode-drawer');
                                vscode.commands.executeCommand(Commands.BitbucketIssuesRefresh);
                            }
                        });
                }
            });
    }
}
