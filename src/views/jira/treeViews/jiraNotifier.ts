import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { commands, window } from 'vscode';

import { showIssue } from '../../../commands/jira/showIssue';

export class JiraNotifier {
    private readonly _knownIssues = new Set<string>();

    public ignoreAssignedIssues(issues: MinimalIssue<DetailedSiteInfo>[]) {
        issues.forEach((issue) => this._knownIssues.add(this.getIssueId(issue)));
    }

    public notifyForNewAssignedIssues(issues: MinimalIssue<DetailedSiteInfo>[]) {
        const newIssues: MinimalIssue<DetailedSiteInfo>[] = [];

        for (const issue of issues) {
            const issueId = this.getIssueId(issue);
            if (!this._knownIssues.has(issueId)) {
                this._knownIssues.add(issueId);
                newIssues.push(issue);
            }
        }

        this.showNotification(newIssues);
    }

    private getIssueId(issue: MinimalIssue<DetailedSiteInfo>) {
        return `${issue.key}_${issue.siteDetails.id}`;
    }

    private showNotification(newIssues: MinimalIssue<DetailedSiteInfo>[]) {
        if (!newIssues.length) {
            return;
        }

        const issueNames = newIssues.map((issue) => `[${issue.key}] "${issue.summary}"`);
        let message = '';
        if (newIssues.length === 1) {
            message = `${issueNames[0]} assigned to you`;
        } else if (newIssues.length <= 3) {
            message = `${issueNames.slice(0, -1).join(', ')} and ${issueNames.slice(-1)} assigned to you`;
        } else {
            message = `${issueNames.slice(0, 2).join(', ')} and ${
                newIssues.length - 2
            } other new issues assigned to you`;
        }

        const title = newIssues.length === 1 ? 'Open Issue' : 'View Atlassian Explorer';
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
