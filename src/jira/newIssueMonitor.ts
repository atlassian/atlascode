import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { format } from 'date-fns';
import pSettle from 'p-settle';
import { commands, window } from 'vscode';
import { DetailedSiteInfo, ProductJira } from '../atlclients/authInfo';
import { showIssue } from '../commands/jira/showIssue';
import { Container } from '../container';
import { issuesForJQL } from '../jira/issuesForJql';
import { Logger } from '../logger';
import * as vscode from 'vscode';

type JQLSettleResult = { jqlName: string; issues: MinimalIssue<DetailedSiteInfo>[] };
export class NewIssueMonitor {
    private _timestamp = new Date();

    private addCreatedTimeToQuery(jqlQuery: string, ts: string): string {
        let newQuery: string = jqlQuery;
        const createBits = `AND created > "${ts}"`;

        const orderByIndex: number = jqlQuery.toUpperCase().indexOf('ORDER BY');

        if (orderByIndex > -1) {
            newQuery = newQuery.slice(0, orderByIndex) + `${createBits} ` + newQuery.slice(orderByIndex);
        } else {
            newQuery = newQuery + ` ${createBits}`;
        }

        return newQuery;
    }

    async checkForNewIssues() {
        if (
            !Container.onlineDetector.isOnline() ||
            !Container.config.jira.explorer.monitorEnabled ||
            !Container.siteManager.productHasAtLeastOneSite(ProductJira)
        ) {
            return;
        }

        const ts = format(this._timestamp, 'yyyy-MM-dd HH:mm');
        try {
            const enabledJQLs = Container.jqlManager.notifiableJQLEntries();
            const jqlPromises: Promise<JQLSettleResult>[] = [];
            enabledJQLs.forEach((entry) => {
                jqlPromises.push(
                    (async () => {
                        const site = Container.siteManager.getSiteForId(ProductJira, entry.siteId);
                        if (site) {
                            const issues = await issuesForJQL(this.addCreatedTimeToQuery(entry.query, ts), site);
                            return { jqlName: entry.name, issues: issues };
                        }
                        return Promise.reject(`no site for id ${entry.siteId}`);
                    })(),
                );
            });

            const foundIssues: MinimalIssue<DetailedSiteInfo>[] = [];

            let jqlResults = await pSettle<JQLSettleResult>(jqlPromises);
            jqlResults.forEach((result) => {
                if (result.isFulfilled) {
                    const newIssues = result.value.issues.filter((issue) => issue.created! > this._timestamp);
                    if (newIssues.length > 0) {
                        newIssues.forEach((issue) => {
                            foundIssues.push(issue);
                            if (issue.created! > this._timestamp) {
                                this._timestamp = issue.created!;
                            }
                        });
                    }
                }
            });

            const notifyIssues = foundIssues.reduce(
                (result: MinimalIssue<DetailedSiteInfo>[], item: MinimalIssue<DetailedSiteInfo>) => {
                    if (!result.find((iss) => iss.key === item.key && iss.siteDetails.id === item.siteDetails.id)) {
                        return result.concat(item);
                    } else {
                        return result;
                    }
                },
                [],
            );

            this.showNotification(notifyIssues);
        } catch (e) {
            Logger.error(new Error(`Error checking for new issues ${e}`));
        }
    }

    private showNotification(newIssues: MinimalIssue<DetailedSiteInfo>[]) {
        if (newIssues.length === 0) {
            return;
        }

        const issueNames = newIssues.map((issue) => `[${issue.key}] "${issue.summary}"`);
        var message = '';
        if (newIssues.length === 1) {
            message = vscode.l10n.t('{0} added to explorer', issueNames[0]);
        } else if (newIssues.length <= 3) {
            const param1 = issueNames.slice(0, -1).join(', ');
            const param2 = issueNames.slice(-1)[0];
            message = vscode.l10n.t('{0} and {1} added to explorer', param1, param2);
        } else {
            const param1 = issueNames.slice(0, 2).join(', ');
            const param2 = newIssues.length - 2;
            message = vscode.l10n.t('{0} and {1} other new issues added to explorer', param1, param2);
        }

        const title = newIssues.length === 1 ? vscode.l10n.t('Open Issue') : vscode.l10n.t('View Atlassian Explorer');
        window.showInformationMessage(message, title).then((selection) => {
            if (selection) {
                if (newIssues.length === 1) {
                    showIssue(newIssues[0]);
                } else {
                    commands.executeCommand('workbench.view.extension.atlascode-drawer');
                }
            }
        });
    }
}
