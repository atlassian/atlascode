import { ChildProcess, spawn } from 'child_process';
import { access, constants } from 'fs';
import fs from 'fs';
import net from 'net';
import packageJson from 'package.json';
import path from 'path';
import { downloadAndUnzip } from 'src/util/downloadFile';
import { getFsPromise } from 'src/util/fsPromises';
import { Disposable, ExtensionContext, Terminal, Uri, window, workspace } from 'vscode';

import { isBasicAuthInfo, ProductJira } from '../atlclients/authInfo';
import { rovodevInfo } from '../constants';
import { Container } from '../container';
import { RovoDevWebviewProvider } from './rovoDevWebviewProvider';

export const MIN_SUPPORTED_ROVODEV_VERSION = packageJson.rovoDev.version;

function GetRovoDevURIs(context: ExtensionContext) {
    const extensionPath = context.storageUri!.fsPath;
    const rovoDevBaseDir = path.join(extensionPath, 'atlascode-rovodev-bin');
    const rovoDevVersionDir = path.join(rovoDevBaseDir, MIN_SUPPORTED_ROVODEV_VERSION);
    const rovoDevBinPath = path.join(rovoDevVersionDir, 'atlassian_cli_rovodev');
    const rovoDevIconUri = Uri.file(context.asAbsolutePath(path.join('resources', 'rovodev-icon.svg')));

    const platform = process.platform;
    const arch = process.arch;
    let rovoDevZipUrl = undefined;

    if (platform === 'win32' || platform === 'linux' || platform === 'darwin') {
        const platformDir = platform === 'win32' ? 'windows' : platform;
        if (arch === 'x64' || arch === 'arm64') {
            const archDir = arch === 'x64' ? 'amd64' : arch;
            const version = MIN_SUPPORTED_ROVODEV_VERSION;
            rovoDevZipUrl = Uri.parse(
                `https://acli.atlassian.com/plugins/rovodev/${platformDir}/${archDir}/${version}/rovodev.zip`,
            );
        }
    }

    return {
        RovoDevBaseDir: rovoDevBaseDir,
        RovoDevVersionDir: rovoDevVersionDir,
        RovoDevBinPath: rovoDevBinPath,
        RovoDevZipUrl: rovoDevZipUrl,
        RovoDevIconUri: rovoDevIconUri,
    };
}

type RovoDevURIs = ReturnType<typeof GetRovoDevURIs>;

function isPortAvailable(port: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        const server = net.createServer();

        server.once('error', (err: Error & { code: string }) => {
            if (err.code === 'EADDRINUSE') {
                resolve(false);
            } else {
                // Other errors, potentially indicating a problem with the port or system
                resolve(false);
            }
        });

        server.once('listening', () => {
            server.close(() => {
                resolve(true);
            });
        });

        server.listen(port, '127.0.0.1');
    });
}

/**
 * Placeholder implementation for Rovo Dev CLI credential storage
 */
async function getCloudCredentials(): Promise<{ username: string; key: string; host: string } | undefined> {
    const sites = Container.siteManager.getSitesAvailable(ProductJira);

    const promises = sites.map(async (site) => {
        if (!site.isCloud) {
            return undefined;
        }

        if (!site.host.endsWith('.atlassian.net')) {
            return undefined;
        }

        const authInfo = await Container.credentialManager.getAuthInfo(site);
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

export class RovoDevProcessManager {
    private static disposables: Disposable[] = [];

    // Reference to the RovoDev webview provider for sending errors to chat
    // This is ensured to be initialized before the entrypoint `initializeRovoDevProcessManager` is invoked.
    static rovoDevWebviewProvider: RovoDevWebviewProvider;
    public static setRovoDevWebviewProvider(provider: RovoDevWebviewProvider) {
        this.rovoDevWebviewProvider = provider;
    }

    private static rovoDevInstance: RovoDevInstance | undefined;
    private static stopRovoDevInstance() {
        if (this.rovoDevInstance) {
            this.rovoDevInstance.stop();
            this.rovoDevInstance = undefined;
        }
    }

    private static async downloadBinaryThenInitialize(context: ExtensionContext, rovoDevURIs: RovoDevURIs) {
        const baseDir = rovoDevURIs.RovoDevBaseDir;
        const versionDir = rovoDevURIs.RovoDevVersionDir;
        const zipUrl = rovoDevURIs.RovoDevZipUrl;

        if (!zipUrl) {
            this.rovoDevWebviewProvider.signalRovoDevDisabled();
            this.rovoDevWebviewProvider.sendErrorToChat(
                `Rovo Dev is not supported for the following platform/architecture: ${process.platform}/${process.arch}`,
            );
            return;
        }

        try {
            if (fs.existsSync(baseDir)) {
                await getFsPromise((callback) => fs.rm(baseDir, { recursive: true, force: true }, callback));
            }

            const onProgressChange = (downloadedBytes: number, totalBytes: number | undefined) => {
                if (totalBytes) {
                    this.rovoDevWebviewProvider.signalDownloadProgress(downloadedBytes, totalBytes);
                }
            };

            await downloadAndUnzip(zipUrl, baseDir, versionDir, true, onProgressChange);

            await getFsPromise((callback) => fs.mkdir(versionDir, { recursive: true }, callback));
        } catch (error) {
            const message = `Unable to update Rovo Dev:\n${error.message}\n\nTo try again, please close VS Code and reopen it.`;
            this.rovoDevWebviewProvider.signalRovoDevDisabled();
            this.rovoDevWebviewProvider.sendErrorToChat(message);
            throw error;
        }

        this.rovoDevWebviewProvider.signalBinaryDownloadEnded();

        await this.initializeRovoDevProcessManager(context);
    }

    public static async initializeRovoDevProcessManager(context: ExtensionContext) {
        const rovoDevURIs = GetRovoDevURIs(context);

        this.rovoDevInstance?.dispose();
        this.rovoDevInstance = undefined;

        if (!fs.existsSync(rovoDevURIs.RovoDevBinPath)) {
            this.rovoDevWebviewProvider.signalBinaryDownloadStarted();
            await this.downloadBinaryThenInitialize(context, rovoDevURIs);
            return;
        }

        // Listen for workspace folder changes
        const listener = workspace.onDidChangeWorkspaceFolders((event) => {
            if (!this.rovoDevInstance && event.added.length > 0) {
                this.startRovoDev(rovoDevURIs);
            } else if (event.removed.length === workspace.workspaceFolders?.length) {
                this.stopRovoDevInstance();
            }
        });

        context.subscriptions.push(listener);
        this.disposables.push(listener);

        await this.startRovoDev(rovoDevURIs);
    }

    public static deactivateRovoDevProcessManager() {
        for (const obj of this.disposables) {
            obj.dispose();
        }
        this.disposables = [];

        // On deactivate, stop all workspace processes
        this.stopRovoDevInstance();
    }

    private static async getOrAssignPortForWorkspace(): Promise<number> {
        const portStart = rovodevInfo.portRange.start;
        const portEnd = rovodevInfo.portRange.end;

        for (let port = portStart; port <= portEnd; ++port) {
            if (await isPortAvailable(port)) {
                return port;
            }
        }

        throw new Error('unable to find an available port.');
    }

    private static async startRovoDev(rovoDevURIs: RovoDevURIs) {
        // skip there is no workspace folder open
        if (!workspace.workspaceFolders) {
            return;
        }

        const folder = workspace.workspaceFolders[0];

        try {
            const port = await this.getOrAssignPortForWorkspace();

            if (Container.isDebugging) {
                this.rovoDevInstance = new RovoDevTerminalInstance(
                    this.rovoDevWebviewProvider,
                    folder.uri.fsPath,
                    port,
                    rovoDevURIs.RovoDevBinPath,
                    rovoDevURIs.RovoDevIconUri,
                );
            } else {
                this.rovoDevInstance = new RovoDevProcessInstance(
                    this.rovoDevWebviewProvider,
                    folder.uri.fsPath,
                    port,
                    rovoDevURIs.RovoDevBinPath,
                );
            }
        } catch (error) {
            this.rovoDevWebviewProvider.signalRovoDevDisabled();
            this.rovoDevWebviewProvider.sendErrorToChat(`Unable to start Rovo Dev:\n${error.message}`);
        }
    }

    public static showTerminal() {
        this.rovoDevInstance?.showTerminal();
    }
}

interface RovoDevInstance extends Disposable {
    stop(): void;
    showTerminal(): void;
}

class RovoDevProcessInstance extends Disposable implements RovoDevInstance {
    private rovoDevProcess: ChildProcess | undefined;

    public get isRunning() {
        return !!this.rovoDevProcess;
    }

    constructor(
        rovoDevWebviewProvider: RovoDevWebviewProvider,
        workspacePath: string,
        port: number,
        rovoDevBinPath: string,
    ) {
        super(() => this.stop());

        this.stop();

        access(rovoDevBinPath, constants.X_OK, (err) => {
            if (err) {
                throw new Error(`executable not found.`);
            }

            getCloudCredentials().then((creds) => {
                if (!creds) {
                    rovoDevWebviewProvider.signalRovoDevDisabled();
                    rovoDevWebviewProvider.signalProcessTerminated(
                        'Please authenticate with an API token to enable Rovo Dev',
                    );
                    return;
                }

                const { username, key } = creds;

                const env: NodeJS.ProcessEnv = {
                    USER: process.env.USER,
                    USER_EMAIL: username,
                    ...(key ? { USER_API_TOKEN: key } : {}),
                };
                let stderrData = '';

                this.rovoDevProcess = spawn(
                    rovoDevBinPath,
                    [`serve`, `${port}`, `--application-id`, `com.atlassian.vscode`],
                    {
                        cwd: workspacePath,
                        stdio: ['ignore', 'pipe', 'pipe'],
                        detached: true,
                        env,
                    },
                )
                    .on('spawn', () => rovoDevWebviewProvider.signalProcessStarted(port))
                    .on('exit', (code) => {
                        this.rovoDevProcess = undefined;

                        if (code !== 0) {
                            let error: string;
                            if (stderrData.includes('auth token')) {
                                error = `please login by providing an API Token. You can do this via Atlassian: Open Settings -> Authentication`;
                            } else {
                                // default error message
                                error = `process exited with code ${code}, see the log for details.`;
                            }

                            rovoDevWebviewProvider.signalRovoDevDisabled();
                            rovoDevWebviewProvider.signalProcessTerminated(error);
                        }
                    });

                if (this.rovoDevProcess.stderr) {
                    this.rovoDevProcess.stderr.on('data', (data) => {
                        stderrData += data.toString();
                    });
                }
            });
        });
    }

    public stop() {
        if (this.rovoDevProcess) {
            this.rovoDevProcess.kill();
            this.rovoDevProcess = undefined;
        }
    }

    public showTerminal() {
        throw new Error('Method not implemented: showTerminal');
    }
}

class RovoDevTerminalInstance extends Disposable implements RovoDevInstance {
    private rovoDevTerminal: Terminal | undefined;

    constructor(
        rovoDevWebviewProvider: RovoDevWebviewProvider,
        workspacePath: string,
        port: number,
        rovoDevBinPath: string,
        rovoDevIconUri: Uri,
    ) {
        super(() => this.stop());

        access(rovoDevBinPath, constants.X_OK, (err) => {
            if (err) {
                throw new Error(`executable not found.`);
            }

            getCloudCredentials().then((creds) => {
                if (!creds) {
                    rovoDevWebviewProvider.signalRovoDevDisabled();
                    rovoDevWebviewProvider.signalProcessTerminated(
                        'Please authenticate with an API token to enable Rovo Dev',
                    );
                    return;
                }

                const { username, key } = creds || {};

                this.rovoDevTerminal = window.createTerminal({
                    name: 'Rovo Dev',
                    shellPath: rovoDevBinPath,
                    shellArgs: [`serve`, `${port}`, `--application-id`, `com.atlassian.vscode`],
                    cwd: workspacePath,
                    hideFromUser: true,
                    isTransient: true,
                    iconPath: rovoDevIconUri,
                    env: {
                        USER: process.env.USER,
                        USER_EMAIL: username,
                        ...(key ? { USER_API_TOKEN: key } : {}),
                    },
                });

                window.onDidCloseTerminal((event) => {
                    if (event === this.rovoDevTerminal) {
                        const code = event.exitStatus?.code;
                        if (code) {
                            rovoDevWebviewProvider.signalRovoDevDisabled();
                            rovoDevWebviewProvider.signalProcessTerminated(
                                `Rovo Dev exited with code ${code}, see the log for details.`,
                            );
                        } else {
                            rovoDevWebviewProvider.signalProcessTerminated();
                        }
                    }
                });

                rovoDevWebviewProvider.signalProcessStarted(port, true);
            });
        });
    }

    public stop() {
        if (this.rovoDevTerminal) {
            const terminal = this.rovoDevTerminal;
            this.rovoDevTerminal = undefined;
            // sends a CTRL+C to the terminal
            terminal.sendText('\u0003', true);
        }
    }

    public showTerminal() {
        this.rovoDevTerminal?.show();
    }
}
