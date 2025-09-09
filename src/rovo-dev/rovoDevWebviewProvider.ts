import * as fs from 'fs';
import path from 'path';
import { CommandContext, setCommandContext } from 'src/commandContext';
import { getFsPromise } from 'src/util/fsPromises';
import { setTimeout } from 'timers/promises';
import { v4 } from 'uuid';
import {
    CancellationToken,
    commands,
    Disposable,
    Event,
    ExtensionContext,
    Position,
    Range,
    TextEditor,
    Uri,
    Webview,
    WebviewView,
    WebviewViewProvider,
    WebviewViewResolveContext,
    window,
    workspace,
} from 'vscode';

import { Container } from '../../src/container';
import { Logger } from '../../src/logger';
import { Commands, rovodevInfo } from '../constants';
import {
    ModifiedFile,
    RovoDevViewResponse,
    RovoDevViewResponseType,
} from '../react/atlascode/rovo-dev/rovoDevViewMessages';
import { GitErrorCodes } from '../typings/git';
import { getHtmlForView } from '../webview/common/getHtmlForView';
import { RovoDevApiClient, RovoDevHealthcheckResponse } from './rovoDevApiClient';
import { RovoDevChatProvider } from './rovoDevChatProvider';
import { RovoDevFeedbackManager } from './rovoDevFeedbackManager';
import { RovoDevProcessManager } from './rovoDevProcessManager';
import { RovoDevPullRequestHandler } from './rovoDevPullRequestHandler';
import { RovoDevTelemetryProvider } from './rovoDevTelemetryProvider';
import { RovoDevContext, RovoDevContextItem, RovoDevInitState } from './rovoDevTypes';
import { RovoDevProviderMessage, RovoDevProviderMessageType } from './rovoDevWebviewProviderMessages';

interface TypedWebview<MessageOut, MessageIn> extends Webview {
    readonly onDidReceiveMessage: Event<MessageIn>;
    postMessage(message: MessageOut): Thenable<boolean>;
}

enum RovoDevProcessState {
    NotStarted,
    Starting,
    Started,
    Terminated,
    Disabled,
}

export class RovoDevWebviewProvider extends Disposable implements WebviewViewProvider {
    private readonly viewType = 'atlascodeRovoDev';
    private readonly isBoysenberry = process.env.ROVODEV_BBY;
    private readonly appInstanceId: string;

    private readonly _prHandler: RovoDevPullRequestHandler | undefined;
    private readonly _telemetryProvider: RovoDevTelemetryProvider;
    private readonly _chatProvider: RovoDevChatProvider;

    private _webView?: TypedWebview<RovoDevProviderMessage, RovoDevViewResponse>;
    private _rovoDevApiClient?: RovoDevApiClient;
    private _processState = RovoDevProcessState.NotStarted;
    private _initialized = false;

    // we keep the data in this collection so we can attach some metadata to the next
    // prompt informing Rovo Dev that those files has been reverted
    private _revertedChanges: string[] = [];

    private _disposables: Disposable[] = [];

    private _extensionPath: string;
    private _extensionUri: Uri;

    private _context: ExtensionContext;

    private get rovoDevApiClient() {
        return this._rovoDevApiClient;
    }

    private get isDisabled() {
        return this._processState === RovoDevProcessState.Disabled;
    }

    constructor(context: ExtensionContext, extensionPath: string) {
        super(() => {
            this._dispose();
        });

        this._extensionPath = extensionPath;
        this._extensionUri = Uri.file(this._extensionPath);
        this._context = context;
        // Register the webview view provider
        this._disposables.push(
            window.registerWebviewViewProvider('atlascode.views.rovoDev.webView', this, {
                webviewOptions: { retainContextWhenHidden: true },
            }),
        );

        // Register editor listeners
        this._registerEditorListeners();

        // Register this provider with the process manager for error handling
        RovoDevProcessManager.setRovoDevWebviewProvider(this);

        if (this.isBoysenberry) {
            this._prHandler = new RovoDevPullRequestHandler();
            this.appInstanceId = process.env.ROVODEV_SANDBOX_ID as string;
        } else {
            this.appInstanceId = Container.appInstanceId;
        }

        this._telemetryProvider = new RovoDevTelemetryProvider(
            this.isBoysenberry ? 'Boysenberry' : 'IDE',
            this.appInstanceId,
        );
        this._chatProvider = new RovoDevChatProvider(this._telemetryProvider);
    }

    public resolveWebviewView(
        webviewView: WebviewView,
        _context: WebviewViewResolveContext,
        _token: CancellationToken,
    ): Thenable<void> | void {
        const webview = webviewView.webview;
        this._webView = webview;

        this._chatProvider.setWebview(webview);

        webview.options = {
            enableCommandUris: true,
            enableScripts: true,
            localResourceRoots: [
                Uri.file(path.join(this._extensionPath, 'build')),
                Uri.file(path.join(this._extensionPath, 'node_modules', '@vscode', 'codicons', 'dist')),
            ],
        };

        const codiconsUri = webview.asWebviewUri(
            Uri.joinPath(this._extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css'),
        );

        webview.html = getHtmlForView(
            this._extensionPath,
            webview.asWebviewUri(this._extensionUri),
            webview.cspSource,
            this.viewType,
            codiconsUri,
        );

        webview.onDidReceiveMessage(async (e) => {
            try {
                switch (e.type) {
                    case RovoDevViewResponseType.Prompt:
                        const revertedChanges = this._revertedChanges;
                        this._revertedChanges = [];
                        await this._chatProvider.executeChat(e, revertedChanges);
                        break;

                    case RovoDevViewResponseType.CancelResponse:
                        if (!this._chatProvider.pendingCancellation) {
                            await this._chatProvider.executeCancel(false);
                        }
                        break;

                    case RovoDevViewResponseType.OpenFile:
                        await this.executeOpenFile(e.filePath, e.tryShowDiff, e.range);
                        break;

                    case RovoDevViewResponseType.UndoFileChanges:
                        await this.executeUndoFiles(e.files);
                        break;

                    case RovoDevViewResponseType.KeepFileChanges:
                        await this.executeKeepFiles(e.files);
                        break;

                    case RovoDevViewResponseType.CreatePR:
                        await this.createPR(e.payload.commitMessage, e.payload.branchName);
                        break;

                    case RovoDevViewResponseType.RetryPromptAfterError:
                        await this._chatProvider.executeRetryPromptAfterError();
                        break;

                    case RovoDevViewResponseType.GetCurrentBranchName:
                        await this.getCurrentBranchName();
                        break;

                    case RovoDevViewResponseType.ForceUserFocusUpdate:
                        await this.forceUserFocusUpdate();
                        break;

                    case RovoDevViewResponseType.AddContext:
                        await this.executeAddContext(e.currentContext);
                        break;

                    case RovoDevViewResponseType.ReportChangedFilesPanelShown:
                        this._telemetryProvider.fireTelemetryEvent(
                            'rovoDevFilesSummaryShownEvent',
                            this._chatProvider.currentPromptId,
                            e.filesCount,
                        );
                        break;

                    case RovoDevViewResponseType.ReportChangesGitPushed:
                        this._telemetryProvider.fireTelemetryEvent(
                            'rovoDevGitPushActionEvent',
                            this._chatProvider.currentPromptId,
                            e.pullRequestCreated,
                        );
                        break;

                    case RovoDevViewResponseType.CheckGitChanges:
                        await this._prHandler!.isGitStateClean().then((isClean) => {
                            this._webView?.postMessage({
                                type: RovoDevProviderMessageType.CheckGitChangesComplete,
                                hasChanges: !isClean,
                            });
                        });
                        break;

                    case RovoDevViewResponseType.ReportThinkingDrawerExpanded:
                        this._telemetryProvider.fireTelemetryEvent(
                            'rovoDevDetailsExpandedEvent',
                            this._chatProvider.currentPromptId,
                        );
                        break;

                    case RovoDevViewResponseType.WebviewReady:
                        if (!this.isBoysenberry && !this.isDisabled) {
                            await webview.postMessage({
                                type: RovoDevProviderMessageType.ProviderReady,
                                workspaceCount: workspace.workspaceFolders?.length || 0,
                            });
                        }

                        const fixedPort = parseInt(process.env[rovodevInfo.envVars.port] || '0');
                        if (fixedPort) {
                            this.signalProcessStarted(fixedPort);
                        } else if (this.isBoysenberry) {
                            this.signalRovoDevDisabled('other');
                            throw new Error('Rovo Dev port not set');
                        } else {
                            this._processState = RovoDevProcessState.Starting;
                            RovoDevProcessManager.initializeRovoDev(this._context);
                        }
                        break;

                    case RovoDevViewResponseType.GetAgentMemory:
                        await this.executeOpenFile('.agent.md', false, undefined, true);
                        break;

                    case RovoDevViewResponseType.TriggerFeedback:
                        await this.executeTriggerFeedback();
                        break;

                    case RovoDevViewResponseType.SendFeedback:
                        console.log('Send feedback message received in provider');
                        RovoDevFeedbackManager.submitFeedback({
                            feedbackType: e.feedbackType,
                            feedbackMessage: e.feedbackMessage,
                            canContact: e.canContact,
                            lastTenMessages: e.lastTenMessages,
                        });
                        break;

                    case RovoDevViewResponseType.LaunchJiraAuth:
                        await commands.executeCommand(Commands.JiraAPITokenLogin);
                        break;
                }
            } catch (error) {
                this.processError(error, false);
            }
        });
    }

    private beginNewSession(sessionId: string | null, manuallyCreated: boolean): void {
        this._telemetryProvider.startNewSession(sessionId ?? v4(), manuallyCreated);
    }

    // Helper to get openFile info from a document
    private getOpenFileInfo = (doc: { uri: Uri; fileName: string }) => {
        const workspaceFolder = workspace.getWorkspaceFolder(doc.uri);
        const baseName = doc.fileName.split(path.sep).pop() || '';
        return {
            name: baseName,
            absolutePath: doc.uri.fsPath,
            relativePath: workspaceFolder ? path.relative(workspaceFolder.uri.fsPath, doc.uri.fsPath) : doc.fileName,
        };
    };

    private async forceUserFocusUpdate(editor: TextEditor | undefined = window.activeTextEditor, selection?: Range) {
        if (!this._webView) {
            return;
        }

        selection = selection || (editor ? editor.selection : undefined);

        if (!editor) {
            await this._webView.postMessage({
                type: RovoDevProviderMessageType.UserFocusUpdated,
                userFocus: {
                    file: { name: '', absolutePath: '', relativePath: '' },
                    selection: undefined,
                    invalid: true,
                },
            });
            return;
        }

        const fileInfo = this.getOpenFileInfo(editor.document);

        await this._webView.postMessage({
            type: RovoDevProviderMessageType.UserFocusUpdated,
            userFocus: {
                file: fileInfo,
                selection:
                    selection && !selection.isEmpty
                        ? { start: selection.start.line, end: selection.end.line }
                        : undefined,
                invalid: fileInfo.absolutePath === '' || !fs.existsSync(fileInfo.absolutePath),
            },
        });
    }

    // Listen to active editor and selection changes
    private _registerEditorListeners() {
        // Listen for active editor changes
        this._disposables.push(
            window.onDidChangeActiveTextEditor((editor) => {
                if (!Container.isRovoDevEnabled) {
                    return;
                }
                this.forceUserFocusUpdate(editor);
            }),
        );
        // Listen for selection changes
        this._disposables.push(
            window.onDidChangeTextEditorSelection((event) => {
                if (!Container.isRovoDevEnabled) {
                    return;
                }
                this.forceUserFocusUpdate(event.textEditor);
            }),
        );
    }

    private processError(
        error: Error & { gitErrorCode?: GitErrorCodes },
        isRetriable: boolean,
        isProcessTerminated?: boolean,
    ) {
        Logger.error('RovoDev', error);

        const webview = this._webView!;
        return webview.postMessage({
            type: RovoDevProviderMessageType.ErrorMessage,
            message: {
                type: 'error',
                text: `${error.message}${error.gitErrorCode ? `\n ${error.gitErrorCode}` : ''}`,
                source: 'RovoDevError',
                isRetriable,
                isProcessTerminated,
                uid: v4(),
            },
        });
    }

    private async addContextItem(contextItem: RovoDevContextItem): Promise<void> {
        const webview = this._webView!;
        await webview.postMessage({
            type: RovoDevProviderMessageType.ContextAdded,
            context: contextItem,
        });
    }

    private async selectContextItem(): Promise<RovoDevContextItem | undefined> {
        // Get all workspace files
        const files = await workspace.findFiles('**/*', '**/node_modules/**');
        if (!files.length) {
            console.log('No files found in workspace.'); // bwieger, look at this more
            return;
        }

        // Show QuickPick to select a file
        const items = files.map((uri) => {
            const workspaceFolder = workspace.getWorkspaceFolder(uri);
            const absolutePath = uri.fsPath;
            const relativePath = workspaceFolder ? path.relative(workspaceFolder.uri.fsPath, uri.fsPath) : uri.fsPath;
            const name = path.basename(uri.fsPath);
            return {
                label: name,
                description: relativePath,
                uri,
                absolutePath,
                relativePath,
                name,
            };
        });

        const picked = await window.showQuickPick(items, {
            placeHolder: 'Select a file to add as context',
        });

        if (!picked) {
            return;
        }

        return {
            file: {
                name: picked.name,
                absolutePath: picked.absolutePath,
                relativePath: picked.relativePath,
            },
            selection: undefined,
        };
    }

    private async executeAddContext(currentContext?: RovoDevContext): Promise<void> {
        // Get all workspace files
        const picked = await this.selectContextItem();
        if (!picked) {
            return;
        }

        // Do nothing if the new item is already present in the context
        if (
            currentContext?.focusInfo?.file.absolutePath === picked.file.absolutePath ||
            currentContext?.contextItems?.some((item) => item.file.absolutePath === picked.file.absolutePath)
        ) {
            return;
        }

        return await this.addContextItem(picked);
    }

    public async executeNewSession(): Promise<void> {
        const webview = this._webView!;

        // special handling for when the Rovo Dev process has been terminated
        if (this._processState === RovoDevProcessState.Terminated) {
            this._processState = RovoDevProcessState.Starting;
            RovoDevProcessManager.initializeRovoDev(this._context);

            await webview.postMessage({
                type: RovoDevProviderMessageType.ClearChat,
            });

            return;
        }

        // new session is a no-op if there are no folders opened or if the process is not initialized
        if (
            this.isDisabled ||
            !workspace.workspaceFolders?.length ||
            !this._initialized ||
            this._chatProvider.pendingCancellation
        ) {
            return;
        }

        await this.executeApiWithErrorHandling(async (client) => {
            // in case there is an ongoing stream, we must cancel it
            await webview.postMessage({
                type: RovoDevProviderMessageType.ForceStop,
            });
            try {
                const cancelled = await this._chatProvider.executeCancel(true);
                if (!cancelled) {
                    return;
                }
            } catch {
                return false;
            }

            const sessionId = await client.createSession();
            this._revertedChanges = [];

            await webview.postMessage({
                type: RovoDevProviderMessageType.ClearChat,
            });

            return this.beginNewSession(sessionId, true);
        }, false);
    }

    private async executeHealthcheck(): Promise<boolean> {
        return (await this.rovoDevApiClient?.healthcheck()) || false;
    }

    private async executeHealthcheckInfo(): Promise<RovoDevHealthcheckResponse | undefined> {
        try {
            return await this.rovoDevApiClient?.healtcheckInfo();
        } catch {
            return undefined;
        }
    }

    private makeRelativePathAbsolute(filePath: string): string {
        if (path.isAbsolute(filePath)) {
            // If already absolute, use as-is
            return filePath;
        } else {
            // If relative, resolve against workspace root
            const workspaceRoot = workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                throw new Error('No workspace folder found');
            }
            return path.join(workspaceRoot, filePath);
        }
    }

    private async executeOpenFile(
        filePath: string,
        tryShowDiff: boolean,
        _range?: number[],
        createOnFail?: boolean,
    ): Promise<void> {
        let cachedFilePath: string | undefined = undefined;

        if (tryShowDiff) {
            try {
                cachedFilePath = await this.rovoDevApiClient?.getCacheFilePath(filePath);
            } catch {}
        }

        // Get workspace root and resolve the file path
        const resolvedPath = this.makeRelativePathAbsolute(filePath);

        if (cachedFilePath && fs.existsSync(cachedFilePath)) {
            commands.executeCommand(
                'vscode.diff',
                Uri.file(cachedFilePath),
                Uri.file(resolvedPath),
                `${filePath} (Rovo Dev)`,
            );
        } else {
            let range: Range | undefined;
            if (_range && Array.isArray(_range)) {
                const startPosition = new Position(_range[0], 0);
                const endPosition = new Position(_range[1], 0);
                range = new Range(startPosition, endPosition);
            }

            const fileUri = Uri.file(resolvedPath);
            try {
                await window.showTextDocument(fileUri, {
                    preview: true,
                    selection: range || undefined,
                });
            } catch (error) {
                if (createOnFail) {
                    await getFsPromise((callback) => fs.writeFile(resolvedPath, '', callback));
                    await window.showTextDocument(fileUri, {
                        preview: true,
                        selection: range || undefined,
                    });
                } else {
                    throw new Error(
                        `Unable to open file: ${resolvedPath}. ${error instanceof Error ? error.message : ''}`,
                    );
                }
            }
        }
    }

    private async executeUndoFiles(files: ModifiedFile[]) {
        const promises = files.map(async (file) => {
            const resolvedPath = this.makeRelativePathAbsolute(file.filePath);
            await getFsPromise((callback) => fs.rm(resolvedPath, { force: true }, callback));

            if (file.type !== 'create') {
                const cachedFilePath = await this.rovoDevApiClient!.getCacheFilePath(file.filePath);
                await getFsPromise((callback) => fs.copyFile(cachedFilePath, resolvedPath, callback));
                await getFsPromise((callback) => fs.rm(cachedFilePath, callback));
            }
        });

        await Promise.all(promises);

        const paths = files.map((x) => x.filePath);
        this._revertedChanges.push(...paths);

        this._telemetryProvider.fireTelemetryEvent(
            'rovoDevFileChangedActionEvent',
            this._chatProvider.currentPromptId,
            'undo',
            files.length,
        );
    }

    private async executeKeepFiles(files: ModifiedFile[]) {
        const promises = files.map(async (file) => {
            const cachedFilePath = await this.rovoDevApiClient!.getCacheFilePath(file.filePath);
            await getFsPromise((callback) => fs.rm(cachedFilePath, callback));
        });

        await Promise.all(promises);

        this._telemetryProvider.fireTelemetryEvent(
            'rovoDevFileChangedActionEvent',
            this._chatProvider.currentPromptId,
            'keep',
            files.length,
        );
    }

    public async executeTriggerFeedback() {
        const webview = this._webView!;

        await webview.postMessage({
            type: RovoDevProviderMessageType.ShowFeedbackForm,
        });
    }

    private async createPR(commitMessage?: string, branchName?: string): Promise<void> {
        const prHandler = this._prHandler!;

        let prLink: string | undefined;
        const webview = this._webView!;
        try {
            if (!commitMessage || !branchName) {
                throw new Error('Commit message and branch name are required to create a PR');
            }
            prLink = await prHandler.createPR(branchName, commitMessage);

            await webview.postMessage({
                type: RovoDevProviderMessageType.CreatePRComplete,
                data: {
                    url: prLink,
                },
            });
        } catch (e) {
            await this.processError(e, false);

            const errorMessage = e.message;
            const gitErrorCode = e.gitErrorCode;

            await webview.postMessage({
                type: RovoDevProviderMessageType.CreatePRComplete,
                data: {
                    error: e.message
                        ? `${errorMessage}${gitErrorCode ? ` (Error code: ${gitErrorCode})` : ''}`
                        : 'Unknown error occurred while creating PR',
                },
            });
        }
    }

    private async getCurrentBranchName(): Promise<void> {
        const webview = this._webView!;
        const prHandler = this._prHandler!;

        try {
            const branchName = await prHandler.getCurrentBranchName();
            await webview.postMessage({
                type: RovoDevProviderMessageType.GetCurrentBranchNameComplete,
                data: {
                    branchName,
                },
            });
        } catch (e) {
            await this.processError(e, false);
        }
    }

    private async executeApiWithErrorHandling<T>(
        func: (client: RovoDevApiClient) => Promise<T>,
        isErrorRetriable: boolean,
    ): Promise<T | void> {
        if (this.rovoDevApiClient) {
            try {
                return await func(this.rovoDevApiClient);
            } catch (error) {
                await this.processError(error, isErrorRetriable);
            }
        } else {
            await this.processError(new Error('RovoDev client not initialized'), false);
        }
    }

    public async invokeRovoDevAskCommand(prompt: string, context?: RovoDevContext): Promise<void> {
        if (this.isDisabled) {
            return;
        }

        // focus on the specific vscode view
        commands.executeCommand('atlascode.views.rovoDev.webView.focus');

        // Wait for the webview to initialize, up to 5 seconds
        const initialized = await this.waitFor(() => !!this._webView, 5000, 50);
        if (!initialized) {
            console.error('Webview is not initialized after waiting.');
            return;
        }

        // Actually invoke the rovodev service, feed responses to the webview as normal
        const revertedChanges = this._revertedChanges;
        this._revertedChanges = [];
        await this._chatProvider.executeChat({ text: prompt, enable_deep_plan: false, context }, revertedChanges);
    }

    /**
     * Adds a context item to the RovoDev webview. Intended for external calls, e.g. commands
     * @param contextItem The context item to add.
     * @returns A promise that resolves when the context item has been added.
     */
    public async addToContext(contextItem: RovoDevContextItem): Promise<void> {
        if (!this.isDisabled) {
            return;
        }

        const webView = this._webView!;
        webView.postMessage({
            type: RovoDevProviderMessageType.ContextAdded,
            context: contextItem,
        });
    }

    private async waitFor(
        check: () => Promise<boolean> | boolean,
        timeoutMs: number,
        interval: number,
        abortIf?: () => boolean,
    ): Promise<boolean> {
        if (abortIf?.()) {
            return false;
        }

        let result = await check();
        while (!result && timeoutMs) {
            await setTimeout(interval);
            if (abortIf?.()) {
                return false;
            }

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

    /**
     * Sends an error message to the chat history instead of showing a VS Code notification
     * @param errorMessage The error message to display in chat
     */
    public sendErrorToChat(errorMessage: string) {
        return this.processError(new Error(errorMessage), false);
    }

    public signalInitializing() {
        const webView = this._webView!;
        return webView.postMessage({
            type: RovoDevProviderMessageType.SetInitState,
            newState: RovoDevInitState.NotInitialized,
        });
    }

    public signalBinaryDownloadStarted() {
        const webView = this._webView!;
        return webView.postMessage({
            type: RovoDevProviderMessageType.SetInitState,
            newState: RovoDevInitState.UpdatingBinaries,
        });
    }

    public signalBinaryDownloadEnded() {
        const webView = this._webView!;
        return webView.postMessage({
            type: RovoDevProviderMessageType.SetInitState,
            newState: RovoDevInitState.NotInitialized,
        });
    }

    public async signalProcessStarted(rovoDevPort: number) {
        // initialize the API client
        const rovoDevHost = process.env[rovodevInfo.envVars.host] || 'localhost';
        this._rovoDevApiClient = new RovoDevApiClient(rovoDevHost, rovoDevPort);

        // enable the 'show terminal' button only when in debugging
        setCommandContext(CommandContext.RovoDevTerminalEnabled, Container.isDebugging);

        const webView = this._webView!;

        await webView.postMessage({
            type: RovoDevProviderMessageType.ClearChat,
        });

        // wait for Rovo Dev to be ready, for up to 10 seconds
        const result = await this.waitFor(
            () => this.executeHealthcheck(),
            100000,
            500,
            () => !this.rovoDevApiClient,
        );

        // if the client becomes undefined, it means the process terminated while we were polling the healtcheck
        if (!this._rovoDevApiClient) {
            return;
        }

        let thrownError: Error | undefined = undefined;

        try {
            if (result) {
                const info = await this.executeHealthcheckInfo();
                const sessionId = (info || {}).sessionId || null;
                this.beginNewSession(sessionId, false);
            } else {
                // TODO - this scenario needs a better handling
                throw new Error(
                    `Unable to initialize RovoDev at "${this._rovoDevApiClient.baseApiUrl}". Service wasn't ready within 10000ms`,
                );
            }
        } catch (error) {
            thrownError = error;
        }

        this._initialized = true;
        this._processState = RovoDevProcessState.Started;

        await webView.postMessage({
            type: RovoDevProviderMessageType.SetInitState,
            newState: RovoDevInitState.Initialized,
        });

        if (thrownError) {
            await this.processError(thrownError, false);
        } else {
            await this._chatProvider.setReady(this._rovoDevApiClient);
        }

        if (this.isBoysenberry) {
            await this._chatProvider.executeReplay();
        }

        // extra sanity checks here

        if (!this.appInstanceId) {
            await this.processError(new Error('AppSessionID is not defined.'), false, false);
        }
    }

    public signalRovoDevDisabled(reason: 'needAuth' | 'other') {
        this._processState = RovoDevProcessState.Disabled;

        const webView = this._webView!;
        return webView.postMessage({
            type: RovoDevProviderMessageType.RovoDevDisabled,
            reason,
        });
    }

    public signalDownloadProgress(downloadedBytes: number, totalBytes: number) {
        const webView = this._webView!;
        return webView.postMessage({
            type: RovoDevProviderMessageType.SetDownloadProgress,
            downloadedBytes,
            totalBytes,
        });
    }

    public signalProcessTerminated(errorMessage?: string) {
        if (this._processState === RovoDevProcessState.Terminated) {
            return;
        }

        this.signalRovoDevDisabled('other');

        this._processState = RovoDevProcessState.Terminated;
        this._initialized = false;
        this._rovoDevApiClient = undefined;

        errorMessage = errorMessage
            ? `Agent process terminated:\n${errorMessage}\n\nPlease start a new chat session to continue.`
            : 'Agent process terminated.\nPlease start a new chat session to continue.';

        const error = new Error(errorMessage);
        return this.processError(error, false, true);
    }

    public async shutdownRovoDev() {
        await this.rovoDevApiClient?.shutdown();
        await this.signalProcessTerminated();
    }
}
