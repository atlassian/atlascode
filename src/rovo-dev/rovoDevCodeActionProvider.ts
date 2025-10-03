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
            this.generateCommand(
                'Explain by Rovo Dev',
                'Please explain what is the problem with this code',
                document,
                range,
                context,
            ),
            this.generateCommand('Fix by Rovo Dev', 'Please fix problem with this code', document, range, context),
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
        context: vscode.CodeActionContext,
    ): vscode.CodeAction {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        const baseName = document.fileName.split(path.sep).pop() || '';
        const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);

        const finalPrompt = context.diagnostics.length
            ? `${prompt}\nAdditional problem context:\n${context.diagnostics.map((d) => d.message).join('\n')}`
            : prompt;

        action.command = {
            command: Commands.RovodevAsk,
            title: 'Ask Rovo Dev',
            arguments: [
                finalPrompt,
                [
                    {
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
                        isFocus: true,
                        enabled: true,
                    },
                ],
            ],
        };
        return action;
    }
}
