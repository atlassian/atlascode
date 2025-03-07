import { isMinimalIssue, MinimalORIssueLink } from '@atlassianlabs/jira-pi-common-models';
import * as vscode from 'vscode';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { Commands } from '../../commands';
import { AbstractBaseNode } from './abstractBaseNode';
import { Features, FeatureFlagClient } from '../../util/featureFlags';
import {
    DONE_ISSUE_ID,
    IN_PROGRESS_ISSUE_ID,
    ISSUE_NODE_CONTEXT_VALUE,
    TO_DO_ISSUE_ID,
} from '../jira/treeViews/constants';

const getIssueContextValue = (issue: MinimalORIssueLink<DetailedSiteInfo>) => {
    const statusCategory = issue.status.statusCategory.name;
    switch (statusCategory.toLowerCase()) {
        case 'to do':
            return TO_DO_ISSUE_ID;
        case 'in progress':
            return IN_PROGRESS_ISSUE_ID;
        case 'done':
            return DONE_ISSUE_ID;
        default:
            return ISSUE_NODE_CONTEXT_VALUE;
    }
};

export class IssueNode extends AbstractBaseNode {
    public issue: MinimalORIssueLink<DetailedSiteInfo>;
    private _newPanelFG: boolean = false;
    constructor(_issue: MinimalORIssueLink<DetailedSiteInfo>, parent: AbstractBaseNode | undefined) {
        super(parent);
        this.issue = _issue;
        this._newPanelFG = FeatureFlagClient.areFeaturesInitialized()
            ? FeatureFlagClient.featureGates[Features.NewSidebarTreeView]
            : false;
    }

    getTreeItem(): vscode.TreeItem {
        let title: string;
        let description: string | undefined;
        let contextValue: string;
        const summary = isMinimalIssue(this.issue) && this.issue.isEpic ? this.issue.epicName : this.issue.summary;

        if (this._newPanelFG) {
            title = this.issue.key;
            description = summary;
            contextValue = getIssueContextValue(this.issue);
        } else {
            title = `${this.issue.key} ${summary}`;
            description = undefined;
            contextValue = ISSUE_NODE_CONTEXT_VALUE;
        }

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
}
