import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import * as fs from 'fs';
import path from 'path';
import { CommandContext, setCommandContext } from 'src/commandContext';
import { configuration } from 'src/config/configuration';
import { getFsPromise } from 'src/util/fsPromises';
import { safeWaitFor } from 'src/util/waitFor';
import { v4 } from 'uuid';
import {
    CancellationToken,
    commands,
    ConfigurationChangeEvent,
    Disposable,
    env,
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
import { RovoDevLogger } from '../../src/logger';
import { DetailedSiteInfo } from '../atlclients/authInfo';
import { Commands } from '../constants';
import {
    ModifiedFile,
    RovoDevViewResponse,
    RovoDevViewResponseType,
} from '../react/atlascode/rovo-dev/rovoDevViewMessages';
import { modifyFileTitleMap } from '../react/atlascode/rovo-dev/utils';
import { GitErrorCodes } from '../typings/git';
import { getHtmlForView } from '../webview/common/getHtmlForView';
import { RovoDevApiClient } from './rovoDevApiClient';
import { RovoDevHealthcheckResponse } from './rovoDevApiClientInterfaces';
import { RovoDevChatProvider } from './rovoDevChatProvider';
import { RovoDevContentTracker } from './rovoDevContentTracker';
import { RovoDevDwellTracker } from './rovoDevDwellTracker';
import { RovoDevFeedbackManager } from './rovoDevFeedbackManager';
import { RovoDevJiraItemsProvider } from './rovoDevJiraItemsProvider';
import { RovoDevProcessManager, RovoDevProcessState } from './rovoDevProcessManager';
import { RovoDevPullRequestHandler } from './rovoDevPullRequestHandler';
import { RovoDevTelemetryProvider } from './rovoDevTelemetryProvider';
import { RovoDevContextItem } from './rovoDevTypes';
import {
    RovoDevDisabledReason,
    RovoDevEntitlementCheckFailedDetail,
    RovoDevProviderMessage,
    RovoDevProviderMessageType,
} from './rovoDevWebviewProviderMessages';

interface TypedWebview<MessageOut, MessageIn> extends Webview {
    readonly onDidReceiveMessage: Event<MessageIn>;
    postMessage(message: MessageOut): Thenable<boolean>;
}

// this map sets the priority level of Disabled states
// higher priority can override lower priority
const RovoDevDisabledPriority: Record<RovoDevDisabledReason | 'none', number> = {
    none: 0,
    Other: 1,
    EntitlementCheckFailed: 2,
    NeedAuth: 3,
    NoWorkspaceOpen: 4,
    UnsupportedArch: 5,
};

export class RovoDevWebviewProvider extends Disposable implements WebviewViewProvider {
    private readonly viewType = 'atlascodeRovoDev';
    private readonly isBoysenberry = Container.isBoysenberryMode;
    private readonly appInstanceId: string;

    private readonly _prHandler: RovoDevPullRequestHandler | undefined;
    private readonly _telemetryProvider: RovoDevTelemetryProvider;
    private readonly _jiraItemsProvider: RovoDevJiraItemsProvider;
    private readonly _chatProvider: RovoDevChatProvider;

    private _webView?: TypedWebview<RovoDevProviderMessage, RovoDevViewResponse>;
    private _webviewView?: WebviewView;
    private _rovoDevApiClient?: RovoDevApiClient;
    private _isProviderDisabled = false;
    private _disabledReason: RovoDevDisabledReason | 'none' = 'none';
    private _webviewReady = false;
    private _debugPanelEnabled = false;
    private _debugPanelContext: Record<string, string> = {};
    private _debugPanelMcpContext: Record<string, string> = {};

    // we keep the data in this collection so we can attach some metadata to the next
    // prompt informing Rovo Dev that those files has been reverted
    private _revertedChanges: string[] = [];

    private _disposables: Disposable[] = [];

    private _dwellTracker?: RovoDevDwellTracker;
    private _contentTracker?: RovoDevContentTracker;

    private _extensionPath: string;
    private _extensionUri: Uri;

    private _context: ExtensionContext;

    private get rovoDevApiClient() {
        return this._rovoDevApiClient;
    }

    private getYoloModeStorageKey(): string {
        // Use a global key for YOLO mode across all workspaces
        return 'yoloMode_global';
    }

    private async loadYoloModeFromStorage(): Promise<boolean> {
        if (this.isBoysenberry) {
            return true;
        }

        const key = this.getYoloModeStorageKey();
        const stored = this._context.workspaceState.get<boolean>(key);
        return stored ?? false;
    }

    private async saveYoloModeToStorage(enabled: boolean): Promise<void> {
        if (this.isBoysenberry) {
            return;
        }

        const key = this.getYoloModeStorageKey();
        await this._context.workspaceState.update(key, enabled);
    }

    public get isReady(): boolean {
        return !!this._webviewReady;
    }

    public get isVisible(): boolean {
        return this._webviewView?.visible ?? false;
    }

    public get isDisabled(): boolean {
        return this.processState === 'Disabled' || this.processState === 'Terminated';
    }

    private get processState(): RovoDevProcessState['state'] {
        return RovoDevProcessManager.state.state;
    }

    constructor(context: ExtensionContext, extensionPath: string) {
        super(() => {
            this._dispose();
        });

        this._extensionPath = extensionPath;
        this._extensionUri = Uri.file(this._extensionPath);
        this._context = context;
        this._debugPanelEnabled = Container.config.rovodev.debugPanelEnabled;

        // Register the webview view provider
        this._disposables.push(
            window.registerWebviewViewProvider('atlascode.views.rovoDev.webView', this, {
                webviewOptions: { retainContextWhenHidden: true },
            }),
            configuration.onDidChange(this.onConfigurationChanged, this),
        );

        // Register editor listeners
        this._registerEditorListeners();

        if (this.isBoysenberry) {
            this._prHandler = new RovoDevPullRequestHandler();
            this.appInstanceId = process.env.ROVODEV_SANDBOX_ID as string;
        } else {
            this.appInstanceId = Container.appInstanceId;
        }

        const onTelemetryError = Container.isDebugging
            ? (error: Error) => this.processError(error)
            : (error: Error) => RovoDevLogger.error(error);

        this._telemetryProvider = new RovoDevTelemetryProvider(
            this.isBoysenberry ? 'Boysenberry' : 'IDE',
            this.appInstanceId,
            onTelemetryError,
        );

        this._chatProvider = new RovoDevChatProvider(this.isBoysenberry, this._telemetryProvider);

        this.loadYoloModeFromStorage().then((yoloMode) => {
            this._chatProvider.yoloMode = yoloMode;
        });

        this._jiraItemsProvider = new RovoDevJiraItemsProvider();
        this._jiraItemsProvider.onNewJiraItems((issues) => this.sendJiraItemsToView(issues));

        this._disposables.push(this._jiraItemsProvider);
    }

    private onConfigurationChanged(e: ConfigurationChangeEvent): void {
        if (configuration.changed(e, 'rovodev.debugPanelEnabled')) {
            this._debugPanelEnabled = Container.config.rovodev.debugPanelEnabled;
            this.refreshDebugPanel(true);
        }
        if (configuration.changed(e, 'rovodev.thinkingBlockEnabled')) {
            this.refreshThinkingBlock();
        }
    }

    private async refreshDebugPanel(force?: boolean) {
        if (this._debugPanelEnabled || force) {
            const fullProcessState = RovoDevProcessManager.state;
            this._debugPanelContext['ProcessState'] = fullProcessState.state;
            if (fullProcessState.state === 'Disabled') {
                this._debugPanelContext['ProcessState'] += ' / ' + fullProcessState.subState;
            }

            await this._webView?.postMessage({
                type: RovoDevProviderMessageType.SetDebugPanel,
                enabled: this._debugPanelEnabled,
                context: this._debugPanelContext,
                mcpContext: this._debugPanelMcpContext,
            });
        }
    }

    private async refreshThinkingBlock() {
        const thinkingBlockEnabled = Container.config.rovodev.thinkingBlockEnabled;

        await this._webView?.postMessage({
            type: RovoDevProviderMessageType.SetThinkingBlockEnabled,
            enabled: thinkingBlockEnabled,
        });
    }

    public resolveWebviewView(
        webviewView: WebviewView,
        _context: WebviewViewResolveContext,
        _token: CancellationToken,
    ): Thenable<void> | void {
        this._webView = webviewView.webview;
        this._webviewView = webviewView;
        // grab the webview from the instance field, so it's properly typed
        const webview = this._webView;

        this._chatProvider.setWebview(webview);

        webview.options = {
            enableCommandUris: true,
            enableScripts: true,
            localResourceRoots: [
                Uri.file(path.join(this._extensionPath, 'images')),
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
                    case RovoDevViewResponseType.Refresh:
                        // this message is being sent from messagingApi.ts
                        break;

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
                        await this.executeAddContext();
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
                        if (!this._prHandler) {
                            await webview.postMessage({
                                type: RovoDevProviderMessageType.CheckGitChangesComplete,
                                hasChanges: false,
                            });
                            break;
                        }
                        const hasChanges = await this._prHandler.hasChangesOrUnpushedCommits();
                        await webview.postMessage({
                            type: RovoDevProviderMessageType.CheckGitChangesComplete,
                            hasChanges: hasChanges,
                        });
                        break;

                    case RovoDevViewResponseType.FilterModifiedFilesByContent:
                        await this.executeFilterModifiedFilesByContent(e.files);
                        break;

                    case RovoDevViewResponseType.ReportThinkingDrawerExpanded:
                        this._telemetryProvider.fireTelemetryEvent(
                            'rovoDevDetailsExpandedEvent',
                            this._chatProvider.currentPromptId,
                        );
                        break;
                    case RovoDevViewResponseType.ReportCreatePrButtonClicked:
                        this._telemetryProvider.fireTelemetryEvent(
                            'rovoDevCreatePrButtonClickedEvent',
                            this._chatProvider.currentPromptId,
                        );
                        break;

                    case RovoDevViewResponseType.WebviewReady:
                        this._webviewReady = true;
                        this.refreshDebugPanel(true);
                        this.refreshThinkingBlock();

                        if (!this.isBoysenberry) {
                            // listen to change of process state by the process manager
                            RovoDevProcessManager.onStateChanged((newState) =>
                                this.handleProcessStateChanged(newState),
                            );

                            if (!workspace.workspaceFolders?.length) {
                                await this.signalRovoDevDisabled('NoWorkspaceOpen');
                                break;
                            } else {
                                const yoloMode = await this.loadYoloModeFromStorage();
                                await webview.postMessage({
                                    type: RovoDevProviderMessageType.ProviderReady,
                                    workspacePath: workspace.workspaceFolders?.[0]?.uri.fsPath,
                                    homeDir: process.env.HOME || process.env.USERPROFILE,
                                    yoloMode: yoloMode,
                                });
                            }
                        }

                        // initialize (or refresh) the provider based on the current process state
                        this.handleProcessStateChanged(RovoDevProcessManager.state);
                        break;

                    case RovoDevViewResponseType.GetAgentMemory:
                        await this.executeOpenFile('.agent.md', false, undefined, true);
                        break;

                    case RovoDevViewResponseType.TriggerFeedback:
                        await this.executeTriggerFeedback();
                        break;

                    case RovoDevViewResponseType.SendFeedback:
                        await RovoDevFeedbackManager.submitFeedback(
                            {
                                feedbackType: e.feedbackType,
                                feedbackMessage: e.feedbackMessage,
                                canContact: e.canContact,
                                lastTenMessages: e.lastTenMessages,
                                rovoDevSessionId: process.env.SANDBOX_SESSION_ID,
                            },
                            !!this.isBoysenberry,
                        );
                        break;

                    case RovoDevViewResponseType.LaunchJiraAuth:
                        await commands.executeCommand(Commands.JiraAPITokenLogin);
                        break;

                    case RovoDevViewResponseType.OpenFolder:
                        await commands.executeCommand(Commands.WorkbenchOpenFolder);
                        break;

                    case RovoDevViewResponseType.McpConsentChoiceSubmit:
                        if (e.choice === 'acceptAll') {
                            await this.acceptMcpServer(true);
                        } else {
                            await this.acceptMcpServer(false, e.serverName!, e.choice);
                        }
                        break;

                    case RovoDevViewResponseType.CheckFileExists:
                        await this.checkFileExists(e.filePath, e.requestId);
                        break;

                    case RovoDevViewResponseType.ToolPermissionChoiceSubmit:
                        if (e.choice === 'allowAll') {
                            await this._chatProvider.signalToolRequestAllowAll();
                            break;
                        }
                        await this._chatProvider.signalToolRequestChoiceSubmit(e.toolCallId, e.choice);
                        break;

                    case RovoDevViewResponseType.YoloModeToggled:
                        this._chatProvider.yoloMode = e.value;
                        this.saveYoloModeToStorage(e.value);
                        break;

                    case RovoDevViewResponseType.OpenExternalLink:
                        await env.openExternal(Uri.parse(e.href));
                        break;
                    default:
                        // @ts-expect-error ts(2339) - e here should be 'never'
                        this.processError(new Error(`Unknown message type: ${e.type}`));
                        break;
                }
            } catch (error) {
                await this.processError(error);
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
            await this.removeContextItem(true);
            return;
        }

        const fileInfo = this.getOpenFileInfo(editor.document);
        if (fileInfo.absolutePath !== '' && fs.existsSync(fileInfo.absolutePath)) {
            const fileSelection =
                selection && !selection.isEmpty ? { start: selection.start.line, end: selection.end.line } : undefined;

            await this.addContextItem({
                isFocus: true,
                file: fileInfo,
                selection: fileSelection,
                enabled: true,
            });
        }
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
        {
            title,
            isRetriable,
            isProcessTerminated,
            skipLogError,
        }: {
            title?: string;
            isRetriable?: boolean;
            isProcessTerminated?: boolean;
            skipLogError?: boolean;
        } = {},
    ) {
        if (!skipLogError) {
            RovoDevLogger.error(error);
        }

        const webview = this._webView!;
        return webview.postMessage({
            type: RovoDevProviderMessageType.ShowDialog,
            message: {
                event_kind: '_RovoDevDialog',
                type: 'error',
                text: `${error.message}${error.gitErrorCode ? `\n ${error.gitErrorCode}` : ''}`,
                title,
                isRetriable,
                isProcessTerminated,
                uid: v4(),
            },
        });
    }

    private sendJiraItemsToView(issues: MinimalIssue<DetailedSiteInfo>[] | undefined) {
        if (!this._webView) {
            return;
        }

        return this._webView.postMessage({
            type: RovoDevProviderMessageType.SetJiraWorkItems,
            issues,
        });
    }

    private addContextItem(contextItem: RovoDevContextItem): Thenable<boolean> {
        const webview = this._webView!;
        return webview.postMessage({
            type: RovoDevProviderMessageType.ContextAdded,
            context: contextItem,
        });
    }

    private removeContextItem(isFocus: true): Thenable<boolean>;
    private removeContextItem(isFocus: false, contextItem: RovoDevContextItem): Thenable<boolean>;
    private removeContextItem(isFocus: boolean, contextItem?: RovoDevContextItem): Thenable<boolean> {
        const webview = this._webView!;

        if (isFocus) {
            return webview.postMessage({
                type: RovoDevProviderMessageType.ContextRemoved,
                isFocus,
            });
        } else {
            return webview.postMessage({
                type: RovoDevProviderMessageType.ContextRemoved,
                isFocus,
                context: contextItem!,
            });
        }
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
            isFocus: false,
            file: {
                name: picked.name,
                absolutePath: picked.absolutePath,
                relativePath: picked.relativePath,
            },
            selection: undefined,
            enabled: true,
        };
    }

    private async executeAddContext(): Promise<void> {
        // Get all workspace files
        const picked = await this.selectContextItem();
        if (!picked) {
            return;
        }

        await this.addContextItem(picked);
    }

    public async executeNewSession(): Promise<void> {
        const webview = this._webView!;

        // new session is disabled for these process states,
        // of if there are no folders open,
        // or a cancellation is in progress
        if (
            this.processState === 'NotStarted' ||
            this.processState === 'Starting' ||
            this.processState === 'Downloading' ||
            this.processState === 'Disabled' ||
            !workspace.workspaceFolders?.length ||
            this._chatProvider.pendingCancellation
        ) {
            return;
        }

        // special handling for when the Rovo Dev process has been terminated, or failed to initialize
        if (
            this.processState === 'Terminated' ||
            this.processState === 'DownloadingFailed' ||
            this.processState === 'StartingFailed'
        ) {
            this.refreshDebugPanel();

            await webview.postMessage({
                type: RovoDevProviderMessageType.ClearChat,
            });

            await RovoDevProcessManager.initializeRovoDev(this._context, true);
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

    private async executeHealthcheckInfo(): Promise<RovoDevHealthcheckResponse | undefined> {
        let info: RovoDevHealthcheckResponse | undefined = undefined;
        try {
            info = await this.rovoDevApiClient?.healthcheck();
        } catch {}

        this._debugPanelMcpContext = {};

        if (info && info.mcp_servers) {
            for (const mcpServer in info.mcp_servers) {
                this._debugPanelMcpContext[mcpServer] = info.mcp_servers[mcpServer];
            }
        }

        this._debugPanelContext['RovoDevHealthcheck'] = info?.status || '???';
        this.refreshDebugPanel();

        return info;
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

    private async checkFileExists(filePath: string, requestId: string): Promise<void> {
        const webview = this._webView!;

        try {
            const resolvedPath = this.makeRelativePathAbsolute(filePath);
            const exists = fs.existsSync(resolvedPath);

            await webview.postMessage({
                type: RovoDevProviderMessageType.CheckFileExistsComplete,
                requestId,
                filePath,
                exists,
            });
        } catch {
            await webview.postMessage({
                type: RovoDevProviderMessageType.CheckFileExistsComplete,
                requestId,
                filePath,
                exists: false,
            });
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
            this._dwellTracker?.startDwellTimer();
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
                this._dwellTracker?.startDwellTimer();
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

    private async executeFilterModifiedFilesByContent(files: ModifiedFile[]) {
        const webview = this._webView!;

        if (!this._contentTracker) {
            // If content tracker is not available, return all files (fallback behavior)
            await webview.postMessage({
                type: RovoDevProviderMessageType.FilterModifiedFilesByContentComplete,
                filteredFiles: files,
            });
            return;
        }

        try {
            const filePaths = files.map((file) => file.filePath);
            const filesWithContentChanges = await this._contentTracker.filterFilesWithChanges(filePaths);

            const filteredFiles = files.filter(
                (file) =>
                    filesWithContentChanges.includes(file.filePath) ||
                    file.type === modifyFileTitleMap.created.type ||
                    file.type === modifyFileTitleMap.deleted.type,
            );

            await webview.postMessage({
                type: RovoDevProviderMessageType.FilterModifiedFilesByContentComplete,
                filteredFiles: filteredFiles,
            });
        } catch (error) {
            // On error, return all files
            RovoDevLogger.debug('Error filtering files by content:', error);
            await webview.postMessage({
                type: RovoDevProviderMessageType.FilterModifiedFilesByContentComplete,
                filteredFiles: files,
            });
        }
    }

    private async createPR(commitMessage?: string, branchName?: string): Promise<void> {
        const prHandler = this._prHandler;

        let prLink: string | undefined;
        const webview = this._webView!;
        try {
            if (!branchName || branchName.trim() === '') {
                throw new Error('Branch name is required to create a PR');
            }

            prLink = await prHandler!.createPR(branchName, commitMessage);

            await webview.postMessage({
                type: RovoDevProviderMessageType.CreatePRComplete,
                data: {
                    url: prLink,
                },
            });
        } catch (e) {
            await this.processError(e);

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
        const webview = this._webView;
        const prHandler = this._prHandler;

        try {
            if (!webview) {
                throw new Error('Webview not initialized');
            }
            const branchName = await prHandler!.getCurrentBranchName();
            await webview.postMessage({
                type: RovoDevProviderMessageType.GetCurrentBranchNameComplete,
                data: {
                    branchName,
                },
            });
        } catch (e) {
            await this.processError(e);
        }
    }

    private async executeApiWithErrorHandling<T>(
        func: (client: RovoDevApiClient) => Promise<T>,
        isRetriable: boolean,
    ): Promise<T | void> {
        if (this.rovoDevApiClient) {
            try {
                return await func(this.rovoDevApiClient);
            } catch (error) {
                await this.processError(error, { isRetriable });
            }
        } else {
            await this.processError(new Error('RovoDev client not initialized'));
        }
    }

    public async invokeRovoDevAskCommand(prompt: string, context?: RovoDevContextItem[]): Promise<void> {
        // Always focus on the specific vscode view, even if disabled (so user can see the login prompt)
        commands.executeCommand('atlascode.views.rovoDev.webView.focus');

        // Wait for the webview to initialize, up to 5 seconds
        const initialized = await safeWaitFor({
            condition: (value) => !!value,
            check: () => !!this._webView,
            timeout: 5000,
            interval: 50,
        });

        if (!initialized) {
            return;
        }

        // If disabled, we still want to show the webview but don't execute the chat
        // The webview will show the appropriate login prompt
        if (this.isDisabled) {
            return;
        }

        // Actually invoke the rovodev service, feed responses to the webview as normal
        const revertedChanges = this._revertedChanges;
        this._revertedChanges = [];
        await this._chatProvider.executeChat(
            { text: prompt, enable_deep_plan: false, context: context || [] },
            revertedChanges,
        );
    }

    /**
     * Adds a context item to the RovoDev webview. Intended for external calls, e.g. commands
     * @param contextItem The context item to add.
     * @returns A promise that resolves when the context item has been added.
     */
    public async addToContext(contextItem: RovoDevContextItem): Promise<void> {
        if (this.isDisabled) {
            return;
        }

        const webView = this._webView!;
        webView.postMessage({
            type: RovoDevProviderMessageType.ContextAdded,
            context: contextItem,
        });
    }

    /**
     * Sets the text in the prompt input field with focus, using the same reliable approach as invokeRovoDevAskCommand
     * @param text The text to set in the prompt input field
     */
    public async setPromptTextWithFocus(text: string): Promise<void> {
        // Focus and wait for webview to be ready to receive messages
        commands.executeCommand('atlascode.views.rovoDev.webView.focus');

        const webview = await safeWaitFor({
            condition: (value) => !!value,
            check: () => (this._webviewReady ? this._webView : undefined),
            timeout: 5000,
            interval: 50,
        });

        if (webview) {
            webview.postMessage({
                type: RovoDevProviderMessageType.SetPromptText,
                text,
            });
        }
    }

    private _dispose() {
        this._disposables.forEach((d) => d.dispose());
        this._disposables = [];
        if (this._webView) {
            this._webView = undefined;
        }
    }

    private async acceptMcpServer(acceptAll: true): Promise<void>;
    private async acceptMcpServer(acceptAll: false, serverName: string, decision: 'accept' | 'deny'): Promise<void>;
    private async acceptMcpServer(
        acceptAll: boolean,
        serverName?: string,
        decision?: 'accept' | 'deny',
    ): Promise<void> {
        if (acceptAll) {
            await this.rovoDevApiClient!.acceptMcpTerms(true);
        } else {
            await this.rovoDevApiClient!.acceptMcpTerms(serverName!, decision!);
        }

        await this.initializeWithHealthcheck(10000);
    }

    private async handleProcessStateChanged(newState: RovoDevProcessState) {
        if (newState.state === 'Downloading' || newState.state === 'Starting' || newState.state === 'Started') {
            this._jiraItemsProvider.setJiraSite(newState.jiraSiteHostname);
        }

        const webview = this._webView!;

        switch (newState.state) {
            case 'NotStarted':
            case 'Starting':
                this._isProviderDisabled = false;
                await webview.postMessage({
                    type: RovoDevProviderMessageType.SetInitializing,
                    isPromptPending: this._chatProvider.isPromptPending,
                });
                break;

            case 'Downloading':
                await webview.postMessage({
                    type: RovoDevProviderMessageType.SetDownloadProgress,
                    isPromptPending: this._chatProvider.isPromptPending,
                    totalBytes: newState.totalBytes,
                    downloadedBytes: newState.downloadedBytes,
                });
                break;

            case 'DownloadingFailed':
                this.signalProcessFailedToInitialize('Unable to update Rovo Dev.');
                break;

            case 'StartingFailed':
                this.signalProcessFailedToInitialize('Unable to start Rovo Dev.');
                break;

            case 'Started':
                await this.signalProcessStarted(newState.hostname, newState.httpPort);
                break;

            case 'Terminated':
                this.signalProcessTerminated(newState.exitCode);
                break;

            case 'Disabled':
                this.signalRovoDevDisabled(newState.subState, newState.entitlementDetail);
                break;

            case 'Boysenberry':
                if (!newState.httpPort) {
                    this.handleProcessStateChanged({ state: 'Disabled', subState: 'Other' });
                    throw new Error('Rovo Dev port not set');
                } else {
                    this.signalProcessStarted(newState.hostname, newState.httpPort);
                }
                break;

            default:
                // @ts-expect-error ts(2339) - newState here should be 'never'
                this.processError(`Unknown process state: ${newState.state}`);
                break;
        }
    }

    private signalProcessStarted(hostname: string, rovoDevPort: number) {
        // initialize the API client
        this._rovoDevApiClient = new RovoDevApiClient(hostname, rovoDevPort);

        this._debugPanelContext['RovoDevAddress'] = `http://${hostname}:${rovoDevPort}`;
        this.refreshDebugPanel();

        // enable the 'show terminal' button only when in debugging
        setCommandContext(CommandContext.RovoDevTerminalEnabled, !this.isBoysenberry && Container.isDebugging);

        return this.initializeWithHealthcheck();
    }

    // timeout defaulted to 1 minute.
    // yes, 1 minute is huge, but Rovo Dev has been acting weird with extremely delayed start-ups recently.
    private async initializeWithHealthcheck(timeout = 60000) {
        const result = await safeWaitFor({
            condition: (info) => !!info && info.status !== 'unknown',
            check: () => this.executeHealthcheckInfo(),
            timeout,
            interval: 500,
            abortIf: () => !this.rovoDevApiClient,
        });

        const webView = this._webView!;
        const rovoDevClient = this._rovoDevApiClient;

        // if the client becomes undefined, it means the process terminated while we were polling the healtcheck
        if (!rovoDevClient) {
            delete this._debugPanelContext['RovoDevAddress'];
            delete this._debugPanelContext['RovoDevHealthcheck'];
            this.refreshDebugPanel();
            return;
        }

        // if result is undefined, it means we didn't manage to contact Rovo Dev within the allotted time
        // TODO - this scenario needs a better handling
        if (!result || result.status === 'unknown') {
            const msg = result ? 'Rovo Dev service is unhealthy/unknown.' : 'Rovo Dev service is unreachable.';
            RovoDevLogger.error(new Error(msg));

            if (this.isBoysenberry) {
                await this.signalRovoDevDisabled('Other');
                await this.processError(new Error(`${msg}\rTry closing and reopening the session to retry.`), {
                    title: 'Failed to initialize Rovo Dev',
                    skipLogError: true,
                });
            } else {
                await this.signalProcessFailedToInitialize(msg);
            }
            return;
        }

        // if result is unhealthy, it means Rovo Dev has failed during initialization (e.g., some MCP servers failed to start)
        // we can't continue - shutdown and set the process as terminated so the user can try again.
        if (result.status === 'unhealthy') {
            const msg = 'Rovo Dev service is unhealthy.';
            RovoDevLogger.error(new Error(msg));

            if (this.isBoysenberry) {
                await this.signalRovoDevDisabled('Other');
                await this.processError(
                    new Error(`Rovo Dev service is unhealthy.\nTry closing and reopening the session to retry.`),
                    { title: 'Failed to initialize Rovo Dev', skipLogError: true },
                );
            } else {
                await this.signalProcessFailedToInitialize();
            }
            return;
        }

        // this scenario is when the user is not allowed to run Rovo Dev because it's disabled by the Jira administrator
        if (result.status === 'entitlement check failed') {
            if (this.isBoysenberry) {
                await this.signalRovoDevDisabled('Other');
                await this.processError(
                    new Error(`${result.detail.payload.message}\nCode: ${result.detail.payload.status}`),
                    {
                        title: result.detail.payload.title || 'Entitlement check failed',
                        skipLogError: true,
                    },
                );
            } else {
                await this.signalRovoDevDisabled('EntitlementCheckFailed', result.detail);
            }
            return;
        }

        // this scenario is when the user needs to accept/decline the usage of some MCP server before Rovo Dev can start
        if (result.status === 'pending user review') {
            const mcp_servers = result.mcp_servers || {};
            const serversToReview = Object.keys(mcp_servers).filter((x) => mcp_servers[x] === 'pending user review');

            if (this.isBoysenberry) {
                await this.signalRovoDevDisabled('Other');
                await this.processError(
                    new Error(`Cannot start third party MCP servers:${serversToReview.map((name) => `\n- ${name}`)}`),
                    { title: 'Failed to initialize Rovo Dev', skipLogError: true },
                );
            } else {
                if (serversToReview.length === 0) {
                    await this.signalProcessFailedToInitialize(
                        'Failed to initialize Rovo Dev, something went wrong with the MCP servers acceptance flow.',
                    );
                } else {
                    await webView.postMessage({
                        type: RovoDevProviderMessageType.SetMcpAcceptanceRequired,
                        isPromptPending: this._chatProvider.isPromptPending,
                        mcpIds: serversToReview,
                    });
                }
            }

            return;
        }

        // make sure the only possible state left is 'healthy'
        if (result.status !== 'healthy') {
            // @ts-expect-error ts(2339) - result.status here should be 'never'
            throw new Error(`Invalid healthcheck's response: "${result.status.toString()}".`);
        }

        this.beginNewSession(result.sessionId || null, false);

        this.refreshDebugPanel();

        await webView.postMessage({
            type: RovoDevProviderMessageType.RovoDevReady,
            isPromptPending: this._chatProvider.isPromptPending,
        });

        await this._chatProvider.setReady(rovoDevClient);

        if (this.isBoysenberry) {
            // Initialize global dwell tracker now that API client exists
            this._dwellTracker?.dispose();
            this._dwellTracker = new RovoDevDwellTracker(
                this._telemetryProvider,
                () => this._chatProvider.currentPromptId,
                this._rovoDevApiClient,
            );
            await this._chatProvider.executeReplay();
        }

        // Initialize content tracker with the API client
        this._contentTracker?.dispose();
        this._contentTracker = new RovoDevContentTracker(this._rovoDevApiClient);

        // extra sanity checks here

        if (!this.appInstanceId) {
            await this.processError(new Error('AppSessionID is not defined.'));
        }
    }

    private async signalRovoDevDisabled(
        reason: RovoDevDisabledReason,
        detail?: RovoDevEntitlementCheckFailedDetail,
    ): Promise<void> {
        // skip if the current disabled priority is same or higher
        if (RovoDevDisabledPriority[this._disabledReason] >= RovoDevDisabledPriority[reason]) {
            return;
        }
        this._isProviderDisabled = true;

        this.setRovoDevTerminated();

        const webView = this._webView!;
        await webView.postMessage({
            type: RovoDevProviderMessageType.RovoDevDisabled,
            reason,
            detail,
        });
    }

    private async signalProcessFailedToInitialize(errorMessage?: string) {
        if (this._isProviderDisabled) {
            return;
        }
        this._isProviderDisabled = true;

        this.setRovoDevTerminated();

        const title = 'Failed to start Rovo Dev';

        errorMessage = errorMessage
            ? `${errorMessage}\nPlease start a new chat session to try again.`
            : 'Please start a new chat session to try again.';

        const error = new Error(errorMessage);
        // we assume that the real error has been logged somehwere else, so we don't log this one
        await this.processError(error, { title, isProcessTerminated: true, skipLogError: true });
    }

    private async signalProcessTerminated(code?: number) {
        if (this._isProviderDisabled) {
            return;
        }
        this._isProviderDisabled = true;

        this.setRovoDevTerminated();

        const title = 'Agent process terminated';
        const errorMessage =
            typeof code === 'number'
                ? `Rovo Dev process terminated with exit code ${code}.\nPlease start a new chat session to continue.`
                : 'Please start a new chat session to continue.';

        const error = new Error(errorMessage);
        // we assume that the real error has been logged somehwere else, so we don't log this one
        await this.processError(error, { title, isProcessTerminated: true, skipLogError: true });
    }

    // Disabled and Terminated states are almost identical, except that
    // with Terminated you can restart Rovo Dev with the [+] button,
    // and with Disabled you can't.
    private setRovoDevTerminated(): Promise<void> {
        this._rovoDevApiClient = undefined;
        this._chatProvider.shutdown();
        this._telemetryProvider.shutdown();
        this._dwellTracker?.dispose();
        this._dwellTracker = undefined;
        this._contentTracker?.dispose();
        this._contentTracker = undefined;

        return this.refreshDebugPanel();
    }
}
