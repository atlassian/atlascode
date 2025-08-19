import path from 'path';
import { Commands } from 'src/constants';
import { Container } from 'src/container';
import * as vscode from 'vscode';

export class RovoDevCodeActionProvider implements vscode.CodeActionProvider {
    public provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.CodeAction[]> {
        // Disable completely if Rovo Dev is not enabled
        if (!Container.isRovoDevEnabled) {
            return [];
        }

        // Only show if there is a selection
        if (!range || range.isEmpty) {
            return [];
        }

        return [
            this.generateCommand('Rovo Dev: Explain', 'Please explain this code', document, range),
            this.generateCommand('Rovo Dev: Fix Code', 'Please fix this code', document, range),
            {
                title: 'Rovo Dev: Add to Context',
                command: {
                    command: Commands.RovodevAddToContext,
                    title: 'Add to Rovo Dev Context',
                },
            },
        ];
    }

    public generateCommand(
        title: string,
        prompt: string,
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
    ): vscode.CodeAction {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        const baseName = document.fileName.split(path.sep).pop() || '';
        return {
            title,
            command: {
                command: Commands.RovodevAsk,
                title: 'Ask Rovo Dev',
                arguments: [
                    prompt,
                    {
                        focusInfo: {
                            file: {
                                name: baseName,
                                absolutePath: document.uri.fsPath,
                                relativePath: workspaceFolder
                                    ? path.relative(workspaceFolder.uri.fsPath, document.uri.fsPath)
                                    : document.fileName,
                            },
                            selection: {
                                start: range.start.line,
                                end: range.end.line,
                            },
                            enabled: true,
                        },
                    },
                ],
            },
        };
    }
}
