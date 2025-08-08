import { ChildProcess, spawn } from 'child_process';
import { access, constants } from 'fs';
import { isBasicAuthInfo, ProductJira } from 'src/atlclients/authInfo';
import { Container } from 'src/container';
import { Resources } from 'src/resources';
import { Disposable, ExtensionContext, window, workspace } from 'vscode';

import { rovodevInfo } from '../constants';

export class RovoDevProcessManager {
    // In-memory process map (not persisted, but safe for per-window usage)
    private workspaceProcessMap: { [workspacePath: string]: ChildProcess } = {};
    private disposables: Disposable[] = [];
    private static instance: RovoDevProcessManager;

    // Reference to the RovoDev webview provider for sending errors to chat
    private rovoDevWebviewProvider: any = null;
    public setRovoDevWebviewProvider(provider: any) {
        this.rovoDevWebviewProvider = provider;
    }

    private constructor() {
        // Private constructor to enforce singleton pattern
    }
    public static getInstance(): RovoDevProcessManager {
        if (!RovoDevProcessManager.instance) {
            RovoDevProcessManager.instance = new RovoDevProcessManager();
        }
        return RovoDevProcessManager.instance;
    }

    public initializeRovoDevProcessManager(context: ExtensionContext) {
        // Listen for workspace folder changes
        const listener = workspace.onDidChangeWorkspaceFolders((event) => {
            if (event.added.length > 0) {
                this.showWorkspaceLoadedMessageAndStartProcess(context);
            }
            if (event.removed.length > 0) {
                this.showWorkspaceClosedMessageAndStopProcess(event.removed);
            }
        });

        context.subscriptions.push(listener);
        this.disposables.push(listener);

        this.showWorkspaceLoadedMessageAndStartProcess(context);
    }

    public deactivateRovoDevProcessManager() {
        for (const obj of this.disposables) {
            obj.dispose();
        }
        this.disposables = [];

        // On deactivate, stop all workspace processes
        if (workspace.workspaceFolders) {
            for (const folder of workspace.workspaceFolders) {
                this.stopWorkspaceProcess(folder.uri.fsPath);
            }
        }

        this.showWorkspaceClosedMessage();
    }

    // Helper to get a unique port for a workspace
    private getOrAssignPortForWorkspace(context: ExtensionContext, workspacePath: string): number {
        const mapping = context.globalState.get<{ [key: string]: number }>(rovodevInfo.mappingKey) || {};
        if (mapping[workspacePath]) {
            return mapping[workspacePath];
        }
        // Find an unused port
        const usedPorts = new Set(Object.values(mapping));
        let port = rovodevInfo.portRange.start;
        while (usedPorts.has(port) && port <= rovodevInfo.portRange.end) {
            port++;
        }
        mapping[workspacePath] = port;
        context.globalState.update(rovodevInfo.mappingKey, mapping);
        return port;
    }

    // Helper to stop a process by terminal name
    private stopWorkspaceProcess(workspacePath: string) {
        const proc = this.workspaceProcessMap[workspacePath];
        if (proc) {
            proc.kill();
            delete this.workspaceProcessMap[workspacePath];
        }
    }

    // Helper to start the background process
    private startWorkspaceProcess(context: ExtensionContext, workspacePath: string, port: number) {
        this.stopWorkspaceProcess(workspacePath);

        const rovoDevPath =
            workspace.getConfiguration('atlascode.rovodev').get<string>('executablePath') || Resources.rovoDevPath;

        if (!rovoDevPath) {
            window.showWarningMessage('Rovo Dev: Executable path is not set, please configure it in settings.');
            return;
        }

        access(rovoDevPath, constants.X_OK, (err) => {
            if (err) {
                const errorMsg = `Rovo Dev: Executable not found at path: ${rovoDevPath}`;
                if (this.rovoDevWebviewProvider) {
                    this.rovoDevWebviewProvider.sendErrorToChat(errorMsg);
                } else {
                    window.showErrorMessage(errorMsg);
                }
                return;
            }
            this.getCloudCredentials().then((creds) => {
                const defaultUsername = 'cooluser@atlassian.com';
                const { username, key, host } = creds || {};

                if (host) {
                    console.log(`Rovo Dev: using cloud credentials for ${username} on ${host}`);
                } else {
                    console.log('Rovo Dev: No cloud credentials found. Using default authentication.');
                }

                const env: NodeJS.ProcessEnv = {
                    USER: process.env.USER,
                    USER_EMAIL: username || defaultUsername,
                    ...(key ? { USER_API_TOKEN: key } : {}),
                };
                let stderrData = '';

                const proc = spawn(rovoDevPath, [`serve`, `${port}`], {
                    cwd: workspacePath,
                    stdio: ['ignore', 'pipe', 'pipe'],
                    detached: true,
                    env,
                }).on('exit', (code, signal) => {
                    if (code !== 0) {
                        let errorMsg: string;
                        if (stderrData.includes('auth token')) {
                            errorMsg = `Rovo Dev: Please login by providing an API Token. You can do this via Atlassian: Open Settings -> Authentication -> Other Options`;
                        } else {
                            // default error message
                            errorMsg = `Rovo Dev: Process exited with code ${code}, see the log for details.`;
                        }

                        if (this.rovoDevWebviewProvider) {
                            this.rovoDevWebviewProvider.sendErrorToChat(errorMsg);
                        } else {
                            window.showErrorMessage(errorMsg);
                        }

                        console.error(
                            `Rovo Dev: Process exited with code ${code} and signal ${signal}, stderr: ${stderrData}`,
                        );
                    }
                    delete this.workspaceProcessMap[workspacePath];
                });

                if (proc.stderr) {
                    proc.stderr.on('data', (data) => {
                        stderrData += data.toString();
                    });
                }

                this.workspaceProcessMap[workspacePath] = proc;
            });
        });
    }

    private showWorkspaceLoadedMessageAndStartProcess(context: ExtensionContext) {
        const folders = workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            return;
        }

        const globalPort = process.env[rovodevInfo.envVars.port];
        if (globalPort) {
            if (!process.env.ROVODEV_BBY) {
                console.log(`Rovo Dev: Expecting Rovo Dev on port ${globalPort}. No new process started.`);
            }
            return;
        }

        for (const folder of folders) {
            const port = this.getOrAssignPortForWorkspace(context, folder.uri.fsPath);
            console.log(`Rovo Dev: Workspace loaded: ${folder.name} (port ${port})`);
            this.startWorkspaceProcess(context, folder.uri.fsPath, port);
        }
    }

    private showWorkspaceClosedMessageAndStopProcess(
        removedFolders: readonly { uri: { fsPath: string }; name: string }[],
    ) {
        for (const folder of removedFolders) {
            this.stopWorkspaceProcess(folder.uri.fsPath);
            console.log(`Rovo Dev: Workspace closed: ${folder.name}`);
        }
    }

    private showWorkspaceClosedMessage() {
        console.log('Rovo Dev: Workspace closed or extension deactivated.');
    }

    /**
     * Placeholder implementation for Rovo Dev CLI credential storage
     */
    private async getCloudCredentials(): Promise<{ username: string; key: string; host: string } | undefined> {
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
