import { ChildProcess, spawn } from 'child_process';
import { access, constants } from 'fs';
import { commands, Disposable, ExtensionContext, OutputChannel, window, workspace } from 'vscode';
import {
    CloseAction,
    ErrorAction,
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
} from 'vscode-languageclient/node';

import { ExtensionApi } from './api/extensionApi';
import { GetRovoDevURIs, RovoDevProcessManager, RovoDevProcessState } from './rovoDevProcessManager';
import { RovoDevLogger } from './util/rovoDevLogger';

/** Command ID for restarting the Rovo Dev Language Server */
export const RESTART_LSP_COMMAND = 'atlascode.rovodev.restartLsp';

/**
 * Checks if a file exists and is executable.
 */
function checkBinaryExists(binPath: string): Promise<boolean> {
    return new Promise((resolve) => {
        access(binPath, constants.X_OK, (err) => {
            resolve(!err);
        });
    });
}

/**
 * Determines if the Rovo Dev binary is ready based on process state.
 * We only start the LSP when the chat process has successfully started,
 * which guarantees the binary exists and works.
 */
function isBinaryReady(state: RovoDevProcessState): boolean {
    return state.state === 'Started' || state.state === 'Boysenberry';
}

/**
 * RovoDevLanguageServerProvider manages the Rovo Dev Language Server client.
 * The LSP is started when the Rovo Dev binary is ready (i.e., when the chat process
 * reaches 'Started' or 'Boysenberry' state) and stopped when disposed.
 *
 * Note: The LSP uses a separate process (`acli rovodev lsp`) that communicates via stdio,
 * but we wait for the chat process to start first to ensure the binary is downloaded and working.
 */
/** Maximum number of restart attempts before giving up */
const MAX_RESTART_ATTEMPTS = 3;

/** Time window in ms to reset restart counter (5 minutes) */
const RESTART_WINDOW_MS = 5 * 60 * 1000;

export class RovoDevLanguageServerProvider extends Disposable {
    private client: LanguageClient | undefined;
    private serverProcess: ChildProcess | undefined;
    private context: ExtensionContext;
    private disposables: Disposable[] = [];
    private isStarting = false;
    private outputChannel: OutputChannel;
    private restartAttempts = 0;
    private lastRestartTime = 0;
    private extensionApi = new ExtensionApi();

    constructor(context: ExtensionContext) {
        super(() => this.dispose());
        this.context = context;

        // Create output channel for LSP logging
        this.outputChannel = window.createOutputChannel('Rovo Dev Language Server');

        // Register the restart command
        this.disposables.push(commands.registerCommand(RESTART_LSP_COMMAND, () => this.restartLanguageServer()));

        // Listen for Rovo Dev process state changes to know when binary is ready
        this.disposables.push(RovoDevProcessManager.onStateChanged((state) => this.handleProcessStateChanged(state)));

        // Check if binary is already ready (in case chat process started before this provider was created)
        this.handleProcessStateChanged(RovoDevProcessManager.state);
    }

    /**
     * Handles changes in the Rovo Dev process state.
     * Starts the LSP when the binary is ready (chat process started successfully).
     */
    private handleProcessStateChanged(state: RovoDevProcessState): void {
        if (isBinaryReady(state)) {
            this.startLanguageServer();
        }
    }

    /**
     * Restarts the Rovo Dev Language Server.
     */
    public async restartLanguageServer(): Promise<void> {
        this.outputChannel.appendLine('Restarting Rovo Dev Language Server...');
        // Reset restart counter on manual restart
        this.restartAttempts = 0;
        await this.stopLanguageServer();
        await this.startLanguageServer();
    }

    /**
     * Starts the Rovo Dev Language Server.
     */
    private async startLanguageServer(): Promise<void> {
        // Prevent multiple simultaneous start attempts
        if (this.client || this.isStarting) {
            return;
        }

        this.isStarting = true;

        try {
            const rovoDevURIs = GetRovoDevURIs(this.context);
            const binPath = rovoDevURIs.RovoDevBinPath;

            // Check if the binary exists before trying to start the server
            const binaryExists = await checkBinaryExists(binPath);
            if (!binaryExists) {
                RovoDevLogger.warn(`Rovo Dev LSP: Binary at ${binPath} is not found, skipping language server start`);
                this.outputChannel.appendLine('Binary not found, skipping language server start');
                return;
            }

            this.outputChannel.appendLine(`Starting Rovo Dev Language Server: ${binPath} lsp`);

            // Get the workspace folder for cwd
            const workspaceFolder = workspace.workspaceFolders?.[0]?.uri.fsPath;

            // Get credentials for environment variables (same as chat process)
            const credentials = await this.extensionApi.auth.getCloudPrimaryAuthSite();
            const env = {
                ...process.env,
                USER: process.env.USER || process.env.USERNAME,
                ROVODEV_SANDBOX_ID: this.extensionApi.metadata.appInstanceId(),
                ...(credentials?.authInfo.username ? { USER_EMAIL: credentials.authInfo.username } : {}),
                ...(credentials?.authInfo.password ? { USER_API_TOKEN: credentials.authInfo.password } : {}),
            };

            // Server options - spawn the process ourselves for better lifecycle control
            const serverOptions: ServerOptions = (): Promise<ChildProcess> => {
                this.serverProcess = spawn(binPath, ['lsp'], {
                    cwd: workspaceFolder,
                    env,
                });

                this.serverProcess.on('error', (error) => {
                    this.outputChannel.appendLine(`Server process error: ${error.message}`);
                    RovoDevLogger.error(error, 'Rovo Dev LSP process error');
                });

                this.serverProcess.on('exit', (code, signal) => {
                    this.outputChannel.appendLine(`Server process exited with code ${code} and signal ${signal}`);
                    this.serverProcess = undefined;
                });

                this.serverProcess.on('spawn', () => {
                    this.outputChannel.appendLine('Server process spawned successfully');
                });

                return Promise.resolve(this.serverProcess);
            };

            // Client options - register for all file types
            const clientOptions: LanguageClientOptions = {
                // Register the server for all documents
                documentSelector: [{ scheme: 'file' }, { scheme: 'untitled' }],
                // Use a diagnostic collection name for labeling diagnostics
                diagnosticCollectionName: 'rovodev',
                // Output channel for server traces
                outputChannel: this.outputChannel,
                // Error handling with auto-restart on connection close
                errorHandler: {
                    error: (error, message, count) => {
                        this.outputChannel.appendLine(`Language server error: ${error?.message || error}`);
                        RovoDevLogger.error(error, 'Rovo Dev LSP error');
                        // Continue running after errors (up to a point)
                        if (count && count < 3) {
                            return { action: ErrorAction.Continue };
                        }
                        return { action: ErrorAction.Shutdown };
                    },
                    closed: () => {
                        this.outputChannel.appendLine('Language server connection closed');

                        const now = Date.now();
                        // Reset restart counter if enough time has passed
                        if (now - this.lastRestartTime > RESTART_WINDOW_MS) {
                            this.restartAttempts = 0;
                        }
                        this.lastRestartTime = now;
                        this.restartAttempts++;

                        // Only restart if we haven't exceeded the max attempts
                        if (this.restartAttempts <= MAX_RESTART_ATTEMPTS) {
                            this.outputChannel.appendLine(
                                `Attempting restart (${this.restartAttempts}/${MAX_RESTART_ATTEMPTS})...`,
                            );
                            return { action: CloseAction.Restart };
                        }

                        this.outputChannel.appendLine(
                            `Max restart attempts (${MAX_RESTART_ATTEMPTS}) reached. Not restarting. ` +
                                `Use "Rovo Dev: Restart Language Server" command to manually restart.`,
                        );
                        return { action: CloseAction.DoNotRestart };
                    },
                },
            };

            // Create the language client
            this.client = new LanguageClient(
                'rovoDevLanguageServer',
                'Rovo Dev Language Server',
                serverOptions,
                clientOptions,
            );

            // Start the client (this also starts the server)
            await this.client.start();

            this.outputChannel.appendLine('Rovo Dev Language Server started successfully');
            RovoDevLogger.info('Rovo Dev Language Server started successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.outputChannel.appendLine(`Failed to start Rovo Dev Language Server: ${errorMessage}`);
            RovoDevLogger.error(error, 'Failed to start Rovo Dev Language Server');
            // Don't show error to user - LSP may not be available in all versions of the binary
            this.client = undefined;
        } finally {
            this.isStarting = false;
        }
    }

    /**
     * Stops the Rovo Dev Language Server.
     */
    private async stopLanguageServer(): Promise<void> {
        const client = this.client;
        if (!client) {
            return;
        }

        // Clear the client reference first to prevent re-entry
        this.client = undefined;

        try {
            // Only try to stop if the client is in a state where it can be stopped
            if (client.isRunning()) {
                await client.stop();
                this.outputChannel.appendLine('Rovo Dev Language Server stopped');
                RovoDevLogger.info('Rovo Dev Language Server stopped');
            } else {
                this.outputChannel.appendLine('Language server was not running, skipping stop');
            }
        } catch (error) {
            // Ignore errors when stopping - the client may already be stopped or in an invalid state
            this.outputChannel.appendLine(`Note: Error while stopping language server (may be expected): ${error}`);
        } finally {
            // Ensure the server process is killed
            if (this.serverProcess) {
                this.serverProcess.kill();
                this.serverProcess = undefined;
            }
        }
    }

    /**
     * Disposes of the language server provider and all its resources.
     */
    public override dispose(): void {
        this.stopLanguageServer();
        this.outputChannel.dispose();
        this.disposables.forEach((d) => d.dispose());
        this.disposables = [];
    }
}
