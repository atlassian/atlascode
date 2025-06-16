import path from 'path';
import { rovodevInfo } from 'src/constants';
import { setTimeout } from 'timers/promises';
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
    private _rovoDevApiUrl?: string;
    private _replayDone = false;

    private _disposables: Disposable[] = [];

    private _globalState: Memento;
    private _extensionPath: string;
    private _extensionUri: Uri;

    constructor(extensionPath: string, globalState: Memento) {
        super(() => {
            this._dispose();
        });

        this._extensionPath = extensionPath;
        this._extensionUri = Uri.file(this._extensionPath);
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
            localResourceRoots: [
                Uri.file(path.join(this._extensionPath, 'build')),
                Uri.file(path.join(this._extensionPath, 'node_modules', '@vscode', 'codicons', 'dist')),
                Uri.file(path.join(this._extensionPath, 'node_modules', '@speed-highlight', 'core', 'dist')),
            ],
        };

        const isDarkTheme = window.activeColorTheme.kind === 3 || 2; // Dark theme

        const codiconsUri = this._webView.asWebviewUri(
            Uri.joinPath(this._extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css'),
        );
        const syntaxStylesUri = this._webView.asWebviewUri(
            Uri.joinPath(
                this._extensionUri,
                'node_modules',
                '@speed-highlight',
                'core',
                'dist',
                'themes',
                isDarkTheme ? 'dark.css' : 'default.css',
            ),
        );

        this._webView.html = getHtmlForView(
            this._extensionPath,
            this._webView.asWebviewUri(this._extensionUri),
            this._webView.cspSource,
            this.viewType,
            codiconsUri,
            syntaxStylesUri,
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

        this.waitFor(() => this.executeHealthcheck(), 10000, 500).then(async (result) => {
            if (result) {
                await this.executeReplay();
            } else {
                await webviewView.webview.postMessage({
                    type: 'errorMessage',
                    message: {
                        text: `Error: Unable to initialize RovoDev at "${this._rovoDevApiUrl}". Service wasn't ready within 10000ms`,
                        author: 'RovoDev',
                        timestamp: Date.now(),
                    },
                });
            }

            // sets this flag regardless are we are not going to retry the replay anymore
            this._replayDone = true;

            // send this message regardless, so the UI can unblock the send button
            await webviewView.webview.postMessage({
                type: 'initialized',
            });
        });
    }

    private initializeApiUrl(): boolean {
        const rovoDevPort = this.getWorkspacePort();
        if (!rovoDevPort) {
            return false;
        } else {
            this._rovoDevApiUrl = `http://localhost:${rovoDevPort}`;
            return true;
        }
    }

    private getWorkspacePort(): number | undefined {
        const workspaceFolders = workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return undefined;
        }

        const globalPort = process.env[rovodevInfo.envVars.port];
        if (globalPort) {
            return parseInt(globalPort);
        }

        const wsPath = workspaceFolders[0].uri.fsPath;
        const mapping = this._globalState.get<{ [key: string]: number }>(rovodevInfo.mappingKey);
        if (mapping && mapping[wsPath]) {
            return mapping[wsPath];
        }

        return undefined;
    }

    private fetchApi(input: string, init?: RequestInit): Promise<Response> {
        if (!this._rovoDevApiUrl && !this.initializeApiUrl()) {
            throw new Error('Unable to initialize the RovoDev service URI');
        }

        return fetch(this._rovoDevApiUrl + input, init);
    }

    private async processPromptMessage(message: string) {
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

        const fetchOp = this.fetchApi('/v2/chat', {
            method: 'POST',
            headers: {
                accept: 'text/event-stream',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
            }),
        });

        await this.processResponse(fetchOp);
    }

    private async processResponse(fetchOp: Promise<Response>) {
        const webview = this._webView!;

        try {
            const response = await fetchOp;
            if (!response.body) {
                throw new Error('No response body');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            const parser = new RovoDevResponseParser();
            parser.onNewMessage((msg) => this.processMessage(msg));

            let messagesSent = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                const data = decoder.decode(value, { stream: true });
                messagesSent += parser.parse(data);
            }

            messagesSent += parser.flush();

            if (messagesSent) {
                // Send final complete message when stream ends
                await webview.postMessage({
                    type: 'completeMessage',
                });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            await webview.postMessage({
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
                    type: 'toolReturn',
                    dataObject: response,
                });

            case 'user-prompt':
                if (!this._replayDone) {
                    return webView.postMessage({
                        type: 'userChatMessage',
                        message: {
                            text: response.content,
                            author: 'User',
                            timestamp: response.timestamp,
                        },
                    });
                }
                return Promise.resolve(false);

            default:
                return Promise.resolve(false);
        }
    }

    async executeReset(): Promise<void> {
        if (!this._webView) {
            console.error('Webview is not initialized.');
            return;
        }

        try {
            await this.fetchApi('/v2/reset', {
                method: 'POST',
            });

            await this._webView.postMessage({
                type: 'newSession',
            });
        } catch (error) {
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

    async executeReplay(): Promise<void> {
        const fetchOp = this.fetchApi('/v2/replay', {
            method: 'POST',
            headers: {
                accept: 'text/event-stream',
                'Content-Type': 'application/json',
            },
        });

        await this.processResponse(fetchOp);
    }

    async executeHealthcheck(): Promise<boolean> {
        if (!this._webView) {
            return false;
        }

        try {
            await this.fetchApi('/v2/healthcheck');
            return true;
        } catch {
            return false;
        }
    }

    async invokePrompt(prompt: string): Promise<void> {
        // focus on the specific vscode view
        commands.executeCommand('atlascode.views.rovoDev.webView.focus');

        // Wait for the webview to initialize, up to 5 seconds
        const initialized = await this.waitFor(() => !!this._webView, 5000, 50);
        if (!initialized) {
            console.error('Webview is not initialized after waiting.');
            return;
        }

        // Actually invoke the rovodev service, feed responses to the webview as normal
        await this.processPromptMessage(prompt);
    }

    private async waitFor(
        check: () => Promise<boolean> | boolean,
        timeoutMs: number,
        interval: number,
    ): Promise<boolean> {
        let result = await check();
        while (!result && timeoutMs) {
            await setTimeout(interval);
            timeoutMs -= interval;
            result = await check();
        }
        return result;
    }

    private _dispose() {
        this._disposables.forEach((d) => d.dispose());
        this._disposables = [];
        if (this._webView) {
            this._webView = undefined;
        }
    }
}
