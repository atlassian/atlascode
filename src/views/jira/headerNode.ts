import { TreeItem, TreeItemCollapsibleState } from 'vscode';

import { Commands } from '../../commands';
import { Resources } from '../../resources';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';

export class CreateJiraIssueNode extends AbstractBaseNode {
    getTreeItem(): TreeItem {
        const treeItem = new TreeItem('Create issue...', TreeItemCollapsibleState.None);
        treeItem.iconPath = Resources.icons.get('add');

        treeItem.command = {
            command: Commands.CreateIssue,
            title: 'Create Jira issue',
            arguments: [undefined, 'explorerNode'],
        };

        return treeItem;
    }
}
