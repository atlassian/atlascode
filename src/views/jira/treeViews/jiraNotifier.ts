import { commands, window } from 'vscode';

import { showIssue } from '../../../commands/jira/showIssue';
import { JiraBadgeManager } from './jiraBadgeManager';
import { JiraIssueNode } from './utils';

export class JiraNotifier {
    private readonly _knownIssues = new Set<string>();

    public ignoreAssignedIssues(issues: JiraIssueNode[]) {
        issues.forEach((issue) => this._knownIssues.add(this.getIssueId(issue)));
    }

    public notifyForNewAssignedIssues(issues: JiraIssueNode[]) {
        const newIssues: JiraIssueNode[] = [];

        for (const issue of issues) {
            const issueId = this.getIssueId(issue);
            if (!this._knownIssues.has(issueId)) {
                this._knownIssues.add(issueId);
                newIssues.push(issue);
            }
        }

        this.showNotification(newIssues);
    }

    private getIssueId(issue: JiraIssueNode) {
        return `${issue.issue.key}_${issue.issue.siteDetails.id}`;
    }

    private showNotification(newIssues: JiraIssueNode[]) {
        if (!newIssues.length) {
            return;
        }

        const issueNames = newIssues.map((issue) => `[${issue.issue.key}] "${issue.issue.summary}"`);
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
                    showIssue(newIssues[0].issue);
                } else {
                    commands.executeCommand('workbench.view.extension.atlascode-drawer');
                }
            }
        });

        const jiraIssueDecorationProvider = JiraBadgeManager.getInstance();
        newIssues.forEach((issue) => {
            jiraIssueDecorationProvider.notificationSent(issue.resourceUri!);
        });
    }
}
