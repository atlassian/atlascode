import { ChildProcess, spawn } from 'child_process';
import { access, constants } from 'fs';
import fs from 'fs';
import net from 'net';
import packageJson from 'package.json';
import path from 'path';
import { Logger } from 'src/logger';
import { downloadAndUnzip } from 'src/util/downloadFile';
import { getFsPromise } from 'src/util/fsPromises';
import { Disposable, ExtensionContext, Terminal, Uri, window, workspace } from 'vscode';

import { isBasicAuthInfo, ProductJira } from '../atlclients/authInfo';
import { rovodevInfo } from '../constants';
import { Container } from '../container';
import { RovoDevWebviewProvider } from './rovoDevWebviewProvider';

const MIN_SUPPORTED_ROVODEV_VERSION = packageJson.rovoDev.version;

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
    try {
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
    } catch (error) {
        Logger.error('RovoDev', error, 'Error fetching cloud credentials for Rovo Dev');
        return undefined;
    }
}

type CloudCredentials = NonNullable<Awaited<ReturnType<typeof getCloudCredentials>>>;

async function getOrAssignPortForWorkspace(): Promise<number> {
    const portStart = rovodevInfo.portRange.start;
    const portEnd = rovodevInfo.portRange.end;

    for (let port = portStart; port <= portEnd; ++port) {
        if (await isPortAvailable(port)) {
            return port;
        }
    }

    throw new Error('unable to find an available port.');
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
            await this.rovoDevWebviewProvider.signalRovoDevDisabled();
            await this.rovoDevWebviewProvider.sendErrorToChat(
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
            await this.rovoDevWebviewProvider.signalRovoDevDisabled();
            await this.rovoDevWebviewProvider.sendErrorToChat(message);
            throw error;
        }

        this.rovoDevWebviewProvider.signalBinaryDownloadEnded();
    }

    public static async initializeRovoDevProcessManager(context: ExtensionContext) {
        const rovoDevURIs = GetRovoDevURIs(context);

        if (this.rovoDevInstance) {
            this.sendErrorToChat(new Error('Rovo Dev is already initialized'));
            return;
        }

        const credentials = await getCloudCredentials();
        if (!credentials) {
            this.sendErrorToChat(new Error('Please authenticate with an API token to enable Rovo Dev'));
            return;
        }

        try {
            if (!fs.existsSync(rovoDevURIs.RovoDevBinPath)) {
                this.rovoDevWebviewProvider.signalBinaryDownloadStarted();
                await this.downloadBinaryThenInitialize(context, rovoDevURIs);
            }

            await this.startRovoDev(credentials, rovoDevURIs);
        } catch (error) {
            this.sendErrorToChat(error);
        }
    }

    public static async refreshRovoDevCredentials(context: ExtensionContext) {
        if (this.rovoDevInstance) {
            this.rovoDevInstance.refreshCredentials();
        } else {
            this.initializeRovoDevProcessManager(context);
        }
    }

    public static deactivateRovoDevProcessManager() {
        for (const obj of this.disposables) {
            obj.dispose();
        }
        this.disposables = [];

        // On deactivate, stop all workspace processes
        this.stopRovoDevInstance();
    }

    private static async startRovoDev(credentials: CloudCredentials, rovoDevURIs: RovoDevURIs) {
        // skip there is no workspace folder open
        if (!workspace.workspaceFolders) {
            return;
        }

        const folder = workspace.workspaceFolders[0];

        if (Container.isDebugging) {
            this.rovoDevInstance = new RovoDevTerminalInstance(
                this.rovoDevWebviewProvider,
                credentials,
                folder.uri.fsPath,
                rovoDevURIs.RovoDevBinPath,
                rovoDevURIs.RovoDevIconUri,
            );
        } else {
            this.rovoDevInstance = new RovoDevProcessInstance(
                this.rovoDevWebviewProvider,
                credentials,
                folder.uri.fsPath,
                rovoDevURIs.RovoDevBinPath,
            );
        }

        await this.rovoDevInstance.start();
    }

    public static showTerminal() {
        this.rovoDevInstance?.showTerminal();
    }

    private static async sendErrorToChat(error: Error) {
        await this.rovoDevWebviewProvider.signalRovoDevDisabled();
        await this.rovoDevWebviewProvider.sendErrorToChat(`Unable to start Rovo Dev:\n${error.message}`);
    }
}

abstract class RovoDevInstance extends Disposable {
    constructor(protected credentials: CloudCredentials | undefined) {
        super(() => this.stop());
    }

    public abstract start(): Promise<void>;
    public abstract stop(): void;
    public abstract showTerminal(): void;
    protected abstract restart(): void;

    public async refreshCredentials(): Promise<void> {
        const credentials = await getCloudCredentials();
        if (!this.areEquals(credentials, this.credentials)) {
            this.credentials = credentials;
            this.restart();
        }
    }

    private areEquals(cred1?: CloudCredentials, cred2?: CloudCredentials) {
        if (cred1 === cred2) {
            return true;
        }

        if (!cred1 || !cred2) {
            return false;
        }

        return cred1.host === cred2.host && cred1.key === cred2.key && cred1.username === cred2.username;
    }
}

class RovoDevProcessInstance extends RovoDevInstance {
    private rovoDevProcess: ChildProcess | undefined;
    private restarting: boolean = false;

    public get isRunning() {
        return !!this.rovoDevProcess;
    }

    constructor(
        private rovoDevWebviewProvider: RovoDevWebviewProvider,
        credentials: CloudCredentials | undefined,
        private workspacePath: string,
        private rovoDevBinPath: string,
    ) {
        super(credentials);
    }

    public async start(): Promise<void> {
        const credentials = this.credentials;
        const port = await getOrAssignPortForWorkspace();

        return new Promise<void>((resolve, reject) => {
            access(this.rovoDevBinPath, constants.X_OK, (err) => {
                if (err) {
                    reject(new Error(`executable not found.`));
                    return;
                }
                if (!credentials) {
                    reject(new Error('Please authenticate with an API token to enable Rovo Dev'));
                    return;
                }

                const { username, key } = credentials;

                const env: NodeJS.ProcessEnv = {
                    USER: process.env.USER,
                    USER_EMAIL: username,
                    ...(key ? { USER_API_TOKEN: key } : {}),
                };
                let stderrData = '';

                this.rovoDevProcess = spawn(
                    this.rovoDevBinPath,
                    [`serve`, `${port}`, `--application-id`, `com.atlassian.vscode`],
                    {
                        cwd: this.workspacePath,
                        stdio: ['ignore', 'pipe', 'pipe'],
                        detached: true,
                        env,
                    },
                )
                    .on('spawn', () => this.rovoDevWebviewProvider.signalProcessStarted(port))
                    .on('exit', (code) => {
                        this.hasStopped();

                        if (this.restarting) {
                            this.restarting = false;
                            this.start().catch(async (error) => {
                                await this.rovoDevWebviewProvider.signalRovoDevDisabled();
                                await this.rovoDevWebviewProvider.sendErrorToChat(error.message);
                            });
                        } else if (code !== 0) {
                            let error: string;
                            if (stderrData.includes('auth token')) {
                                error = `please login by providing an API Token. You can do this via Atlassian: Open Settings -> Authentication`;
                            } else {
                                // default error message
                                error = `process exited with code ${code}, see the log for details.`;
                            }

                            this.rovoDevWebviewProvider.signalProcessTerminated(error);
                        }
                    });

                if (this.rovoDevProcess.stderr) {
                    this.rovoDevProcess.stderr.on('data', (data) => {
                        stderrData += data.toString();
                    });
                }

                resolve();
            });
        });
    }

    public stop() {
        if (this.rovoDevProcess) {
            this.rovoDevProcess.kill();
            this.hasStopped();
        }
    }

    private hasStopped() {
        this.rovoDevProcess = undefined;
    }

    protected override restart(): void {
        this.restarting = true;
        this.stop();
    }

    public showTerminal() {
        throw new Error('Method not implemented: showTerminal');
    }
}

class RovoDevTerminalInstance extends RovoDevInstance {
    private rovoDevTerminal: Terminal | undefined;
    private disposables: Disposable[] = [];

    constructor(
        private rovoDevWebviewProvider: RovoDevWebviewProvider,
        credentials: CloudCredentials | undefined,
        private workspacePath: string,
        private rovoDevBinPath: string,
        private rovoDevIconUri: Uri,
    ) {
        super(credentials);
    }

    public async start(): Promise<void> {
        const credentials = this.credentials;
        const port = await getOrAssignPortForWorkspace();

        return new Promise<void>((resolve, reject) => {
            if (!credentials) {
                reject(new Error('Please authenticate with an API token to enable Rovo Dev'));
                return;
            }

            access(this.rovoDevBinPath, constants.X_OK, (err) => {
                if (err) {
                    reject(new Error(`executable not found.`));
                    return;
                }

                const { username, key } = credentials;

                this.rovoDevTerminal = window.createTerminal({
                    name: 'Rovo Dev',
                    shellPath: this.rovoDevBinPath,
                    shellArgs: [`serve`, `${port}`, `--application-id`, `com.atlassian.vscode`],
                    cwd: this.workspacePath,
                    hideFromUser: true,
                    isTransient: true,
                    iconPath: this.rovoDevIconUri,
                    env: {
                        USER: process.env.USER,
                        USER_EMAIL: username,
                        ...(key ? { USER_API_TOKEN: key } : {}),
                    },
                });

                const onDidCloseTerminal = window.onDidCloseTerminal((event) => {
                    if (event === this.rovoDevTerminal) {
                        this.hasStopped();

                        const code = event.exitStatus?.code;
                        if (code) {
                            this.rovoDevWebviewProvider.signalProcessTerminated(
                                `Rovo Dev exited with code ${code}, see the log for details.`,
                            );
                        } else {
                            this.rovoDevWebviewProvider.signalProcessTerminated();
                        }
                    }
                });
                this.disposables.push(onDidCloseTerminal);

                this.rovoDevWebviewProvider.signalProcessStarted(port, true);
                resolve();
            });
        });
    }

    public stop() {
        if (this.rovoDevTerminal) {
            // sends a CTRL+C to the terminal
            this.rovoDevTerminal.sendText('\u0003', true);
            this.hasStopped();
        }
    }

    protected override restart(): void {
        this.stop();
        this.start().catch(async (error) => {
            await this.rovoDevWebviewProvider.signalRovoDevDisabled();
            await this.rovoDevWebviewProvider.sendErrorToChat(error.message);
        });
    }

    private hasStopped() {
        this.rovoDevTerminal?.dispose();
        this.rovoDevTerminal = undefined;
        this.disposables.forEach((x) => x.dispose());
        this.disposables = [];
    }

    public showTerminal() {
        this.rovoDevTerminal?.show();
    }
}
