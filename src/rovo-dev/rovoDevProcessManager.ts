import { format } from 'date-fns';
import { access, constants } from 'fs';
import fs from 'fs';
import net from 'net';
import packageJson from 'package.json';
import path from 'path';
import { RovoDevLogger } from 'src/logger';
import { downloadAndUnzip } from 'src/util/downloadFile';
import { getFsPromise } from 'src/util/fsPromises';
import { Disposable, Event, EventEmitter, ExtensionContext, Terminal, Uri, window, workspace } from 'vscode';

import { DetailedSiteInfo, isBasicAuthInfo, ProductJira } from '../atlclients/authInfo';
import { Container } from '../container';
import { RovoDevApiClient } from './rovoDevApiClient';
import { RovoDevDisabledReason, RovoDevEntitlementCheckFailedDetail } from './rovoDevWebviewProviderMessages';

export const MIN_SUPPORTED_ROVODEV_VERSION = packageJson.rovoDev.version;

// Rovodev port mapping settings
const RovoDevInfo = {
    hostname: '127.0.0.1',
    envVars: {
        port: 'ROVODEV_PORT',
    },
    portRange: {
        start: 40000,
        end: 41000,
    },
};

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
    const portStart = RovoDevInfo.portRange.start;
    const portEnd = RovoDevInfo.portRange.end;

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

export interface RovoDevProcessNotStartedState {
    state: 'NotStarted';
}

export interface RovoDevProcessDownloadingState {
    state: 'Downloading';
    jiraSiteHostname: DetailedSiteInfo | string;
    totalBytes: number;
    downloadedBytes: number;
}

export interface RovoDevProcessStartingState {
    state: 'Starting';
    jiraSiteHostname: DetailedSiteInfo | string;
}

export interface RovoDevProcessStartedState {
    state: 'Started';
    jiraSiteHostname: DetailedSiteInfo | string;
    hostname: string;
    httpPort: number;
    timeStarted: number;
}

export interface RovoDevProcessTerminatedState {
    state: 'Terminated';
    exitCode?: number;
}

export interface RovoDevProcessEntitlementCheckFailedState {
    state: 'Disabled';
    subState: 'EntitlementCheckFailed';
    entitlementDetail: RovoDevEntitlementCheckFailedDetail;
}

export interface RovoDevProcessDisabledState {
    state: 'Disabled';
    subState: Exclude<RovoDevDisabledReason, 'EntitlementCheckFailed'>;
    entitlementDetail?: RovoDevEntitlementCheckFailedDetail;
}

export interface RovoDevProcessFailedState {
    state: 'DownloadingFailed' | 'StartingFailed';
    error: Error;
}

export interface RovoDevProcessBoysenberryState {
    state: 'Boysenberry';
    hostname: string;
    httpPort: number;
}

export type RovoDevProcessState =
    | RovoDevProcessNotStartedState
    | RovoDevProcessDownloadingState
    | RovoDevProcessStartingState
    | RovoDevProcessStartedState
    | RovoDevProcessTerminatedState
    | RovoDevProcessEntitlementCheckFailedState
    | RovoDevProcessDisabledState
    | RovoDevProcessFailedState
    | RovoDevProcessBoysenberryState;

export abstract class RovoDevProcessManager {
    private static _onStateChanged = new EventEmitter<RovoDevProcessState>();
    public static get onStateChanged(): Event<RovoDevProcessState> {
        return this._onStateChanged.event;
    }

    private static currentCredentials: CloudCredentials | undefined;

    /** This lock ensures this class is async-safe, preventing repeated invocations
     * of `initializeRovoDev` or `refreshRovoDevCredentials` to launch multiple processes
     */
    private static asyncLocked = false;

    private static rovoDevInstance: RovoDevTerminalInstance | undefined;
    private static stopRovoDevInstance() {
        this.rovoDevInstance?.dispose();
        this.rovoDevInstance = undefined;
    }

    public static get state(): RovoDevProcessState {
        if (Container.isBoysenberryMode) {
            const httpPort = parseInt(process.env[RovoDevInfo.envVars.port] || '0');
            return { state: 'Boysenberry', hostname: RovoDevInfo.hostname, httpPort };
        } else {
            return this._state;
        }
    }
    private static _state: RovoDevProcessState = { state: 'NotStarted' };
    private static setState(newState: RovoDevProcessState) {
        this._state = newState;
        this._onStateChanged.fire(newState);
    }

    private static failIfRovoDevInstanceIsRunning() {
        if (this.rovoDevInstance && !this.rovoDevInstance.stopped) {
            throw new Error('Rovo Dev instance is already running.');
        }

        // if the Rovo Dev instance exists but it's already stopped, we can unreference it
        this.rovoDevInstance = undefined;
    }

    private static async downloadBinaryThenInitialize(credentialsHost: string, rovoDevURIs: RovoDevURIs) {
        const baseDir = rovoDevURIs.RovoDevBaseDir;
        const versionDir = rovoDevURIs.RovoDevVersionDir;
        const zipUrl = rovoDevURIs.RovoDevZipUrl;

        if (!zipUrl) {
            this.setState({
                state: 'Disabled',
                subState: 'UnsupportedArch',
            });
            return;
        }

        // setting totalBytes to 1 because we don't know its size yet,
        // and we want to show 0% downloaded
        this.setState({
            state: 'Downloading',
            jiraSiteHostname: credentialsHost,
            totalBytes: 1,
            downloadedBytes: 0,
        });

        if (fs.existsSync(baseDir)) {
            await getFsPromise((callback) => fs.rm(baseDir, { recursive: true, force: true }, callback));
        }

        const onProgressChange = (downloadedBytes: number, totalBytes: number | undefined) => {
            if (totalBytes) {
                this.setState({
                    state: 'Downloading',
                    jiraSiteHostname: credentialsHost,
                    totalBytes,
                    downloadedBytes,
                });
            }
        };

        await downloadAndUnzip(zipUrl, baseDir, versionDir, true, onProgressChange);

        await getFsPromise((callback) => fs.mkdir(versionDir, { recursive: true }, callback));

        this.setState({
            state: 'Starting',
            jiraSiteHostname: credentialsHost,
        });
    }

    private static async internalInitializeRovoDev(
        context: ExtensionContext,
        credentials: CloudCredentials | undefined,
        forceNewInstance?: boolean,
    ) {
        if (!workspace.workspaceFolders?.length) {
            this.setState({
                state: 'Disabled',
                subState: 'NoWorkspaceOpen',
            });
            return;
        }

        if (forceNewInstance) {
            this.stopRovoDevInstance();
        } else {
            this.failIfRovoDevInstanceIsRunning();
        }

        this.currentCredentials = credentials;

        if (!credentials) {
            this.setState({
                state: 'Disabled',
                subState: 'NeedAuth',
            });
            return;
        }

        this.setState({
            state: 'Starting',
            jiraSiteHostname: credentials.host,
        });

        let rovoDevURIs: ReturnType<typeof GetRovoDevURIs>;

        try {
            rovoDevURIs = GetRovoDevURIs(context);

            if (!fs.existsSync(rovoDevURIs.RovoDevBinPath)) {
                await this.downloadBinaryThenInitialize(credentials.host, rovoDevURIs);
            }
        } catch (error) {
            RovoDevLogger.error(error, 'Error downloading Rovo Dev');
            this.setState({
                state: 'DownloadingFailed',
                error,
            });
            return;
        }

        try {
            await this.startRovoDev(context, credentials, rovoDevURIs);
        } catch (error) {
            RovoDevLogger.error(error, 'Error executing Rovo Dev');
            this.setState({
                state: 'StartingFailed',
                error,
            });
            return;
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
            folder.uri.fsPath,
            rovoDevURIs.RovoDevBinPath,
            rovoDevURIs.RovoDevIconUri,
        );

        context.subscriptions.push(this.rovoDevInstance);

        await this.rovoDevInstance.start(credentials, (newState) => this.setState(newState));
    }

    public static showTerminal() {
        this.rovoDevInstance?.showTerminal();
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
        private readonly workspacePath: string,
        private readonly rovoDevBinPath: string,
        private readonly rovoDevIconUri: Uri,
    ) {
        super(() => this.stop());
    }

    public async start(
        credentials: CloudCredentials,
        setState: (newState: RovoDevProcessState) => void,
    ): Promise<void> {
        if (this.started) {
            throw new Error('Instance already started');
        }
        this.started = true;

        const port = await getOrAssignPortForWorkspace();

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
                    const shellArgs = [
                        'serve',
                        `${port}`,
                        '--xid',
                        'rovodev-ide-vscode',
                        '--site-url',
                        siteUrl,
                        '--respect-configured-permissions',
                    ];

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

                            if (event.exitStatus?.code) {
                                RovoDevLogger.error(
                                    new Error(`Rovo Dev process terminated with exit code ${event.exitStatus.code}.`),
                                );
                            }

                            // we don't want to pass the 0 code as a number, as it's not an error
                            setState({
                                state: 'Terminated',
                                exitCode: event.exitStatus?.code || undefined,
                            });
                        }
                    });
                    this.disposables.push(onDidCloseTerminal);

                    setState({
                        state: 'Started',
                        jiraSiteHostname: credentials.host,
                        hostname: RovoDevInfo.hostname,
                        httpPort: port,
                        timeStarted: timeStarted.getTime(),
                    });

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
