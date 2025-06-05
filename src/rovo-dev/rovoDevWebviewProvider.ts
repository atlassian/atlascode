import path from 'path';
import { getHtmlForView } from 'src/webview/common/getHtmlForView';
import {
    CancellationToken,
    Disposable,
    Position,
    Range,
    Uri,
    Webview,
    WebviewView,
    WebviewViewProvider,
    WebviewViewResolveContext,
    window,
    workspace,
} from 'vscode';
import { Memento } from 'vscode';

import { FetchPayload, FetchResponseData } from './utils';

export class RovoDevWebviewProvider extends Disposable implements WebviewViewProvider {
    private readonly viewType = 'atlascodeRovoDev';
    private _webView?: Webview;

    private _disposables: Disposable[] = [];

    private _globalState: Memento;
    private _extensionPath: string;

    constructor(extensionPath: string, globalState: import('vscode').Memento) {
        super(() => {
            this._dispose();
        });
        this._extensionPath = extensionPath;
        this._globalState = globalState;
        // Register the webview view provider
        this._disposables.push(
            window.registerWebviewViewProvider('atlascode.views.rovoDev.webView', this, {
                webviewOptions: { retainContextWhenHidden: true },
            }),
        );
    }

    public resolveWebviewView(
        webviewView: WebviewView,
        _context: WebviewViewResolveContext,
        _token: CancellationToken,
    ): Thenable<void> | void {
        this._webView = webviewView.webview;

        this._webView.options = {
            enableCommandUris: true,
            enableScripts: true,
            localResourceRoots: [Uri.file(path.join(this._extensionPath, 'build'))],
        };

        this._webView.html = getHtmlForView(
            this._extensionPath,
            webviewView.webview.asWebviewUri(Uri.file(this._extensionPath)),
            webviewView.webview.cspSource,
            this.viewType,
        );

        this._webView.onDidReceiveMessage(async (e) => {
            switch (e.type) {
                case 'prompt':
                    await this.processPromptMessage(e.text);
                    break;
                case 'openFile':
                    try {
                        const filePath: string = e.filePath;
                        let range: Range | undefined;
                        if (e.range && Array.isArray(e.range)) {
                            const startPosition = new Position(e.range[0], 0);
                            const endPosition = new Position(e.range[1], 0);
                            range = e.range ? new Range(startPosition, endPosition) : undefined;
                        }
                        // Get workspace root and resolve the file path
                        let resolvedPath: string;

                        if (path.isAbsolute(filePath)) {
                            // If already absolute, use as-is
                            resolvedPath = filePath;
                        } else {
                            // If relative, resolve against workspace root
                            const workspaceRoot = workspace.workspaceFolders?.[0]?.uri.fsPath;
                            if (!workspaceRoot) {
                                throw new Error('No workspace folder found');
                            }
                            resolvedPath = path.join(workspaceRoot, filePath);
                        }

                        const fileUri = Uri.file(resolvedPath);

                        await window.showTextDocument(fileUri, {
                            selection: range || undefined,
                        });
                    } catch (error) {
                        console.error('Error opening file:', error);
                        await this._webView?.postMessage({
                            type: 'errorMessage',
                            message: {
                                text: `Error: ${error.message}`,
                                author: 'Agent',
                                timestamp: Date.now(),
                            },
                        });
                    }
                    break;
            }
        });
    }

    private getWorkspacePort(): number | undefined {
        const workspaceFolders = workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return undefined;
        }
        const wsPath = workspaceFolders[0].uri.fsPath;
        const mapping = this._globalState.get<{ [key: string]: number }>('workspacePortMapping');
        if (mapping && mapping[wsPath]) {
            return mapping[wsPath];
        }
        return undefined;
    }

    private async processPromptMessage(message: string) {
        const port = this.getWorkspacePort();
        if (!port) {
            window.showErrorMessage(
                'No port mapping found for this workspace. Please ensure the background service is running.',
            );
            return;
        }
        const url = `http://localhost:${port}/v2/chat`;

        const payload: FetchPayload = {
            message: message,
        };

        if (!this._webView) {
            console.error('Webview is not initialized.');
            return;
        }

        // First, send user message
        await this._webView.postMessage({
            type: 'userChatMessage',
            message: {
                text: message,
                author: 'User',
                timestamp: Date.now(),
            },
        });

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.body) {
                throw new Error('No response body');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    // Send final complete message when stream ends
                    await this._webView.postMessage({
                        type: 'completeMessage',
                    });
                    break;
                }
                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('data:')) {
                        try {
                            const data: FetchResponseData = JSON.parse(trimmed.substring(5).trim());

                            // Still send individual chunks for streaming UI effect
                            await this._webView.postMessage({
                                type: 'response',
                                dataObject: data,
                            });
                        } catch (err) {
                            // Ignore JSON parse errors for incomplete lines
                            console.error('Error parsing JSON from response:', err);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            await this._webView.postMessage({
                type: 'errorMessage',
                message: {
                    text: `Error: ${error.message}`,
                    author: 'Agent',
                    timestamp: Date.now(),
                },
            });
        }
    }

    private _dispose() {
        this._disposables.forEach((d) => d.dispose());
        this._disposables = [];
        if (this._webView) {
            this._webView = undefined;
        }
    }

    async reset(): Promise<void> {
        if (!this._webView) {
            console.error('Webview is not initialized.');
            return;
        }

        try {
            await fetch('http://localhost:8899/v2/reset', {
                method: 'POST',
            });
        } finally {
            await this._webView.postMessage({
                type: 'newSession',
            });
        }
    }

    async invoke(prompt: string): Promise<void> {
        if (!this._webView) {
            console.error('Webview is not initialized.');
            return;
        }

        // Actually invoke the rovodev service, feed responses to the webview as normal
        await this.processPromptMessage(prompt);
    }
}
