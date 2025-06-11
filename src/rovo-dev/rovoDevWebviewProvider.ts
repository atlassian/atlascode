import path from 'path';
import { rovodevInfo } from 'src/constants';
import {
    CancellationToken,
    commands,
    Disposable,
    Memento,
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

import { getHtmlForView } from '../webview/common/getHtmlForView';
import { RovoDevResponse, RovoDevResponseParser } from './responseParser';

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
                                author: 'RovoDev',
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

        const globalPort = process.env[rovodevInfo.envVars.port];
        if (globalPort) {
            return parseInt(globalPort, 10);
        }

        const wsPath = workspaceFolders[0].uri.fsPath;
        const mapping = this._globalState.get<{ [key: string]: number }>(rovodevInfo.mappingKey);
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
                body: JSON.stringify({
                    message: message,
                }),
            });

            if (!response.body) {
                throw new Error('No response body');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            const parser = new RovoDevResponseParser();
            parser.onNewMessage((msg) => this.processMessage(msg));

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                const data = decoder.decode(value, { stream: true });
                await parser.parse(data);
            }

            await parser.flush();

            // Send final complete message when stream ends
            await this._webView.postMessage({
                type: 'completeMessage',
            });
        } catch (error) {
            console.error('Error fetching data:', error);
            await this._webView.postMessage({
                type: 'errorMessage',
                message: {
                    text: `Error: ${error.message}`,
                    author: 'RovoDev',
                    timestamp: Date.now(),
                },
            });
        }
    }

    private processMessage(response: RovoDevResponse): Thenable<boolean> {
        console.warn(`${response.event_kind} ${(response as any).content}`);
        const webView = this._webView!;

        switch (response.event_kind) {
            case 'text':
                return webView.postMessage({
                    type: 'response',
                    dataObject: response,
                });

            case 'tool-call':
                return webView.postMessage({
                    type: 'toolCall',
                    dataObject: response,
                });

            case 'tool-return':
            case 'retry-prompt':
                return webView.postMessage({
                    type: 'toolResult',
                    dataObject: response,
                });

            default:
                return Promise.resolve(false);
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
        // focus on the specific vscode view
        commands.executeCommand('atlascode.views.rovoDev.webView.focus');
        // Wait for the webview to initialize, up to 5 seconds
        const initialized = await this.waitForWebview();
        if (!initialized) {
            console.error('Webview is not initialized after waiting.');
            return;
        }

        // Actually invoke the rovodev service, feed responses to the webview as normal
        await this.processPromptMessage(prompt);
    }

    private async waitForWebview(timeoutMs = 5000): Promise<boolean> {
        const interval = 50;
        let waited = 0;
        while (!this._webView && waited < timeoutMs) {
            await new Promise((res) => setTimeout(res, interval));
            waited += interval;
        }
        return !!this._webView;
    }
}
