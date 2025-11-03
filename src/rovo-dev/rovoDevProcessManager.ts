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
    const platform = process.platform;
    const arch = process.arch;
    const extensionPath = context.storageUri!.fsPath;
    const rovoDevBaseDir = path.join(extensionPath, 'atlascode-rovodev-bin');
    const rovoDevVersionDir = path.join(rovoDevBaseDir, MIN_SUPPORTED_ROVODEV_VERSION);
    const rovoDevBinPath = path.join(rovoDevVersionDir, 'atlassian_cli_rovodev') + (platform === 'win32' ? '.exe' : '');
    const rovoDevIconUri = Uri.file(context.asAbsolutePath(path.join('resources', 'rovodev-terminal-icon.svg')));

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
export async function shutdownRovoDev(port: number) {
    if (port) {
        try {
            await new RovoDevApiClient('127.0.0.1', port).shutdown();
        } catch {}
    }
}

export async function getOrAssignPortForWorkspace(): Promise<number> {
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
export async function getCloudCredentials(): Promise<
    { username: string; key: string; host: string; isValid: boolean; isStaging: boolean } | undefined
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

            // verify the credentials work
            let isValid: boolean;
            try {
                await Container.clientManager.jiraClient(site);
                isValid = true;
            } catch {
                isValid = false;
            }

            return {
                username: authInfo.username,
                key: authInfo.password,
                host: site.host,
                isValid,
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

export type CloudCredentials = NonNullable<Awaited<ReturnType<typeof getCloudCredentials>>>;

export function areCredentialsEqual(cred1?: CloudCredentials, cred2?: CloudCredentials) {
    if (cred1 === cred2) {
        return true;
    }

    if (!cred1 || !cred2) {
        return false;
    }

    return cred1.host === cred2.host && cred1.key === cred2.key && cred1.username === cred2.username;
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

export class RovoDevProcessManagerInstance extends Disposable {
    private readonly _id: string;
    private readonly _onStateChanged = new EventEmitter<RovoDevProcessState>();
    public readonly onStateChanged: Event<RovoDevProcessState> = this._onStateChanged.event;

    private _state: RovoDevProcessState = { state: 'NotStarted' };
    private _currentCredentials: CloudCredentials | undefined;
    private _asyncLocked = false;
    private _rovoDevInstance: RovoDevTerminalInstance | undefined;
    private _context: ExtensionContext;

    constructor(context: ExtensionContext, instanceId?: string) {
        super(() => {
            this.dispose();
        });

        this._id = instanceId || 'default';
        this._context = context;
    }

    public get id(): string {
        return this._id;
    }

    public get state(): RovoDevProcessState {
        if (Container.isBoysenberryMode) {
            const httpPort = parseInt(process.env[RovoDevInfo.envVars.port] || '0');
            return { state: 'Boysenberry', hostname: RovoDevInfo.hostname, httpPort };
        }
        return this._state;
    }

    private setState(newState: RovoDevProcessState) {
        this._state = newState;
        this._onStateChanged.fire(newState);
    }

    private stopRovoDevInstance() {
        this._rovoDevInstance?.dispose();
        this._rovoDevInstance = undefined;
    }

    private failIfRovoDevInstanceIsRunning() {
        if (this._rovoDevInstance && !this._rovoDevInstance.stopped) {
            throw new Error('Rovo Dev instance is already running.');
        }
        this._rovoDevInstance = undefined;
    }

    private async downloadBinaryThenInitialize(
        credentialsHost: string,
        rovoDevURIs: ReturnType<typeof GetRovoDevURIs>,
    ) {
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

    private async internalInitializeRovoDev(credentials: CloudCredentials | undefined, forceNewInstance?: boolean) {
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

        this._currentCredentials = credentials;

        if (!credentials) {
            this.setState({
                state: 'Disabled',
                subState: 'NeedAuth',
            });
            return;
        } else if (!credentials.isValid) {
            this.setState({
                state: 'Disabled',
                subState: 'UnauthorizedAuth',
            });
            return;
        }

        this.setState({
            state: 'Starting',
            jiraSiteHostname: credentials.host,
        });

        let rovoDevURIs: ReturnType<typeof GetRovoDevURIs>;

        try {
            rovoDevURIs = GetRovoDevURIs(this._context);

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
            await this.startRovoDev(credentials, rovoDevURIs);
        } catch (error) {
            RovoDevLogger.error(error, 'Error executing Rovo Dev');
            this.setState({
                state: 'StartingFailed',
                error,
            });
            return;
        }
    }

    public async initializeRovoDev(forceNewInstance?: boolean) {
        if (this._asyncLocked) {
            throw new Error('Multiple initialization of Rovo Dev attempted');
        }

        this._asyncLocked = true;

        try {
            if (!forceNewInstance) {
                this.failIfRovoDevInstanceIsRunning();
            }

            const credentials = await getCloudCredentials();
            await this.internalInitializeRovoDev(credentials, forceNewInstance);
        } finally {
            this._asyncLocked = false;
        }
    }

    public async refreshRovoDevCredentials() {
        if (this._asyncLocked) {
            return;
        }

        if (this._rovoDevInstance) {
            this._asyncLocked = true;

            try {
                const credentials = await getCloudCredentials();
                if (areCredentialsEqual(credentials, this._currentCredentials)) {
                    return;
                }

                await this.internalInitializeRovoDev(credentials, true);
            } finally {
                this._asyncLocked = false;
            }
        } else {
            await this.initializeRovoDev();
        }
    }

    private async startRovoDev(credentials: CloudCredentials, rovoDevURIs: ReturnType<typeof GetRovoDevURIs>) {
        if (!workspace.workspaceFolders) {
            return;
        }

        const folder = workspace.workspaceFolders[0];
        this._rovoDevInstance = new RovoDevTerminalInstance(
            folder.uri.fsPath,
            rovoDevURIs.RovoDevBinPath,
            rovoDevURIs.RovoDevIconUri,
            this._id !== 'default' ? this._id : undefined,
        );

        this._context.subscriptions.push(this._rovoDevInstance);

        await this._rovoDevInstance.start(credentials, (newState) => this.setState(newState));
    }

    public showTerminal() {
        this._rovoDevInstance?.showTerminal();
    }

    public override dispose(): void {
        this.stopRovoDevInstance();
        this._onStateChanged.dispose();
        super.dispose();
    }
}

export abstract class RovoDevProcessManager {
    private static _onStateChanged = new EventEmitter<RovoDevProcessState>();
    public static get onStateChanged(): Event<RovoDevProcessState> {
        return this._onStateChanged.event;
    }

    // Instance registry for multi-session support
    private static _instances: Map<string, RovoDevProcessManagerInstance> = new Map();
    private static _defaultInstance: RovoDevProcessManagerInstance | undefined;

    public static get defaultInstance(): RovoDevProcessManagerInstance | undefined {
        return RovoDevProcessManager._defaultInstance;
    }

    // Instance management methods
    public static createInstance(context: ExtensionContext, instanceId?: string): RovoDevProcessManagerInstance {
        const id = instanceId || 'default';

        if (this._instances.has(id)) {
            throw new Error(`Instance with ID '${id}' already exists`);
        }

        const instance = new RovoDevProcessManagerInstance(context, instanceId);
        this._instances.set(id, instance);

        if (id === 'default') {
            this._defaultInstance = instance;
        }

        return instance;
    }

    public static getInstance(instanceId: string = 'default'): RovoDevProcessManagerInstance | undefined {
        return this._instances.get(instanceId);
    }

    public static getAllInstances(): Map<string, RovoDevProcessManagerInstance> {
        return new Map(this._instances);
    }

    public static removeInstance(instanceId: string): void {
        const instance = this._instances.get(instanceId);
        if (instance) {
            instance.dispose();
            this._instances.delete(instanceId);

            if (instanceId === 'default') {
                this._defaultInstance = undefined;
            }
        }
    }

    // Credential propagation to all instances
    public static async propagateCredentialsToAllInstances(): Promise<void> {
        for (const instance of this._instances.values()) {
            try {
                await instance.refreshRovoDevCredentials();
            } catch (error) {
                RovoDevLogger.error(error, `Error refreshing credentials for instance ${instance.id}`);
            }
        }
    }

    // Backward compatibility: ensure default instance exists
    public static ensureDefaultInstance(context: ExtensionContext): RovoDevProcessManagerInstance {
        if (!this._defaultInstance) {
            this._defaultInstance = this.createInstance(context, 'default');
        }
        return this._defaultInstance;
    }

    public static get state(): RovoDevProcessState {
        if (Container.isBoysenberryMode) {
            const httpPort = parseInt(process.env[RovoDevInfo.envVars.port] || '0');
            return { state: 'Boysenberry', hostname: RovoDevInfo.hostname, httpPort };
        } else {
            // Return default instance state, or NotStarted if no default instance
            return this._defaultInstance?.state || { state: 'NotStarted' };
        }
    }

    public static async initializeRovoDev(context: ExtensionContext, forceNewInstance?: boolean) {
        const defaultInstance = this.ensureDefaultInstance(context);
        return defaultInstance.initializeRovoDev(forceNewInstance);
    }

    public static async refreshRovoDevCredentials(context: ExtensionContext) {
        // First, try to refresh all instances with new credentials
        await this.propagateCredentialsToAllInstances();

        // For backward compatibility, also ensure default instance is refreshed
        const defaultInstance = this.ensureDefaultInstance(context);
        return defaultInstance.refreshRovoDevCredentials();
    }

    public static deactivateRovoDevProcessManager() {
        // Dispose all instances
        for (const instance of this._instances.values()) {
            instance.dispose();
        }
        this._instances.clear();
        this._defaultInstance = undefined;
    }

    public static showTerminal() {
        // Show default instance terminal for backward compatibility
        this._defaultInstance?.showTerminal();
    }
}

export class RovoDevTerminalInstance extends Disposable {
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
        private readonly instanceId?: string,
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
                        name: this.instanceId ? `Rovo Dev (${this.instanceId.slice(0, 8)})` : 'Rovo Dev',
                        shellPath: this.rovoDevBinPath,
                        shellArgs,
                        cwd: this.workspacePath,
                        hideFromUser: true,
                        isTransient: true,
                        iconPath: this.rovoDevIconUri,
                        env: {
                            USER: process.env.USER || process.env.USERNAME,
                            USER_EMAIL: credentials.username,
                            ROVODEV_SANDBOX_ID: this.instanceId || Container.appInstanceId,
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
        if (this.rovoDevTerminal) {
            this.rovoDevTerminal.show();
        } else {
            // Fallback: show terminals that match our naming pattern
            const terminalNamePattern = this.instanceId ? `Rovo Dev (${this.instanceId.slice(0, 8)})` : 'Rovo Dev';
            window.terminals.filter((x) => x.name === terminalNamePattern).forEach((x) => x.show());
        }
    }
}
