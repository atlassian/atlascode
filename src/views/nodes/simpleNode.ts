import { Command, TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';

import { AbstractBaseNode } from './abstractBaseNode';

export class SimpleNode extends AbstractBaseNode {
    constructor(
        readonly _message: string,
        readonly _command?: Command,
    ) {
        super();
    }

    getTreeItem() {
        const text = this._message;
        const treeItem = new TreeItem(text, TreeItemCollapsibleState.None);
        treeItem.tooltip = text;
        treeItem.command = this._command;
        treeItem.resourceUri = Uri.parse(text);
        return treeItem;
    }
}
