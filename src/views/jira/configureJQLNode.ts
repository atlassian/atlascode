import { TreeItem, TreeItemCollapsibleState, l10n } from 'vscode';
import { Commands } from '../../commands';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';

export class ConfigureJQLNode extends AbstractBaseNode {
    private _label: string;

    constructor(label: string) {
        super();
        this._label = label;
    }

    getTreeItem(): TreeItem {
        let treeItem = new TreeItem(this._label, TreeItemCollapsibleState.None);

        treeItem.command = {
            command: Commands.ShowJiraIssueSettings,
            title: l10n.t('Configure Filters'),
            arguments: ['ConfigureJQLNode'],
        };

        return treeItem;
    }
}
