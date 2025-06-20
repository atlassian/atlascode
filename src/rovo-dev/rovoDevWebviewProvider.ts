import path from 'path';
import { setTimeout } from 'timers/promises';
import {
    CancellationToken,
    ColorThemeKind,
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

import { rovodevInfo } from '../constants';
import { getHtmlForView } from '../webview/common/getHtmlForView';
import { RovoDevResponse, RovoDevResponseParser } from './responseParser';
import { RovoDevApiClient } from './rovoDevApiClient';

export class RovoDevWebviewProvider extends Disposable implements WebviewViewProvider {
    private readonly viewType = 'atlascodeRovoDev';
    private _webView?: Webview;
    private _rovoDevApiClient?: RovoDevApiClient;
    private _replayDone = false;

    private _disposables: Disposable[] = [];

    private _globalState: Memento;
    private _extensionPath: string;
    private _extensionUri: Uri;

    private get rovoDevApiClient() {
        if (!this._rovoDevApiClient) {
            const rovoDevPort = this.getWorkspacePort();
            if (rovoDevPort) {
                this._rovoDevApiClient = new RovoDevApiClient('localhost', rovoDevPort);
            }
        }

        return this._rovoDevApiClient;
    }

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

        const isDarkTheme =
            window.activeColorTheme.kind === ColorThemeKind.HighContrast ||
            window.activeColorTheme.kind === ColorThemeKind.Dark;

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
                    await this.executeChat(e.text);
                    break;

                case 'cancelResponse':
                    await this.executeCancel();
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
                const errorMsg = this._rovoDevApiClient
                    ? `Unable to initialize RovoDev at "${this._rovoDevApiClient.baseApiUrl}". Service wasn't ready within 10000ms`
                    : `Unable to initialize RovoDev's client within 10000ms`;

                this.processApiError(new Error(errorMsg));
            }

            // sets this flag regardless are we are not going to retry the replay anymore
            this._replayDone = true;

            // send this message regardless, so the UI can unblock the send button
            await webviewView.webview.postMessage({
                type: 'initialized',
            });
        });
    }

    private async processChatResponse(fetchOp: Promise<Response>, doNotParse?: boolean) {
        const webview = this._webView!;

        const response = await fetchOp;
        if (!response.body) {
            throw new Error('No response body');
        }

        if (doNotParse) {
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        const parser = new RovoDevResponseParser();
        parser.onNewMessage((msg) => this.processRovoDevResponse(msg));

        let messagesSent = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                messagesSent += parser.flush();
                break;
            }

            const data = decoder.decode(value, { stream: true });
            messagesSent += parser.parse(data);
        }

        if (messagesSent) {
            // Send final complete message when stream ends
            await webview.postMessage({
                type: 'completeMessage',
            });
        }
    }

    private processApiError(error: Error) {
        const webview = this._webView!;
        return webview.postMessage({
            type: 'errorMessage',
            message: {
                text: `Error: ${error.message}`,
                author: 'RovoDev',
                timestamp: Date.now(),
            },
        });
    }

    private processRovoDevResponse(response: RovoDevResponse): Thenable<boolean> {
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

    private async executeChat(message: string) {
        const webview = this._webView!;

        // First, send user message
        await webview.postMessage({
            type: 'userChatMessage',
            message: {
                text: message,
                author: 'User',
                timestamp: Date.now(),
            },
        });

        if (this.rovoDevApiClient) {
            try {
                await this.processChatResponse(this.rovoDevApiClient.chat(message));
            } catch (error) {
                await this.processApiError(error);
            }
        } else {
            await this.processApiError(new Error('RovoDev client not initialized'));
        }
    }

    async executeReset(): Promise<void> {
        if (this.rovoDevApiClient) {
            try {
                await this.rovoDevApiClient.reset();
            } catch (error) {
                this.processApiError(error);
            }
        } else {
            await this.processApiError(new Error('RovoDev client not initialized'));
        }
    }

    private async executeCancel(): Promise<void> {
        if (this.rovoDevApiClient) {
            try {
                await this.rovoDevApiClient.cancel();
            } catch (error) {
                this.processApiError(error);
            }
        } else {
            await this.processApiError(new Error('RovoDev client not initialized'));
        }
    }

    private async executeReplay(): Promise<void> {
        if (this.rovoDevApiClient) {
            try {
                await this.processChatResponse(this.rovoDevApiClient.replay());
            } catch (error) {
                await this.processApiError(error);
            }
        } else {
            await this.processApiError(new Error('RovoDev client not initialized'));
        }
    }

    private async executeHealthcheck(): Promise<boolean> {
        return (await this.rovoDevApiClient?.healthcheck()) || false;
    }

    async invokeRovoDevAskCommand(prompt: string): Promise<void> {
        // focus on the specific vscode view
        commands.executeCommand('atlascode.views.rovoDev.webView.focus');

        // Wait for the webview to initialize, up to 5 seconds
        const initialized = await this.waitFor(() => !!this._webView, 5000, 50);
        if (!initialized) {
            console.error('Webview is not initialized after waiting.');
            return;
        }

        // Actually invoke the rovodev service, feed responses to the webview as normal
        await this.executeChat(prompt);
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
