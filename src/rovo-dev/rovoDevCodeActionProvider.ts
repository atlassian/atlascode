import path from 'path';
import { Logger } from 'src/logger';
import * as vscode from 'vscode';

import { RovodevCommands } from './api/componentApi';
import { ExtensionApi } from './api/extensionApi';
import { buildContextualPrompt, extractCodeContext } from './rovoDevContextExtractor';

export class RovoDevCodeActionProvider implements vscode.CodeActionProvider {
    private readonly extensionApi = new ExtensionApi();

    public provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.CodeAction[]> {
        // Disable completely if Rovo Dev is not enabled
        if (!this.extensionApi.metadata.isRovoDevEnabled()) {
            return [];
        }

        // Only show if there is a selection
        if (!range || range.isEmpty) {
            return [];
        }

        return [
            this.generateCommand('Fix with Rovo Dev', 'Please fix problem with this code', document, range, context),
            {
                title: 'Rovo Dev: Add to Context',
                command: {
                    command: RovodevCommands.RovodevAddToContext,
                    title: 'Add to Rovo Dev Context',
                },
            },
            this.generateCommand(
                'Explain with Rovo Dev',
                'Please explain what is the problem with this code',
                document,
                range,
                context,
            ),
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

        // Determine intent based on title
        const intent = title.toLowerCase().includes('fix') ? 'fix' : 'explain';

        // Build enhanced prompt synchronously with available data
        const enhancedPrompt = this.buildEnhancedPromptSync(prompt, document, range, context.diagnostics, intent);

        action.command = {
            command: RovodevCommands.RovodevAsk,
            title: 'Ask Rovo Dev',
            arguments: [
                enhancedPrompt,
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

    private buildEnhancedPromptSync(
        basePrompt: string,
        document: vscode.TextDocument,
        range: vscode.Range,
        diagnostics: readonly vscode.Diagnostic[],
        intent: 'fix' | 'explain',
    ): string {
        try {
            // Extract rich context synchronously
            const extractedContext = extractCodeContext(document, range, diagnostics);

            // Build contextual prompt
            return buildContextualPrompt(basePrompt, extractedContext, intent);
        } catch (error) {
            // Fallback to basic prompt if context extraction fails
            Logger.warn('Failed to extract context for Rovo Dev:', error);
            // Sanitize diagnostic messages to prevent JSON parsing errors
            const sanitizedMessages = diagnostics.map((d) => d.message.replace(/[\r\n]+/g, ' ').trim()).join('\n');
            return diagnostics.length ? `${basePrompt}\nAdditional problem context:\n${sanitizedMessages}` : basePrompt;
        }
    }
}
