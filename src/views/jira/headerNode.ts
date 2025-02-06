import { TreeItem, TreeItemCollapsibleState, l10n } from 'vscode';
import { Commands } from '../../commands';
import { Resources } from '../../resources';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';

export class CreateJiraIssueNode extends AbstractBaseNode {
    getTreeItem(): TreeItem {
        let treeItem = new TreeItem(l10n.t('Create issue...'), TreeItemCollapsibleState.None);
        treeItem.iconPath = Resources.icons.get('add');

        treeItem.command = {
            command: Commands.CreateIssue,
            title: l10n.t('Create Jira issue'),
            arguments: [undefined, 'explorerNode'],
        };

        return treeItem;
    }
}
