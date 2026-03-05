import { ChildProcess, spawn } from 'child_process';
import { access, constants } from 'fs';
import fs from 'fs';
import net from 'net';
import packageJson from 'package.json';
import path from 'path';
import { AuthInfoState } from 'src/atlclients/authInfo';
import { Logger } from 'src/logger';
import { UserInfo } from 'src/rovo-dev/api/extensionApiTypes';
import { downloadAndUnzip } from 'src/rovo-dev/util/downloadFile';
import { getFsPromise } from 'src/rovo-dev/util/fsPromises';
import { waitFor } from 'src/rovo-dev/util/waitFor';
import { v4 } from 'uuid';
import { Disposable, Event, EventEmitter, ExtensionContext, Uri, workspace } from 'vscode';

import { FeatureFlagClient } from '../util/featureFlags/featureFlagClient';
import { Features } from '../util/features';
import { ExtensionApi, ValidBasicAuthSiteData } from './api/extensionApi';
import { RovoDevTelemetryProvider } from './rovoDevTelemetryProvider';
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

export function GetRovoDevURIs(context: ExtensionContext) {
    const platform = process.platform;
    const arch = process.arch;
    const extensionPath = context.storageUri!.fsPath;
    const rovoDevBaseDir = path.join(extensionPath, 'atlascode-rovodev-bin');
    const rovoDevVersionDir = path.join(rovoDevBaseDir, MIN_SUPPORTED_ROVODEV_VERSION);
    const rovoDevBinPath = path.join(rovoDevVersionDir, 'atlassian_cli_rovodev') + (platform === 'win32' ? '.exe' : '');

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
    };
}

export type RovoDevURIs = ReturnType<typeof GetRovoDevURIs>;

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

function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

async function getOrAssignPortForWorkspace(): Promise<number> {
    const portStart = RovoDevInfo.portRange.start;
    const portEnd = RovoDevInfo.portRange.end;

    const len = portEnd - portStart + 1;
    const a = getRandomInt(3, len);
    const b = getRandomInt(3, len);

    // use a bijective function to "randomize" the next port without picking the same port twice
    const pickPort = (x: number) => ((a * x + b) % len) + portStart;

    for (let i = 0; i < len; ++i) {
        const port = pickPort(i);
        if (await isPortAvailable(port)) {
            return port;
        }
    }

    throw new Error('unable to find an available port.');
}

function areCredentialsEqual(cred1?: ValidBasicAuthSiteData, cred2?: ValidBasicAuthSiteData) {
    if (cred1 === cred2) {
        return true;
    }

    if (!cred1 || !cred2) {
        return false;
    }

    return (
        cred1.host === cred2.host &&
        cred1.authInfo.password === cred2.authInfo.password &&
        cred1.authInfo.username === cred2.authInfo.username
    );
}

export interface RovoDevProcessNotStartedState {
    state: 'NotStarted';
}

export interface RovoDevProcessDownloadingState {
    state: 'Downloading';
    jiraSiteHostname: string;
    jiraSiteUserInfo: UserInfo;
    totalBytes: number;
    downloadedBytes: number;
}

export interface RovoDevProcessStartingState {
    state: 'Starting';
    jiraSiteHostname: string;
    jiraSiteUserInfo: UserInfo;
}

export interface RovoDevProcessStartedState {
    state: 'Started';
    jiraSiteHostname: string;
    jiraSiteUserInfo: UserInfo;
    pid: number | undefined;
    hostname: string;
    httpPort: number;
    sessionToken: string;
    timeStarted: number;
}

export interface RovoDevProcessTerminatedState {
    state: 'Terminated';
    exitCode?: number;
    stderr?: string;
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
    sessionToken: string;
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

    private static currentCredentials: ValidBasicAuthSiteData | undefined;
    private static extensionApi: ExtensionApi = new ExtensionApi();

    /** This lock ensures this class is async-safe, preventing repeated invocations
     * of `initializeRovoDev` or `refreshRovoDevCredentials` to launch multiple processes
     */
    private static asyncLocked = false;

    private static rovoDevInstance: RovoDevSubprocessInstance | undefined;
    private static stopRovoDevInstance() {
        this.rovoDevInstance?.dispose();
        this.rovoDevInstance = undefined;
    }

    public static get state(): RovoDevProcessState {
        if (RovoDevProcessManager.extensionApi.metadata.isBoysenberry()) {
            const httpPort = parseInt(process.env[RovoDevInfo.envVars.port] || '0');
            const sessionToken = process.env.ROVODEV_SERVE_SESSION_TOKEN || '';
            return { state: 'Boysenberry', hostname: RovoDevInfo.hostname, httpPort, sessionToken };
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
        this.stopRovoDevInstance();
    }

    private static async downloadBinaryThenInitialize(credentials: ValidBasicAuthSiteData, rovoDevURIs: RovoDevURIs) {
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
            jiraSiteHostname: credentials.host,
            jiraSiteUserInfo: credentials.authInfo.user,
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
                    jiraSiteHostname: credentials.host,
                    jiraSiteUserInfo: credentials.authInfo.user,
                    totalBytes,
                    downloadedBytes,
                });
            }
        };

        await downloadAndUnzip(zipUrl, baseDir, versionDir, true, onProgressChange);

        await getFsPromise((callback) => fs.mkdir(versionDir, { recursive: true }, callback));

        this.setState({
            state: 'Starting',
            jiraSiteHostname: credentials.host,
            jiraSiteUserInfo: credentials.authInfo.user,
        });
    }

    private static async internalInitializeRovoDev(
        context: ExtensionContext,
        credentials: ValidBasicAuthSiteData | undefined,
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
            jiraSiteUserInfo: credentials.authInfo.user,
        });

        let rovoDevURIs: ReturnType<typeof GetRovoDevURIs>;

        try {
            rovoDevURIs = GetRovoDevURIs(context);

            if (!fs.existsSync(rovoDevURIs.RovoDevBinPath)) {
                await this.downloadBinaryThenInitialize(credentials, rovoDevURIs);
            }
        } catch (error) {
            RovoDevTelemetryProvider.logError(error, 'Error downloading Rovo Dev');
            this.setState({
                state: 'DownloadingFailed',
                error,
            });
            return;
        }

        try {
            await this.startRovoDev(context, credentials, rovoDevURIs);
        } catch (error) {
            RovoDevTelemetryProvider.logError(error, 'Error executing Rovo Dev');
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

            const credentials = await this.getCredentials();
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
                const credentials = await this.getCredentials();
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

    private static async getCredentials(): Promise<ValidBasicAuthSiteData | undefined> {
        // Use dedicated RovoDev credentials
        const featureFlagClient = FeatureFlagClient.getInstance();
        const rovoDevAuth = await RovoDevProcessManager.extensionApi.auth.getRovoDevAuthInfo();

        // If we have RovoDev credentials, use them
        if (rovoDevAuth && rovoDevAuth.host) {
            // Convert RovoDev auth to ValidBasicAuthSiteData format
            return {
                host: rovoDevAuth.host,
                authInfo: rovoDevAuth,
                isValid: rovoDevAuth.state === AuthInfoState.Valid,
                isStaging: false,
                siteCloudId: rovoDevAuth.cloudId,
            };
        }

        // If RequireDedicatedRovoDevAuth is disabled and no RovoDev credentials exist,
        // fall back to Jira credentials for migration
        if (!featureFlagClient.checkGate(Features.RequireDedicatedRovoDevAuth)) {
            return await RovoDevProcessManager.extensionApi.auth.getCloudPrimaryAuthSite();
        }

        return undefined;
    }

    public static async deactivateRovoDevProcessManager() {
        // wait for the lock to be released before stopping the instance
        await waitFor({
            check: () => this.asyncLocked,
            condition: (asyncLocked) => !asyncLocked,
            timeout: 10000,
            interval: 100,
        });

        this.stopRovoDevInstance();

        this.setState({
            state: 'NotStarted',
        });
    }

    private static async startRovoDev(
        context: ExtensionContext,
        credentials: ValidBasicAuthSiteData,
        rovoDevURIs: RovoDevURIs,
    ) {
        // skip if there is no workspace folder open
        if (!workspace.workspaceFolders) {
            return;
        }

        const folder = workspace.workspaceFolders[0];
        this.rovoDevInstance = new RovoDevSubprocessInstance(folder.uri.fsPath, rovoDevURIs.RovoDevBinPath);

        context.subscriptions.push(this.rovoDevInstance);

        await this.rovoDevInstance.start(credentials, (newState) => this.setState(newState));
    }
}

class RovoDevSubprocessInstance extends Disposable {
    private rovoDevProcess: ChildProcess | undefined;
    private started = false;
    private disposables: Disposable[] = [];
    private extensionApi = new ExtensionApi();

    public get stopped() {
        return !this.rovoDevProcess;
    }

    constructor(
        private readonly workspacePath: string,
        private readonly rovoDevBinPath: string,
    ) {
        super(() => this.stop());
    }

    public async start(
        credentials: ValidBasicAuthSiteData,
        setState: (newState: RovoDevProcessState) => void,
    ): Promise<void> {
        if (this.started) {
            throw new Error('Instance already started');
        }
        this.started = true;

        const port = await getOrAssignPortForWorkspace();

        // reading from this env variable first to allow for an easier debugging
        const sessionToken = process.env.ROVODEV_SERVE_SESSION_TOKEN || v4();

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

                    let stderrData = '';

                    this.rovoDevProcess = spawn(this.rovoDevBinPath, shellArgs, {
                        cwd: this.workspacePath,
                        stdio: ['ignore', 'pipe', 'pipe'],
                        windowsHide: true,
                        env: {
                            ...process.env,
                            USER: process.env.USER || process.env.USERNAME,
                            USER_EMAIL: credentials.authInfo.username,
                            ROVODEV_SANDBOX_ID: this.extensionApi.metadata.appInstanceId(),
                            ROVODEV_SERVE_SESSION_TOKEN: sessionToken,
                            ...(credentials.authInfo.password ? { USER_API_TOKEN: credentials.authInfo.password } : {}),
                        },
                    })
                        .on('spawn', () => {
                            const timeStarted = new Date();
                            setState({
                                state: 'Started',
                                jiraSiteHostname: credentials.host,
                                jiraSiteUserInfo: credentials.authInfo.user,
                                pid: this.rovoDevProcess?.pid,
                                hostname: RovoDevInfo.hostname,
                                httpPort: port,
                                sessionToken,
                                timeStarted: timeStarted.getTime(),
                            });
                        })
                        .on('exit', (code) => {
                            if (!this.rovoDevProcess) {
                                return;
                            }

                            this.rovoDevProcess = undefined;
                            this.stop();

                            // Log stderr if there's any when process exits
                            if (code !== 0 && stderrData.trim()) {
                                RovoDevTelemetryProvider.logError(
                                    new Error(`RovoDev Stderr`),
                                    `RovoDev process exited with stderr and code: ${code}: ${stderrData.trim()}`,
                                );
                            }

                            // we don't want to pass the 0 code as a number, as it's not an error
                            setState({
                                state: 'Terminated',
                                exitCode: code || undefined,
                                stderr: stderrData,
                            });
                        });

                    if (this.rovoDevProcess.stderr) {
                        this.rovoDevProcess.stderr.on('data', (data) => {
                            const stderrOutput = data.toString();
                            stderrData += stderrOutput;
                            Logger.warn(`RovoDev stderr: ${stderrOutput.trim()}`);
                        });
                    }

                    resolve();
                } catch (error) {
                    // make sure we only reject instances of Error
                    reject(error instanceof Error ? error : new Error(error));
                }
            });
        });
    }

    public async stop(): Promise<void> {
        const rovoDevProcess = this.rovoDevProcess;
        this.rovoDevProcess = undefined;
        if (rovoDevProcess) {
            // Try graceful termination first
            rovoDevProcess.kill('SIGTERM');

            // If process doesn't terminate gracefully, force kill after timeout
            setTimeout(() => {
                if (rovoDevProcess && !rovoDevProcess.killed) {
                    rovoDevProcess.kill('SIGKILL');
                }
            }, 5000);
        }

        this.disposables.forEach((x) => x.dispose());
        this.disposables = [];
    }
}
