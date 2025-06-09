import * as vscode from 'vscode';

import { FileStatus } from '../../bitbucket/model';

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
