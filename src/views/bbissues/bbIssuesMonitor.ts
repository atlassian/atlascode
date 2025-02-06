import * as path from 'path';
import * as vscode from 'vscode';
import { clientForSite } from '../../bitbucket/bbUtils';
import { BitbucketIssue, WorkspaceRepo } from '../../bitbucket/model';
import { Commands } from '../../commands';

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

                let newIssues = issuesList.data.filter((i) => Date.parse(i.data.created_on!) > lastChecked.getTime());

                if (newIssues.length > 0) {
                    let repoName = path.basename(wsRepo.rootUri);
                    return [{ repo: repoName, issues: newIssues }];
                }
                return [];
            });
        });
        Promise.all(promises)
            .then((result) => result.reduce((prev, curr) => prev.concat(curr), []))
            .then((notifiableRepos) => {
                const choice = vscode.l10n.t('Show');
                if (notifiableRepos.length === 1 && notifiableRepos[0].issues.length === 1) {
                    let issue: BitbucketIssue = notifiableRepos[0].issues[0];
                    vscode.window
                        .showInformationMessage(
                            vscode.l10n.t(
                                'New Bitbucket issue "{0}" was created for repo "{1}"',
                                issue.data.title,
                                notifiableRepos[0].repo,
                            ),
                            choice,
                        )
                        .then((usersChoice) => {
                            if (usersChoice === choice) {
                                vscode.commands.executeCommand(Commands.ShowBitbucketIssue, issue);
                            }
                        });
                } else if (notifiableRepos.length > 0) {
                    vscode.window
                        .showInformationMessage(
                            vscode.l10n.t(
                                'New Bitbucket issues were created for the following repositories: {0}',
                                notifiableRepos.map((nr) => nr.repo).join(', '),
                            ),
                            choice,
                        )
                        .then((usersChoice) => {
                            if (usersChoice === choice) {
                                vscode.commands.executeCommand('workbench.view.extension.atlascode-drawer');
                                vscode.commands.executeCommand(Commands.BitbucketIssuesRefresh);
                            }
                        });
                }
            });
    }
}
