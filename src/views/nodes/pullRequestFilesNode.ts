import path from 'path';
import * as vscode from 'vscode';

import { FileStatus } from '../../bitbucket/model';
import { Commands } from '../../commands';
import { configuration } from '../../config/configuration';
import { DiffViewArgs } from '../pullrequest/diffViewHelper';
import { AbstractBaseNode } from './abstractBaseNode';

export class FileDecorationProvider implements vscode.FileDecorationProvider {
    private _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri[]>();
    readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

    provideFileDecoration(
        uri: vscode.Uri,
        _token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.FileDecoration> {
        try {
            const params = JSON.parse(uri.query);
            const status = params.status as FileStatus;
            const hasComments = params.hasComments;
            if (status) {
                return {
                    badge: hasComments ? `💬${status}` : status,
                    color: this.getColor(status),
                    tooltip: hasComments ? `File has comments` : undefined,
                    propagate: false,
                };
            }
        } catch (e) {
            console.error('Error in provideFileDecoration:', e);
        }
        return undefined;
    }

    private getColor(status: FileStatus): vscode.ThemeColor {
        switch (status) {
            case FileStatus.MODIFIED:
                return new vscode.ThemeColor('gitDecoration.modifiedResourceForeground');
            case FileStatus.ADDED:
                return new vscode.ThemeColor('gitDecoration.addedResourceForeground');
            case FileStatus.DELETED:
                return new vscode.ThemeColor('gitDecoration.deletedResourceForeground');
            case FileStatus.RENAMED:
                return new vscode.ThemeColor('gitDecoration.renamedResourceForeground');
            case FileStatus.CONFLICT:
                return new vscode.ThemeColor('gitDecoration.conflictingResourceForeground');
            case FileStatus.COPIED:
                return new vscode.ThemeColor('gitDecoration.addedResourceForeground');
            default:
                return new vscode.ThemeColor('gitDecoration.modifiedResourceForeground');
        }
    }
}

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
