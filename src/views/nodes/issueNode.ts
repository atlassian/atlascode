import { isMinimalIssue, MinimalORIssueLink } from '@atlassianlabs/jira-pi-common-models';
import * as vscode from 'vscode';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { Commands } from '../../commands';
import { AbstractBaseNode } from './abstractBaseNode';

const ISSUE_NODE_CONTEXT_VALUE = 'jiraIssue';

export class IssueNode extends AbstractBaseNode {
    public issue: MinimalORIssueLink<DetailedSiteInfo>;
    constructor(_issue: MinimalORIssueLink<DetailedSiteInfo>, parent: AbstractBaseNode | undefined) {
        super(parent);
        this.issue = _issue;
    }

    getTreeItem(): vscode.TreeItem {
        const title = isMinimalIssue(this.issue) && this.issue.isEpic ? this.issue.epicName : this.issue.summary;

        const treeItem = new vscode.TreeItem(
            `${this.issue.key} ${title}`,
            isMinimalIssue(this.issue) && (this.issue.subtasks.length > 0 || this.issue.epicChildren.length > 0)
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.None,
        );
        treeItem.command = { command: Commands.ShowIssue, title: 'Show Issue', arguments: [this.issue] };
        treeItem.iconPath = vscode.Uri.parse(this.issue.issuetype.iconUrl);
        treeItem.contextValue = ISSUE_NODE_CONTEXT_VALUE;
        treeItem.tooltip = `${this.issue.key} - ${this.issue.summary}\n\n${this.issue.priority.name}    |    ${this.issue.status.name}`;
        treeItem.resourceUri = vscode.Uri.parse(`${this.issue.siteDetails.baseLinkUrl}/browse/${this.issue.key}`);
        return treeItem;
    }

    async getChildren(element?: IssueNode): Promise<IssueNode[]> {
        if (element) {
            return element.getChildren();
        }
        if (isMinimalIssue(this.issue) && Array.isArray(this.issue.subtasks) && this.issue.subtasks.length > 0) {
            return this.issue.subtasks.map((subtask) => new IssueNode(subtask, this));
        }

        if (
            isMinimalIssue(this.issue) &&
            Array.isArray(this.issue.epicChildren) &&
            this.issue.epicChildren.length > 0
        ) {
            return this.issue.epicChildren.map((epicChild) => new IssueNode(epicChild, this));
        }
        return [];
    }
}
