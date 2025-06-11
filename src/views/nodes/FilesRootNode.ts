import * as vscode from 'vscode';

import { AbstractBaseNode } from './abstractBaseNode';

export class FilesRootNode extends AbstractBaseNode {
    constructor(
        private fileNodes: AbstractBaseNode[],
        parent?: AbstractBaseNode,
    ) {
        super(parent);
    }

    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem('Files', vscode.TreeItemCollapsibleState.Collapsed);
        item.contextValue = 'files-root';
        return item;
    }

    async getChildren(): Promise<AbstractBaseNode[]> {
        return this.fileNodes;
    }
}
