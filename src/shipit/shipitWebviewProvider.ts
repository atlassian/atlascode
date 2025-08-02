import { exec } from 'child_process';
import * as path from 'path';
import { isBasicAuthInfo, ProductJira } from 'src/atlclients/authInfo';
import { Container } from 'src/container';
import { getHtmlForView } from 'src/webview/common/getHtmlForView';
import {
    CancellationToken,
    Disposable,
    Uri,
    WebviewView,
    WebviewViewProvider,
    WebviewViewResolveContext,
    window,
} from 'vscode';

import { GitWorktreeManager } from './gitWorktreeManager';
import { FromUIHandler, MessageFromUI, MessageToUI } from './protocol';

const pingQuery = `
query me {
  me {
    user{
      name
    }
  }
}
`;

export class ShipitWebviewProvider extends Disposable implements WebviewViewProvider {
    private _extensionPath: string;
    private _extensionUri: Uri;
    private _webView?: WebviewView['webview'];
    private readonly viewType = 'shipitWebview';
    private _worktreeManager: GitWorktreeManager;

    private handler: FromUIHandler = {
        isLifeOk: (message) => {
            console.log('Received isLifeOk message:', message);
            this.postMessage({
                type: 'isLifeOkResponse',
                status: 'not Daijoubu',
            });
        },
        pingAgg: async (message) => {
            const credentials = await this.getCloudCredentials();
            if (!credentials) {
                this.postMessage({
                    type: 'pingAggResponse',
                    status: 'error',
                    error: 'No cloud credentials found',
                });
                return;
            }

            const response = await fetch(`https://${credentials?.host}/gateway/api/graphql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Basic ${btoa(`${credentials.username}:${credentials.key}`)}`,
                },
                body: JSON.stringify({ query: pingQuery }),
            });

            if (response.ok) {
                const data = await response.json();
                this.postMessage({
                    type: 'pingAggResponse',
                    status: 'ok',
                    response: data,
                });
            } else {
                this.postMessage({
                    type: 'pingAggResponse',
                    status: 'error',
                    error: 'Failed to ping AGG',
                });
            }
        },
        runProcess: (message) => {
            console.log('Running process with echoText:', message.echoText);
            exec(`echo ${message.echoText}`, (error, stdout, stderr) => {
                window.showInformationMessage(`Process output: ${stdout}`);
                if (error) {
                    console.error('Error running process:', error);
                    window.showErrorMessage(`Error running process: ${stderr}`);
                }
            });
        },
        createWorktree: async (message) => {
            try {
                // Create worktree with default parameters (no custom name/directory)
                const worktreePath = await this._worktreeManager.createWorktree();

                this.postMessage({
                    type: 'worktreeCreated',
                    status: 'success',
                    path: worktreePath,
                });

                // If there's a message, send it to the newly created worktree's RovoDev server
                if (message.message && message.message.trim()) {
                    // Wait 1000ms then poll health check and send the message
                    setTimeout(async () => {
                        try {
                            const port = this._worktreeManager.getWorktreeRovoDevPort(worktreePath);

                            if (port) {
                                // Poll health check for up to 10 seconds before sending message
                                const serverReady = await this.waitFor(() => this.checkServerHealth(port), 10000, 500);

                                if (serverReady) {
                                    const chatUrl = `http://localhost:${port}/v2/chat`;
                                    const response = await fetch(chatUrl, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                            message: message.message?.trim(),
                                            enable_deep_plan: false,
                                        }),
                                    });

                                    if (!response.ok) {
                                        console.error(
                                            `Failed to send message to RovoDev server at port ${port}: ${response.status} ${response.statusText}`,
                                        );
                                    } else {
                                        console.log(`Message sent successfully to RovoDev server at port ${port}`);
                                    }
                                } else {
                                    console.error(`RovoDev server at port ${port} was not ready within 10 seconds`);
                                }
                            } else {
                                console.error(`No RovoDev server found for worktree: ${worktreePath}`);
                            }
                        } catch (error) {
                            console.error('Error sending message to RovoDev server:', error);
                        }
                    }, 1000);
                }
            } catch (error) {
                this.postMessage({
                    type: 'worktreeCreated',
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        },
        listWorktrees: async (message) => {
            try {
                const worktrees = await this._worktreeManager.listWorktrees();
                this.postMessage({
                    type: 'worktreesList',
                    status: 'success',
                    worktrees,
                });
            } catch (error) {
                this.postMessage({
                    type: 'worktreesList',
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        },
        removeWorktree: async (message) => {
            try {
                const success = await this._worktreeManager.removeWorktree(message.worktreePath);
                this.postMessage({
                    type: 'worktreeRemoved',
                    status: success ? 'success' : 'error',
                    error: success ? undefined : 'Failed to remove worktree',
                });
            } catch (error) {
                this.postMessage({
                    type: 'worktreeRemoved',
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        },
        connectToWorktreeRovoDev: async (message) => {
            try {
                const port = this._worktreeManager.getWorktreeRovoDevPort(message.worktreePath);
                if (port) {
                    // Store the selected server info globally
                    Container.context.globalState.update('selectedRovoDevPort', port);
                    Container.context.globalState.update('selectedRovoDevPath', message.worktreePath);

                    // Switch the main RovoDev chat to this server
                    Container.rovodevWebviewProvider.switchToServer(port);

                    this.postMessage({
                        type: 'worktreeRovoDevConnected',
                        status: 'success',
                        port,
                        worktreePath: message.worktreePath,
                    });
                } else {
                    this.postMessage({
                        type: 'worktreeRovoDevConnected',
                        status: 'error',
                        error: 'No RovoDev server found for this worktree',
                    });
                }
            } catch (error) {
                this.postMessage({
                    type: 'worktreeRovoDevConnected',
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        },
        getWorktreeRovoDevServers: async (message) => {
            try {
                const servers = this._worktreeManager.getAllRovoDevServers();
                this.postMessage({
                    type: 'worktreeRovoDevServers',
                    servers,
                });
            } catch {
                this.postMessage({
                    type: 'worktreeRovoDevServers',
                    servers: [],
                });
            }
        },
        getSelectedRovoDevServer: async (message) => {
            try {
                const selectedPort = Container.context.globalState.get<number>('selectedRovoDevPort');
                const selectedPath = Container.context.globalState.get<string>('selectedRovoDevPath');

                this.postMessage({
                    type: 'selectedRovoDevServer',
                    port: selectedPort,
                    path: selectedPath,
                });
            } catch {
                this.postMessage({
                    type: 'selectedRovoDevServer',
                    port: undefined,
                    path: undefined,
                });
            }
        },
    };

    constructor(extensionPath: string) {
        super(() => {});
        this._extensionPath = extensionPath;
        this._extensionUri = Uri.file(this._extensionPath);
        this._worktreeManager = new GitWorktreeManager();
        // Register the webview view provider
        this._register();
    }

    private _register() {
        window.registerWebviewViewProvider('atlascode.views.shipitWebviewView', this, {
            webviewOptions: { retainContextWhenHidden: true },
        });
    }

    public resolveWebviewView(
        webviewView: WebviewView,
        _context: WebviewViewResolveContext,
        _token: CancellationToken,
    ): void {
        this._webView = webviewView.webview;
        const webview = this._webView;
        webview.options = {
            enableScripts: true,
            localResourceRoots: [Uri.file(path.join(this._extensionPath, 'build'))],
        };
        webview.html = getHtmlForView(
            this._extensionPath,
            webview.asWebviewUri(this._extensionUri),
            webview.cspSource,
            this.viewType,
        );

        webview.onDidReceiveMessage((message: MessageFromUI) => {
            const handler = this.handler[message.type] as ((msg: any) => void) | undefined;
            if (handler) {
                handler(message);
            }
        });

        this.getCloudCredentials().then((credentials) => {
            if (credentials) {
                this.postMessage({
                    type: 'initialize',
                    status: 'unknown',
                    authenticationType: 'api token',
                });
            }
        });
    }

    postMessage = (message: MessageToUI) => {
        if (this._webView) {
            this._webView.postMessage(message);
        } else {
            console.warn('Webview is not initialized');
        }
    };

    private async waitFor(
        condition: () => Promise<boolean>,
        timeoutMs: number = 10000,
        intervalMs: number = 500,
    ): Promise<boolean> {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            try {
                if (await condition()) {
                    return true;
                }
            } catch {
                // Ignore errors during polling
            }
            await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
        return false;
    }

    private async checkServerHealth(port: number): Promise<boolean> {
        try {
            const response = await fetch(`http://localhost:${port}/healthcheck`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000), // 2 second timeout
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    // Literal copy-paste of our cloud credential lookup :)
    // Feel free to adjust as needed
    async getCloudCredentials(): Promise<{ username: string; key: string; host: string } | undefined> {
        const sites = Container.siteManager.getSitesAvailable(ProductJira);

        const promises = sites.map(async (site) => {
            if (!site.isCloud) {
                return undefined;
            }

            if (!site.host.endsWith('.atlassian.net')) {
                return undefined;
            }

            const authInfo = await Container.credentialManager.getAuthInfo(sites[0]);
            if (!isBasicAuthInfo(authInfo)) {
                return undefined;
            }

            return {
                username: authInfo.username,
                key: authInfo.password,
                host: site.host,
            };
        });

        const results = (await Promise.all(promises)).filter((result) => result !== undefined);
        return results.length > 0 ? results[0] : undefined;
    }
}
