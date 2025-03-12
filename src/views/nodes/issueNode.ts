import { isMinimalIssue, MinimalORIssueLink } from '@atlassianlabs/jira-pi-common-models';
import * as vscode from 'vscode';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { Commands } from '../../commands';
import { AbstractBaseNode } from './abstractBaseNode';
import { Features, FeatureFlagClient } from '../../util/featureFlags';

export class IssueNode extends AbstractBaseNode {
    public issue: MinimalORIssueLink<DetailedSiteInfo>;
    private _isUsingNewPanelFG: boolean = false;
    constructor(_issue: MinimalORIssueLink<DetailedSiteInfo>, parent: AbstractBaseNode | undefined) {
        super(parent);
        this.issue = _issue;
        this._isUsingNewPanelFG = FeatureFlagClient.featureGates[Features.NewSidebarTreeView];
    }

    getTreeItem(): vscode.TreeItem {
        const { title, description, contextValue } = this.prepareTreeItem();

        const treeItem = new vscode.TreeItem(
            title,
            isMinimalIssue(this.issue) && (this.issue.subtasks.length > 0 || this.issue.epicChildren.length > 0)
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.None,
        );
        treeItem.description = description;
        treeItem.command = { command: Commands.ShowIssue, title: 'Show Issue', arguments: [this.issue] };
        treeItem.iconPath = vscode.Uri.parse(this.issue.issuetype.iconUrl);
        treeItem.contextValue = contextValue;
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
    private prepareTreeItem() {
        const summary = isMinimalIssue(this.issue) && this.issue.isEpic ? this.issue.epicName : this.issue.summary;

        return this._isUsingNewPanelFG
            ? {
                  title: this.issue.key,
                  description: summary,
                  contextValue: 'jiraIssue',
              }
            : {
                  title: `${this.issue.key} ${summary}`,
                  description: undefined,
                  contextValue: 'jiraIssue',
              };
    }
}
