import { format } from 'date-fns';
import { access, constants } from 'fs';
import fs from 'fs';
import net from 'net';
import packageJson from 'package.json';
import path from 'path';
import { RovoDevLogger } from 'src/logger';
import { downloadAndUnzip } from 'src/util/downloadFile';
import { getFsPromise } from 'src/util/fsPromises';
import { Disposable, ExtensionContext, Terminal, Uri, window, workspace } from 'vscode';

import { isBasicAuthInfo, ProductJira } from '../atlclients/authInfo';
import { rovodevInfo } from '../constants';
import { Container } from '../container';
import { RovoDevApiClient } from './rovoDevApiClient';
import { RovoDevWebviewProvider } from './rovoDevWebviewProvider';

export const MIN_SUPPORTED_ROVODEV_VERSION = packageJson.rovoDev.version;

function GetRovoDevURIs(context: ExtensionContext) {
    const extensionPath = context.storageUri!.fsPath;
    const rovoDevBaseDir = path.join(extensionPath, 'atlascode-rovodev-bin');
    const rovoDevVersionDir = path.join(rovoDevBaseDir, MIN_SUPPORTED_ROVODEV_VERSION);
    const rovoDevBinPath = path.join(rovoDevVersionDir, 'atlassian_cli_rovodev');
    const rovoDevIconUri = Uri.file(context.asAbsolutePath(path.join('resources', 'rovodev-terminal-icon.svg')));

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

// don't rely on the RovoDevWebviewProvider for shutting Rovo Dev down, as it may
// already have set itself as Terminated and lost the reference to the API client
async function shutdownRovoDev(port: number) {
    if (port) {
        try {
            await new RovoDevApiClient('127.0.0.1', port).shutdown();
        } catch {}
    }
}

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

/**
 * Placeholder implementation for Rovo Dev CLI credential storage
 */
async function getCloudCredentials(): Promise<
    { username: string; key: string; host: string; isStaging: boolean } | undefined
> {
    try {
        const sites = Container.siteManager.getSitesAvailable(ProductJira);

        const promises = sites.map(async (site) => {
            // *.atlassian.net are PROD cloud sites
            // *.jira-dev.com are Staging cloud sites
            if (!site.host.endsWith('.atlassian.net') && !site.host.endsWith('.jira-dev.com')) {
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
                isStaging: site.host.endsWith('.jira-dev.com'),
            };
        });

        const results = (await Promise.all(promises)).filter((result) => result !== undefined);

        // give priority to staging sites
        return results.filter((x) => x.isStaging)[0] || results[0];
    } catch (error) {
        RovoDevLogger.error(error, 'Error fetching cloud credentials for Rovo Dev');
        return undefined;
    }
}

type CloudCredentials = NonNullable<Awaited<ReturnType<typeof getCloudCredentials>>>;

function areCredentialsEqual(cred1?: CloudCredentials, cred2?: CloudCredentials) {
    if (cred1 === cred2) {
        return true;
    }

    if (!cred1 || !cred2) {
        return false;
    }

    return cred1.host === cred2.host && cred1.key === cred2.key && cred1.username === cred2.username;
}

class ProcessManagerError extends Error {
    constructor(type: 'needAuth');
    constructor(type: 'other', message: string);
    constructor(
        public type: 'needAuth' | 'other',
        message?: string,
    ) {
        super(message || type);
    }
}

export abstract class RovoDevProcessManager {
    private static currentCredentials: CloudCredentials | undefined;

    /** This lock ensures this class is async-safe, preventing repeated invocations
     * of `initializeRovoDev` or `refreshRovoDevCredentials` to launch multiple processes
     */
    private static asyncLocked = false;

    // Reference to the RovoDev webview provider for sending errors to chat
    // This is ensured to be initialized before the entrypoint `initializeRovoDevProcessManager` is invoked.
    static rovoDevWebviewProvider: RovoDevWebviewProvider;
    public static setRovoDevWebviewProvider(provider: RovoDevWebviewProvider) {
        this.rovoDevWebviewProvider = provider;
    }

    private static rovoDevInstance: RovoDevTerminalInstance | undefined;
    private static stopRovoDevInstance() {
        this.rovoDevInstance?.dispose();
        this.rovoDevInstance = undefined;
    }

    private static failIfRovoDevInstanceIsRunning() {
        if (this.rovoDevInstance && !this.rovoDevInstance.stopped) {
            throw new Error('Rovo Dev instance is already running.');
        }

        // if the Rovo Dev instance exists but it's already stopped, we can unreference it
        this.rovoDevInstance = undefined;
    }

    private static async downloadBinaryThenInitialize(rovoDevURIs: RovoDevURIs) {
        const baseDir = rovoDevURIs.RovoDevBaseDir;
        const versionDir = rovoDevURIs.RovoDevVersionDir;
        const zipUrl = rovoDevURIs.RovoDevZipUrl;

        if (!zipUrl) {
            await this.sendErrorToChat(
                this.rovoDevWebviewProvider,
                new Error(
                    `Rovo Dev is not supported for the following platform/architecture: ${process.platform}/${process.arch}`,
                ),
            );
            return;
        }

        this.rovoDevWebviewProvider.signalBinaryDownloadStarted(0);

        try {
            if (fs.existsSync(baseDir)) {
                await getFsPromise((callback) => fs.rm(baseDir, { recursive: true, force: true }, callback));
            }

            const onProgressChange = (downloadedBytes: number, totalBytes: number | undefined) => {
                if (totalBytes) {
                    this.rovoDevWebviewProvider.signalBinaryDownloadProgress(downloadedBytes, totalBytes);
                }
            };

            await downloadAndUnzip(zipUrl, baseDir, versionDir, true, onProgressChange);

            await getFsPromise((callback) => fs.mkdir(versionDir, { recursive: true }, callback));
        } catch (error) {
            await this.sendErrorToChat(
                this.rovoDevWebviewProvider,
                new Error(
                    `Unable to update Rovo Dev:\n${error.message}\n\nTo try again, please close VS Code and reopen it.`,
                ),
            );
            throw error;
        }

        this.rovoDevWebviewProvider.signalBinaryDownloadEnded();
    }

    private static async internalInitializeRovoDev(
        context: ExtensionContext,
        credentials: CloudCredentials | undefined,
        forceNewInstance?: boolean,
    ) {
        if (!workspace.workspaceFolders?.length) {
            await this.rovoDevWebviewProvider.signalRovoDevDisabled('NoWorkspaceOpen');
            return;
        }

        if (forceNewInstance) {
            this.stopRovoDevInstance();
        } else {
            this.failIfRovoDevInstanceIsRunning();
        }

        this.currentCredentials = credentials;

        if (!credentials) {
            await this.rovoDevWebviewProvider.signalRovoDevDisabled('NeedAuth');
            return;
        }

        const rovoDevURIs = GetRovoDevURIs(context);
        await this.rovoDevWebviewProvider.signalInitializing(credentials.host);

        try {
            if (!fs.existsSync(rovoDevURIs.RovoDevBinPath)) {
                await this.downloadBinaryThenInitialize(rovoDevURIs);
            }

            await this.startRovoDev(context, credentials, rovoDevURIs);
        } catch (error) {
            this.sendErrorToChat(this.rovoDevWebviewProvider, error);
        }
    }

    public static async initializeRovoDev(context: ExtensionContext, forceNewInstance?: boolean) {
        if (this.asyncLocked) {
            throw new Error('Multiple initialization of Rovo Dev attempted');
        }

        this.asyncLocked = true;

        try {
            if (!forceNewInstance) {
                this.failIfRovoDevInstanceIsRunning();
            }

            const credentials = await getCloudCredentials();
            await this.internalInitializeRovoDev(context, credentials, forceNewInstance);
        } finally {
            this.asyncLocked = false;
        }
    }

    public static async refreshRovoDevCredentials(context: ExtensionContext) {
        if (this.asyncLocked) {
            return;
        }

        if (this.rovoDevInstance) {
            this.asyncLocked = true;

            try {
                const credentials = await getCloudCredentials();
                if (areCredentialsEqual(credentials, this.currentCredentials)) {
                    return;
                }

                await this.internalInitializeRovoDev(context, credentials, true);
            } finally {
                this.asyncLocked = false;
            }
        } else {
            await this.initializeRovoDev(context);
        }
    }

    public static deactivateRovoDevProcessManager() {
        this.stopRovoDevInstance();
    }

    private static async startRovoDev(
        context: ExtensionContext,
        credentials: CloudCredentials,
        rovoDevURIs: RovoDevURIs,
    ) {
        // skip if there is no workspace folder open
        if (!workspace.workspaceFolders) {
            return;
        }

        const folder = workspace.workspaceFolders[0];
        this.rovoDevInstance = new RovoDevTerminalInstance(
            this.rovoDevWebviewProvider,
            folder.uri.fsPath,
            rovoDevURIs.RovoDevBinPath,
            rovoDevURIs.RovoDevIconUri,
        );

        context.subscriptions.push(this.rovoDevInstance);

        await this.rovoDevInstance.start(credentials);
    }

    public static showTerminal() {
        this.rovoDevInstance?.showTerminal();
    }

    private static async sendErrorToChat(rovoDevWebViewProvider: RovoDevWebviewProvider, error: Error) {
        if (error instanceof ProcessManagerError && error.type === 'needAuth') {
            await rovoDevWebViewProvider.signalRovoDevDisabled('NeedAuth');
        } else {
            await rovoDevWebViewProvider.signalProcessFailedToInitialize(error.message);
        }
    }
}

class RovoDevTerminalInstance extends Disposable {
    private rovoDevTerminal: Terminal | undefined;
    private started = false;
    private httpPort: number = 0;
    private disposables: Disposable[] = [];

    public get stopped() {
        return !this.rovoDevTerminal;
    }

    constructor(
        private readonly rovoDevWebviewProvider: RovoDevWebviewProvider,
        private readonly workspacePath: string,
        private readonly rovoDevBinPath: string,
        private readonly rovoDevIconUri: Uri,
    ) {
        super(() => this.stop());
    }

    public async start(credentials: CloudCredentials): Promise<void> {
        if (this.started) {
            throw new Error('Instance already started');
        }
        this.started = true;

        const port = await getOrAssignPortForWorkspace();
        const rovoDevWebviewProvider = this.rovoDevWebviewProvider;

        return new Promise<void>((resolve, reject) => {
            if (!credentials) {
                reject(new ProcessManagerError('needAuth'));
                return;
            }

            access(this.rovoDevBinPath, constants.X_OK, async (err) => {
                if (err) {
                    reject(new Error(`executable not found.`));
                    return;
                }

                try {
                    const siteUrl = `https://${credentials.host}`;
                    const shellArgs = ['serve', `${port}`, '--xid', 'rovodev-ide-vscode', '--site-url', siteUrl];

                    if (credentials.isStaging) {
                        shellArgs.push('--server-env', 'staging');
                    }

                    this.rovoDevTerminal = window.createTerminal({
                        name: 'Rovo Dev',
                        shellPath: this.rovoDevBinPath,
                        shellArgs,
                        cwd: this.workspacePath,
                        hideFromUser: true,
                        isTransient: true,
                        iconPath: this.rovoDevIconUri,
                        env: {
                            USER: process.env.USER,
                            USER_EMAIL: credentials.username,
                            ROVODEV_SANDBOX_ID: Container.appInstanceId,
                            ...(credentials.key ? { USER_API_TOKEN: credentials.key } : {}),
                        },
                    });

                    const timeStarted = new Date();

                    // prints a line in the terminal indicating when the process started, and the full command line
                    this.rovoDevTerminal.sendText(
                        `${format(timeStarted, 'yyyy-MM-dd hh:mm:ss.sss')} | START    | ${this.rovoDevBinPath} ${shellArgs.join(' ')}\r\n`,
                        false,
                    );

                    this.httpPort = port;

                    const onDidCloseTerminal = window.onDidCloseTerminal((event) => {
                        if (event === this.rovoDevTerminal) {
                            this.finalizeStop();

                            // we don't want to pass the 0 code as a number, as it's not an error
                            rovoDevWebviewProvider.signalProcessTerminated(event.exitStatus?.code || undefined);
                        }
                    });
                    this.disposables.push(onDidCloseTerminal);

                    await rovoDevWebviewProvider.signalProcessStarted(port, timeStarted.getTime());
                    resolve();
                } catch (error) {
                    // make sure we only reject instances of Error
                    reject(error instanceof Error ? error : new Error(error));
                }
            });
        });
    }

    public async stop(): Promise<void> {
        // save these values before `finalizeStop` erases them
        const rovoDevPort = this.httpPort;
        const isTerminalAlive = !!this.rovoDevTerminal;

        // call this regardless
        this.finalizeStop();

        if (isTerminalAlive) {
            await shutdownRovoDev(rovoDevPort);
        }
    }

    private finalizeStop() {
        this.httpPort = 0;
        this.rovoDevTerminal?.dispose();
        this.rovoDevTerminal = undefined;
        this.disposables.forEach((x) => x.dispose());
        this.disposables = [];
    }

    public showTerminal() {
        //this.rovoDevTerminal?.show();

        // show all terminals named "Rovo Dev"
        window.terminals.filter((x) => x.name === 'Rovo Dev').forEach((x) => x.show());
    }
}
