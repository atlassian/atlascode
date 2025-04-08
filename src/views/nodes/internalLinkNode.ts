import vscode, { TreeItem, TreeItemCollapsibleState } from 'vscode';

import { iconSet, Resources } from '../../resources';
import { AbstractBaseNode } from './abstractBaseNode';

export class InternalLinkNode extends AbstractBaseNode {
    constructor(
        readonly message: string,
        readonly description: string,
        readonly icon: iconSet,
        readonly command: vscode.Command,
    ) {
        super();
    }

    getTreeItem() {
        const text = this.message;
        const node = new TreeItem(text, TreeItemCollapsibleState.None);
        node.tooltip = text;
        node.description = this.description;
        node.command = this.command;
        node.iconPath = Resources.icons.get(this.icon);
        return node;
    }
}
