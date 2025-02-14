import { createEmptyMinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { Command, TreeItem, TreeItemCollapsibleState } from 'vscode';
import { emptySiteInfo } from '../../atlclients/authInfo';
import { AbstractBaseNode } from './abstractBaseNode';
import { IssueNode } from './issueNode';

export class SimpleJiraIssueNode extends IssueNode {
    private command: Command | undefined;

    constructor(
        private text: string,
        command?: Command,
        parent?: AbstractBaseNode | undefined,
    ) {
        super(createEmptyMinimalIssue(emptySiteInfo), parent);
        this.command = command;
    }

    getTreeItem(): TreeItem {
        const treeItem = new TreeItem(this.text, TreeItemCollapsibleState.None);
        treeItem.tooltip = this.text;

        if (this.command) {
            treeItem.command = this.command;
        }

        return treeItem;
    }

    async getChildren(element?: IssueNode): Promise<IssueNode[]> {
        return [];
    }
}
