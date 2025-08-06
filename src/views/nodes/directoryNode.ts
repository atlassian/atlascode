import * as vscode from 'vscode';

import { PRDirectory } from '../pullrequest/diffViewHelper';
import { AbstractBaseNode } from './abstractBaseNode';
import { PullRequestFilesNode } from './pullRequestFilesNode';

export class DirectoryNode extends AbstractBaseNode {
    constructor(private directoryData: PRDirectory) {
        super();
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        const item = new vscode.TreeItem(this.directoryData.name, vscode.TreeItemCollapsibleState.Expanded);
        item.tooltip = this.directoryData.name;
        item.iconPath = vscode.ThemeIcon.Folder;
        return item;
    }

    override async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        const directoryNodes: DirectoryNode[] = Array.from(
            this.directoryData.subdirs.values(),
            (subdir) => new DirectoryNode(subdir),
        );
        const fileNodes: AbstractBaseNode[] = this.directoryData.files.map(
            (diffViewArg) => new PullRequestFilesNode(diffViewArg),
        );
        return fileNodes.concat(directoryNodes);
    }
}
