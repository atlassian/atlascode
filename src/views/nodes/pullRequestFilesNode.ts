import path from 'path';
import * as vscode from 'vscode';

import { FileStatus } from '../../bitbucket/model';
import { Commands } from '../../commands';
import { configuration } from '../../config/configuration';
import { DiffViewArgs } from '../pullrequest/diffViewHelper';
import { AbstractBaseNode } from './abstractBaseNode';

export class PullRequestFilesNode extends AbstractBaseNode {
    constructor(private diffViewData: DiffViewArgs) {
        super();
    }

    createFileChangeUri(fileName: string, status: FileStatus, prUrl: string, hasComments: boolean): vscode.Uri {
        return vscode.Uri.parse(`${prUrl}/${fileName}`).with({
            scheme: 'pullRequest',
            query: JSON.stringify({
                status: status,
                hasComments: hasComments,
            }),
        });
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        const itemData = this.diffViewData.fileDisplayData;
        let fileDisplayString = itemData.fileDisplayName;
        if (configuration.get<boolean>('bitbucket.explorer.nestFilesEnabled')) {
            fileDisplayString = path.basename(itemData.fileDisplayName);
        }
        const item = new vscode.TreeItem(fileDisplayString, vscode.TreeItemCollapsibleState.None);
        item.tooltip = itemData.fileDisplayName;
        item.command = {
            command: Commands.ViewDiff,
            title: 'Diff file',
            arguments: this.diffViewData.diffArgs,
        };

        item.resourceUri = this.createFileChangeUri(
            itemData.fileDisplayName,
            itemData.fileDiffStatus,
            itemData.prUrl,
            itemData.numberOfComments > 0,
        );
        item.iconPath = undefined;

        return item;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        return [];
    }
}
