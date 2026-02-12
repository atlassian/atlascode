import * as fs from 'fs';
import path from 'path';
import { setCommandContext } from 'src/commandContext';
import { Logger } from 'src/logger';
import { UserInfo } from 'src/rovo-dev/api/extensionApiTypes';
import { getFsPromise } from 'src/rovo-dev/util/fsPromises';
import { safeWaitFor } from 'src/rovo-dev/util/waitFor';
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
    Uri,
    Webview,
    WebviewView,
    WebviewViewProvider,
    WebviewViewResolveContext,
    window,
    workspace,
} from 'vscode';

import { GitErrorCodes } from '../typings/git';
import { RovodevCommandContext, RovodevCommands } from './api/componentApi';
import { DetailedSiteInfo, ExtensionApi, MinimalIssue } from './api/extensionApi';
import { AgentMode, RovoDevApiClient, RovoDevApiError, RovoDevHealthcheckResponse } from './client';
import { buildErrorDetails } from './errorDetailsBuilder';
import { createValidatedRovoDevAuthInfo } from './rovoDevAuthValidator';
import { RovoDevChatContextProvider } from './rovoDevChatContextProvider';
import { RovoDevChatProvider } from './rovoDevChatProvider';
import { RovoDevContentTracker } from './rovoDevContentTracker';
import { RovoDevDwellTracker } from './rovoDevDwellTracker';
import { RovoDevFeedbackManager } from './rovoDevFeedbackManager';
import { RovoDevJiraItemsProvider } from './rovoDevJiraItemsProvider';
import { RovoDevProcessManager, RovoDevProcessState } from './rovoDevProcessManager';
import { RovoDevPullRequestHandler } from './rovoDevPullRequestHandler';
import { RovoDevSessionManager } from './rovoDevSessionManager';
import { RovoDevTelemetryProvider } from './rovoDevTelemetryProvider';
import { RovoDevContextItem } from './rovoDevTypes';
import { readLastNLogLines } from './rovoDevUtils';
import {
    RovoDevDisabledReason,
    RovoDevEntitlementCheckFailedDetail,
    RovoDevProviderMessage,
    RovoDevProviderMessageType,
    RovoDevWebviewState,
} from './rovoDevWebviewProviderMessages';
import { ModifiedFile, RovoDevViewResponse, RovoDevViewResponseType } from './ui/rovoDevViewMessages';
import { modifyFileTitleMap } from './ui/utils';

export interface TypedWebview<MessageOut, MessageIn> extends Webview {
    readonly onDidReceiveMessage: Event<MessageIn>;
    postMessage(message: MessageOut): Thenable<boolean>;
}

// this map sets the priority level of Disabled states
// higher priority can override lower priority
const RovoDevDisabledPriority: Record<RovoDevDisabledReason | 'none', number> = {
    none: 0,
    Other: 1,
    EntitlementCheckFailed: 2,
    UnauthorizedAuth: 3,
    NeedAuth: 4,
    NoWorkspaceOpen: 5,
    UnsupportedArch: 6,
};

export class RovoDevWebviewProvider extends Disposable implements WebviewViewProvider {
    private readonly extensionApi = new ExtensionApi();

    private readonly viewType = 'atlascodeRovoDev';
    private readonly isBoysenberry = this.extensionApi.metadata.isBoysenberry();
    private readonly appInstanceId: string;

    private readonly _prHandler: RovoDevPullRequestHandler | undefined;
    private readonly _telemetryProvider: RovoDevTelemetryProvider;
    private readonly _jiraItemsProvider: RovoDevJiraItemsProvider;
    private readonly _chatProvider: RovoDevChatProvider;
    private readonly _chatContextprovider: RovoDevChatContextProvider;

    private _webView?: TypedWebview<RovoDevProviderMessage, RovoDevViewResponse>;
    private _webviewView?: WebviewView;
    private _rovoDevApiClient?: RovoDevApiClient;
    private _isProviderDisabled = false;
    private _disabledReason: RovoDevDisabledReason | 'none' = 'none';
    private _webviewReady = false;
    private _isFirstResolve = true;
    private _yoloMode = false;
    private _savedState: RovoDevWebviewState | undefined = undefined;
    private _debugPanelEnabled = false;
    private _debugPanelContext: Record<string, string> = {};
    private _debugPanelMcpContext: Record<string, string> = {};

    private _userInfo: UserInfo | undefined;
    private _userEmail: string | undefined;

    // we keep the data in this collection so we can attach some metadata to the next
    // prompt informing Rovo Dev that those files has been reverted
    private _revertedChanges: string[] = [];

    /** Agent mode selected by the user before healthcheck completed; applied after setReady. */
    private _pendingAgentMode?: AgentMode;

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

    private loadYoloModeFromStorage(): boolean {
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
        this._debugPanelEnabled = this.extensionApi.config.isDebugPanelEnabled();

        // Register the webview view provider
        this._disposables.push(
            window.registerWebviewViewProvider('atlascode.views.rovoDev.webView', this, {
                webviewOptions: { retainContextWhenHidden: true },
            }),
            this.extensionApi.config.onDidChange(this.onConfigurationChanged, this),
        );

        // Register editor listeners
        this._registerEditorListeners();

        if (this.isBoysenberry) {
            this._prHandler = new RovoDevPullRequestHandler();
            this.appInstanceId = process.env.ROVODEV_SANDBOX_ID as string;
        } else {
            this.appInstanceId = this.extensionApi.metadata.appInstanceId();
        }

        this._telemetryProvider = new RovoDevTelemetryProvider(
            this.isBoysenberry ? 'Boysenberry' : 'IDE',
            this.appInstanceId,
        );

        this._chatProvider = new RovoDevChatProvider(this.isBoysenberry, this._telemetryProvider);
        this._chatContextprovider = new RovoDevChatContextProvider();

        this._yoloMode = this.loadYoloModeFromStorage();
        this._chatProvider.yoloMode = this._yoloMode;

        this._jiraItemsProvider = new RovoDevJiraItemsProvider();
        this._jiraItemsProvider.onNewJiraItems((issues) => this.sendJiraItemsToView(issues));

        this._disposables.push(this._jiraItemsProvider);
    }

    private onConfigurationChanged(e: ConfigurationChangeEvent): void {
        if (this.extensionApi.config.changed(e, 'rovodev.debugPanelEnabled')) {
            this._debugPanelEnabled = this.extensionApi.config.isDebugPanelEnabled();
            this.refreshDebugPanel(true);
        }
        if (this.extensionApi.config.changed(e, 'rovodev.thinkingBlockEnabled')) {
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
        const thinkingBlockEnabled = this.extensionApi.config.isThinkingBlockEnabled();

        await this._webView?.postMessage({
            type: RovoDevProviderMessageType.SetThinkingBlockEnabled,
            enabled: thinkingBlockEnabled,
        });
    }

    public resolveWebviewView(
        webviewView: WebviewView,
        context: WebviewViewResolveContext,
        _token: CancellationToken,
    ): Thenable<void> | void {
        // Only restore state if this is not the first resolve (i.e., drag-and-drop, not VS Code window reload or restart)
        if (!this._isFirstResolve && context.state) {
            this._savedState = context.state as RovoDevWebviewState;
        }
        this._isFirstResolve = false;

        this._webView = webviewView.webview;
        this._webviewView = webviewView;
        // grab the webview from the instance field, so it's properly typed
        const webview = this._webView;

        this._chatProvider.setWebview(webview);
        this._chatContextprovider.setWebview(webview);

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

        webview.html = this.extensionApi.getHtmlForView({
            extensionPath: this._extensionPath,
            cspSource: webview.cspSource,
            viewId: this.viewType,
            baseUri: webview.asWebviewUri(this._extensionUri),
            stylesUri: codiconsUri,
        });

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
                        await this._chatContextprovider.forceUserFocusUpdate();
                        break;

                    case RovoDevViewResponseType.AddContext:
                        if (e.contextItem) {
                            await this._chatContextprovider.addContextItem(e.contextItem);
                        } else if (e.dragDropData) {
                            await this._chatContextprovider.processDragDropData(e.dragDropData);
                        } else {
                            await this._chatContextprovider.executeAddContext();
                        }
                        break;

                    case RovoDevViewResponseType.RemoveContext:
                        await this._chatContextprovider.removeContextItem(e.item);
                        break;

                    case RovoDevViewResponseType.ToggleContextFocus:
                        await this._chatContextprovider.toggleFocusedContextFile(e.enabled);
                        break;

                    case RovoDevViewResponseType.ReportChangedFilesPanelShown:
                        this._telemetryProvider.fireTelemetryEvent({
                            action: 'rovoDevFilesSummaryShown',
                            subject: 'atlascode',
                            attributes: {
                                promptId: this._chatProvider.currentPromptId,
                                filesCount: e.filesCount,
                            },
                        });
                        break;

                    case RovoDevViewResponseType.ReportChangesGitPushed:
                        this._telemetryProvider.fireTelemetryEvent({
                            action: 'rovoDevGitPushAction',
                            subject: 'atlascode',
                            attributes: {
                                promptId: this._chatProvider.currentPromptId,
                                prCreated: e.pullRequestCreated,
                            },
                        });
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
                        this._telemetryProvider.fireTelemetryEvent({
                            subject: 'atlascode',
                            action: 'rovoDevDetailsExpanded',
                            attributes: {
                                promptId: this._chatProvider.currentPromptId,
                            },
                        });
                        break;
                    case RovoDevViewResponseType.ReportCreatePrButtonClicked:
                        this._telemetryProvider.fireTelemetryEvent({
                            subject: 'rovoDevCreatePrButton',
                            action: 'clicked',
                            attributes: {
                                promptId: this._chatProvider.currentPromptId,
                            },
                        });
                        break;

                    case RovoDevViewResponseType.WebviewReady:
                        this._webviewReady = true;
                        this.refreshDebugPanel(true);
                        this.refreshThinkingBlock();

                        if (this._savedState) {
                            await webview.postMessage({
                                type: RovoDevProviderMessageType.RestoreState,
                                state: this._savedState,
                            });
                            this._savedState = undefined;
                        }

                        if (!this.isBoysenberry) {
                            // listen to change of process state by the process manager
                            RovoDevProcessManager.onStateChanged(async (newState) => {
                                try {
                                    await this.handleProcessStateChanged(newState);
                                } catch (error) {
                                    await this.processError(error);
                                }
                            });

                            if (!workspace.workspaceFolders?.length) {
                                await this.signalRovoDevDisabled('NoWorkspaceOpen');
                                break;
                            }
                        }

                        // ack the Webview Ready event, and provide host information
                        await this.sendProviderReadyEvent(this._userInfo?.email || this._userEmail);

                        // initialize (or refresh) the provider based on the current process state
                        await this.handleProcessStateChanged(RovoDevProcessManager.state);
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
                            this._userInfo,
                            !!this.isBoysenberry,
                        );
                        break;

                    case RovoDevViewResponseType.LaunchJiraAuth:
                        await this.extensionApi.commands.showUserAuthentication({
                            openApiTokenLogin: !!e.openApiTokenLogin,
                        });
                        break;

                    case RovoDevViewResponseType.SubmitRovoDevAuth:
                        await this.handleRovoDevAuth(e.host, e.email, e.apiToken);
                        break;

                    case RovoDevViewResponseType.OpenFolder:
                        await this.extensionApi.commands.openFolder();
                        break;

                    case RovoDevViewResponseType.OpenJira:
                        await this.extensionApi.jira.showIssue(e.url);
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
                        this._yoloMode = e.value;
                        await this.saveYoloModeToStorage(e.value);
                        break;

                    case RovoDevViewResponseType.FullContextModeToggled:
                        this._chatProvider.fullContextMode = e.value;
                        break;

                    case RovoDevViewResponseType.GetAvailableAgentModes:
                        const modes = await this._chatProvider.getAvailableAgentModes();
                        await webview.postMessage({
                            type: RovoDevProviderMessageType.GetAvailableAgentModesComplete,
                            modes: modes || [],
                        });
                        break;

                    case RovoDevViewResponseType.GetCurrentAgentMode:
                        const mode = await this._chatProvider.getCurrentAgentMode();
                        await webview.postMessage({
                            type: RovoDevProviderMessageType.GetCurrentAgentModeComplete,
                            mode: mode || 'default',
                        });
                        break;

                    case RovoDevViewResponseType.SetAgentMode:
                        if (!this._chatProvider.isReady()) {
                            this._pendingAgentMode = e.mode;
                            await webview.postMessage({
                                type: RovoDevProviderMessageType.SetAgentModeComplete,
                                mode: e.mode,
                            });
                        } else {
                            await this._chatProvider.setAgentMode(e.mode);
                            await webview.postMessage({
                                type: RovoDevProviderMessageType.SetAgentModeComplete,
                                mode: e.mode,
                            });
                        }
                        break;

                    case RovoDevViewResponseType.OpenExternalLink:
                        await env.openExternal(Uri.parse(e.href));
                        break;

                    case RovoDevViewResponseType.OpenRovoDevLogFile:
                        await commands.executeCommand(RovodevCommands.OpenRovoDevLogFile);
                        break;

                    case RovoDevViewResponseType.StartNewSession:
                        await this.executeNewSession();
                        break;

                    case RovoDevViewResponseType.RestartProcess:
                        await this.executeRestartProcess();
                        break;

                    case RovoDevViewResponseType.MessageRendered:
                        this._chatProvider.signalMessageRendered(e.promptId);
                        break;

                    case RovoDevViewResponseType.ReportRenderError:
                        const renderError = new Error(`Render Error: ${e.errorMessage}`);
                        renderError.name = e.errorType;
                        // Build detailed error context
                        const errorDetails: string[] = [];
                        if (e.errorStack) {
                            errorDetails.push(`Error Stack:\n${e.errorStack}`);
                        }
                        if (e.componentStack) {
                            errorDetails.push(`Component Stack:\n${e.componentStack}`);
                        }
                        const contextMessage =
                            errorDetails.length > 0
                                ? `Type: ${e.errorType}\n${errorDetails.join('\n\n')}`
                                : `Type: ${e.errorType}`;

                        RovoDevTelemetryProvider.logError(renderError, contextMessage);
                        break;

                    case RovoDevViewResponseType.ShowSessionHistory:
                        await this.showSessionHistory();
                        break;

                    case RovoDevViewResponseType.FetchSavedPrompts:
                        const prompts = await this.fetchSavedPrompts();

                        await webview.postMessage({
                            type: RovoDevProviderMessageType.UpdateSavedPrompts,
                            savedPrompts: prompts,
                        });
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

    private async sendProviderReadyEvent(userEmail: string | undefined) {
        const yoloMode = this._yoloMode;

        await this._webView!.postMessage({
            type: RovoDevProviderMessageType.ProviderReady,
            isAtlassianUser: !!userEmail?.endsWith('@atlassian.com'),
            workspacePath: workspace.workspaceFolders?.[0]?.uri.fsPath,
            homeDir: process.env.HOME || process.env.USERPROFILE,
            yoloMode,
        });

        // Send existing Jira credentials for autocomplete
        await this.sendExistingJiraCredentials();
    }

    /**
     * Fetches agent modes asynchronously and sends them to the frontend when ready.
     * This is called during startup to improve initialization performance.
     */
    private async fetchAgentModes(): Promise<void> {
        if (!this._chatProvider || !this._webView) {
            return;
        }

        try {
            const [availableModes, currentAgentMode] = await Promise.all([
                this._chatProvider.getAvailableAgentModes(),
                this._chatProvider.getCurrentAgentMode(),
            ]);

            await this._webView.postMessage({
                type: RovoDevProviderMessageType.GetAvailableAgentModesComplete,
                modes: availableModes || [],
            });

            await this._webView.postMessage({
                type: RovoDevProviderMessageType.GetCurrentAgentModeComplete,
                mode: currentAgentMode || 'default',
            });
        } catch (error) {
            Logger.error(error, 'Failed to fetch agent modes');
        }
    }

    private beginNewSession(sessionId: string | null, source: 'init' | 'manuallyCreated' | 'restored'): void {
        this._telemetryProvider.startNewSession(sessionId ?? v4(), source);
    }

    // Listen to active editor and selection changes
    private _registerEditorListeners() {
        // Listen for active editor changes
        this._disposables.push(
            window.onDidChangeActiveTextEditor((editor) => {
                if (!this.extensionApi.metadata.isRovoDevEnabled()) {
                    return;
                }
                this._chatContextprovider.forceUserFocusUpdate(editor);
            }),
        );
        // Listen for selection changes
        this._disposables.push(
            window.onDidChangeTextEditorSelection((event) => {
                if (!this.extensionApi.metadata.isRovoDevEnabled()) {
                    return;
                }
                this._chatContextprovider.forceUserFocusUpdate(event.textEditor);
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
            RovoDevTelemetryProvider.logError(error);
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
                stackTrace: buildErrorDetails(error),
                stderr: (error as any).stderr,
                rovoDevLogs: readLastNLogLines(),
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

    public async showSessionHistory(): Promise<void> {
        const workspacePath = workspace.workspaceFolders?.[0]?.uri.fsPath;

        if (!this.isBoysenberry && this.rovoDevApiClient && workspacePath) {
            const sessionsManager = new RovoDevSessionManager(
                workspacePath,
                this.rovoDevApiClient,
                this._telemetryProvider,
            );
            sessionsManager.onSessionRestored(async (sessionId) => {
                await this._chatProvider.clearChat();
                this.beginNewSession(sessionId, 'restored');
                await this._chatProvider.executeReplay();
            });
            await sessionsManager.showPicker();
        }
    }

    private async sendExistingJiraCredentials(): Promise<void> {
        if (!this._webView) {
            return;
        }

        try {
            const credentials = await this.extensionApi.auth.getCredentialHints();

            await this._webView.postMessage({
                type: RovoDevProviderMessageType.SetExistingJiraCredentials,
                credentials,
            });
        } catch (error) {
            // Silently fail - autocomplete is a nice-to-have feature
            RovoDevTelemetryProvider.logError(error, 'Failed to fetch credential hints for autocomplete');
        }
    }

    private async sendExpiredRovoDevCredentials(): Promise<void> {
        if (!this._webView) {
            return;
        }

        try {
            const rovoDevAuth = await this.extensionApi.auth.getRovoDevAuthInfo();
            if (rovoDevAuth && rovoDevAuth.user?.email) {
                const rovoDevAuthWithHost = rovoDevAuth as any;

                if (rovoDevAuthWithHost.host) {
                    await this._webView.postMessage({
                        type: RovoDevProviderMessageType.SetExistingJiraCredentials,
                        credentials: [
                            {
                                host: rovoDevAuthWithHost.host,
                                email: rovoDevAuth.user.email,
                            },
                        ],
                    });
                }
            }
        } catch (error) {
            // Silently fail - pre-filling is a nice-to-have feature
            Logger.warn(error, 'Failed to fetch expired RovoDev credentials for pre-fill');
        }
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

            return this.beginNewSession(sessionId, 'manuallyCreated');
        }, false);
    }

    /**
     * Restart the Rovo Dev process by aborting any ongoing operations,
     * shutting down the current process, and re-initializing it.
     */
    public async executeRestartProcess(): Promise<void> {
        const webview = this._webView!;

        await webview.postMessage({
            type: RovoDevProviderMessageType.ForceStop,
        });

        this._chatProvider.executeAbortSignal();

        this._chatProvider.shutdown();

        await RovoDevProcessManager.initializeRovoDev(this._context, true);

        this.refreshDebugPanel();
        await webview.postMessage({
            type: RovoDevProviderMessageType.ClearChat,
        });

        this._revertedChanges = [];
        return this._telemetryProvider.fireTelemetryEvent({
            action: 'rovoDevRestartProcessAction',
            subject: 'atlascode',
            attributes: {}, // no additional attributes
        });
    }

    private async executeHealthcheckInfo(): Promise<{ httpStatus: number; data?: RovoDevHealthcheckResponse }> {
        let data: RovoDevHealthcheckResponse | undefined = undefined;
        let httpStatus = 0;
        try {
            data = await this.rovoDevApiClient?.healthcheck();
            httpStatus = 200;
        } catch (e) {
            if (e instanceof RovoDevApiError) {
                httpStatus = e.httpStatus;
            }
        }

        this._debugPanelMcpContext = {};

        if (data && data.mcp_servers) {
            for (const mcpServer in data.mcp_servers) {
                this._debugPanelMcpContext[mcpServer] = data.mcp_servers[mcpServer];
            }
        }

        this._debugPanelContext['RovoDevHealthcheck'] = data?.status || (httpStatus ? `HTTP ${httpStatus}` : '???');
        this.refreshDebugPanel();

        return { httpStatus, data };
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

    private async handleRovoDevAuth(host: string, email: string, apiToken: string): Promise<void> {
        const webview = this._webView!;

        try {
            // Send validating status to UI
            await webview.postMessage({
                type: RovoDevProviderMessageType.RovoDevAuthValidating,
            });

            // Validate credentials and create AuthInfo (will throw on failure)
            const authInfo = await createValidatedRovoDevAuthInfo(host, email, apiToken);

            // Save to RovoDev credential store
            await this.extensionApi.auth.saveRovoDevAuthInfo(authInfo);

            // Send success status to UI
            await webview.postMessage({
                type: RovoDevProviderMessageType.RovoDevAuthValidationComplete,
                success: true,
            });

            // Trigger process restart to use new credentials
            await RovoDevProcessManager.initializeRovoDev(this._context, true);
        } catch (error) {
            RovoDevTelemetryProvider.logError(error, 'Error saving RovoDev auth');
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

            // Send error status to UI
            await webview.postMessage({
                type: RovoDevProviderMessageType.RovoDevAuthValidationComplete,
                success: false,
                error: errorMessage,
            });
        }
    }

    private async handleRovoDevLogout(): Promise<void> {
        try {
            // Clear RovoDev auth info from credential store
            await this.extensionApi.auth.removeRovoDevAuthInfo();

            // Trigger process refresh to reinitialize without credentials
            await RovoDevProcessManager.initializeRovoDev(this._context, true);

            window.showInformationMessage('Logged out from Rovo Dev');
        } catch (error) {
            RovoDevTelemetryProvider.logError(error, 'Error logging out from RovoDev');
            window.showErrorMessage(`Failed to logout: ${error}`);
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
            await this.extensionApi.commands.showDiff({
                left: Uri.file(cachedFilePath),
                right: Uri.file(resolvedPath),
                title: `${filePath} (Rovo Dev)`,
            });
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

        this._telemetryProvider.fireTelemetryEvent({
            action: 'rovoDevFileChangedAction',
            subject: 'atlascode',
            attributes: {
                promptId: this._chatProvider.currentPromptId,
                action: 'undo',
                filesCount: files.length,
            },
        });
    }

    private async executeKeepFiles(files: ModifiedFile[]) {
        const promises = files.map(async (file) => {
            const cachedFilePath = await this.rovoDevApiClient!.getCacheFilePath(file.filePath);
            await getFsPromise((callback) => fs.rm(cachedFilePath, callback));
        });

        await Promise.all(promises);

        this._telemetryProvider.fireTelemetryEvent({
            action: 'rovoDevFileChangedAction',
            subject: 'atlascode',
            attributes: {
                promptId: this._chatProvider.currentPromptId,
                action: 'keep',
                filesCount: files.length,
            },
        });
    }

    public async executeTriggerFeedback() {
        const webview = this._webView!;

        await webview.postMessage({
            type: RovoDevProviderMessageType.ShowFeedbackForm,
        });
    }

    public async executeRovoDevLogout() {
        const webview = this._webView!;

        await webview.postMessage({
            type: RovoDevProviderMessageType.SetInitializing,
            isPromptPending: false,
        });

        await this.handleRovoDevLogout();
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
            Logger.debug('Error filtering files by content:', error);
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
            const gitErrorCode = e.gitErrorCode;

            // Don't log user configuration/input errors - these are expected and user needs to fix them
            const isUserConfigError =
                gitErrorCode === GitErrorCodes.NoUserNameConfigured ||
                gitErrorCode === GitErrorCodes.NoUserEmailConfigured ||
                e.message?.includes('Commit message is required') ||
                e.message?.includes('Branch name is required');

            await this.processError(e, { skipLogError: isUserConfigError });

            const errorMessage = e.message;

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
        await this.extensionApi.commands.focusRovodevView();

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
    public addToContext(contextItem: RovoDevContextItem) {
        return this._chatContextprovider.addContextItem(contextItem);
    }

    /**
     * Sets the text in the prompt input field with focus, using the same reliable approach as invokeRovoDevAskCommand
     * @param text The text to set in the prompt input field
     */
    public async setPromptTextWithFocus(text: string, contextItem?: RovoDevContextItem): Promise<void> {
        // Focus and wait for webview to be ready to receive messages
        await this.extensionApi.commands.focusRovodevView();

        const webview = await safeWaitFor({
            condition: (value) => !!value,
            check: () => (this._webviewReady ? this._webView : undefined),
            timeout: 5000,
            interval: 50,
        });

        if (webview) {
            if (contextItem) {
                this._chatContextprovider.addContextItem(contextItem);
            }

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
            this._userInfo = newState.jiraSiteUserInfo;
            this._jiraItemsProvider.setJiraSite(newState.jiraSiteHostname);

            if (this._webviewReady) {
                // refresh the isAtlassianUser flag
                await this.sendProviderReadyEvent(newState.jiraSiteUserInfo.email);
            }
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
                await this.signalProcessFailedToInitialize('Unable to update Rovo Dev.');
                break;

            case 'StartingFailed':
                await this.signalProcessFailedToInitialize('Unable to start Rovo Dev.');
                break;

            case 'Started':
                await this.signalProcessStarted(
                    newState.hostname,
                    newState.httpPort,
                    newState.sessionToken,
                    newState.pid,
                );
                break;

            case 'Terminated':
                await this.signalProcessTerminated(newState.exitCode, newState.stderr);
                break;

            case 'Disabled':
                await this.signalRovoDevDisabled(newState.subState, newState.entitlementDetail);
                break;

            case 'Boysenberry':
                if (!newState.httpPort) {
                    await this.handleProcessStateChanged({ state: 'Disabled', subState: 'Other' });
                    throw new Error('Rovo Dev port not set');
                } else {
                    await this.signalProcessStarted(newState.hostname, newState.httpPort, newState.sessionToken);
                }
                break;

            default:
                // @ts-expect-error ts(2339) - newState here should be 'never'
                await this.processError(`Unknown process state: ${newState.state}`);
                break;
        }
    }

    private signalProcessStarted(hostname: string, rovoDevPort: number, sessionToken: string, pid?: number) {
        // initialize the API client
        this._rovoDevApiClient = new RovoDevApiClient(hostname, rovoDevPort, sessionToken);

        if (pid) {
            this._debugPanelContext['PID'] = `${pid}`;
        }

        this._debugPanelContext['RovoDevAddress'] = `http://${hostname}:${rovoDevPort}`;
        this._debugPanelContext['SessionToken'] = sessionToken;
        this.refreshDebugPanel();

        // enable the 'show terminal' button only when in debugging
        this.extensionApi.commands.setCommandContext(
            RovodevCommandContext.RovoDevTerminalEnabled,
            !this.isBoysenberry && this.extensionApi.metadata.isDebugging(),
        );

        return this.initializeWithHealthcheck();
    }

    // timeout defaulted to 1 minute.
    // yes, 1 minute is huge, but Rovo Dev has been acting weird with extremely delayed start-ups recently.
    private async initializeWithHealthcheck(timeout = 60000) {
        const healthcheckResult = await safeWaitFor({
            check: () => this.executeHealthcheckInfo(),
            condition: (response) =>
                !!response?.httpStatus &&
                (Math.floor(response.httpStatus / 100) === 2 || Math.floor(response.httpStatus / 100) === 4) &&
                !!response.data &&
                response.data.status !== 'unknown',
            timeout,
            interval: 500,
            abortIf: () => !this.rovoDevApiClient,
        });

        const webView = this._webView!;
        const rovoDevClient = this._rovoDevApiClient;

        // if the client becomes undefined, it means the process terminated while we were polling the healtcheck
        if (!rovoDevClient) {
            delete this._debugPanelContext['RovoDevAddress'];
            delete this._debugPanelContext['SessionToken'];
            delete this._debugPanelContext['RovoDevHealthcheck'];
            this.refreshDebugPanel();
            return;
        }

        const result = healthcheckResult?.data;

        // if result is undefined, it means we didn't manage to contact Rovo Dev within the allotted time
        // TODO - this scenario needs a better handling
        if (!result || result.status === 'unknown') {
            let msg = result ? 'Rovo Dev service is unhealthy/unknown.' : 'Rovo Dev service is unreachable.';
            if (healthcheckResult?.httpStatus) {
                msg += ` HTTP status code ${healthcheckResult?.httpStatus}.`;
            }

            RovoDevTelemetryProvider.logError(new Error(msg));

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
            RovoDevTelemetryProvider.logError(new Error(msg));

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

        setCommandContext(RovodevCommandContext.RovoDevApiReady, true);
        this.beginNewSession(result.sessionId || null, 'init');

        this.refreshDebugPanel();

        await webView.postMessage({
            type: RovoDevProviderMessageType.RovoDevReady,
            isPromptPending: this._chatProvider.isPromptPending,
        });

        await this._chatProvider.setReady(rovoDevClient, this._pendingAgentMode);
        if (this._pendingAgentMode) {
            await webView.postMessage({
                type: RovoDevProviderMessageType.SetAgentModeComplete,
                mode: this._pendingAgentMode,
            });
            this._pendingAgentMode = undefined;
        }

        await this.fetchAgentModes();

        if (this.isBoysenberry) {
            // update the isAtlassianUser flag based on Rovo Dev status response
            // this is intentionally not awaiting because the API is pretty slow
            this.rovoDevApiClient
                ?.status()
                .then((response) => {
                    this._userEmail = response.account.email;
                    if (this._webviewReady) {
                        this.sendProviderReadyEvent(response.account.email);
                    }
                })
                .catch((error) => this.processError(error));

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

        // If the reason is UnauthorizedAuth, send expired credentials for pre-filling the form
        if (reason === 'UnauthorizedAuth') {
            await this.sendExpiredRovoDevCredentials();
        }

        const webView = this._webView!;
        await webView.postMessage({
            type: RovoDevProviderMessageType.RovoDevDisabled,
            reason,
            detail,
        });
    }

    private async fetchSavedPrompts(): Promise<
        { name: string; description: string; content_file: string }[] | undefined
    > {
        try {
            const response = await this.rovoDevApiClient?.getSavedPrompts();

            if (!response) {
                return;
            }

            return response.prompts;
        } catch (error) {
            RovoDevTelemetryProvider.logError(error, 'Failed to fetch saved prompts');
            return undefined;
        }
    }

    // keeps track of predefined errors based on retrieved error messages within the stack trace
    private getRefinedInitializationErrorMessage(errorMessage?: string): string | undefined {
        const errorMap: { [key: string]: string } = {
            'Retrieved 0 total sites':
                'Sign up for Rovo Dev at https://www.atlassian.com/try/cloud/signup?bundle=devai',
            'Found 0 sites with active Rovo Dev SKU':
                'No Atlassian sites with active Rovo Dev found. Please contact your administrator or sign up for Rovo Dev at https://www.atlassian.com/try/cloud/signup?bundle=devai',
            'Entitlement Check Failed':
                'To use Rovo Dev in IDE, ask your administrator to add Rovo Dev to your organization.',
        };

        if (errorMessage) {
            for (const [key, value] of Object.entries(errorMap)) {
                if (errorMessage.includes(key)) {
                    return value;
                }
            }
        }

        return undefined;
    }

    private async signalProcessFailedToInitialize(errorMessage?: string) {
        if (this._isProviderDisabled) {
            return;
        }
        this._isProviderDisabled = true;

        this.setRovoDevTerminated();

        const title = 'Failed to start Rovo Dev';
        const refinedErrorMessage = this.getRefinedInitializationErrorMessage(errorMessage);
        if (!refinedErrorMessage) {
            errorMessage = errorMessage
                ? `${errorMessage}\nPlease start a new chat session to try again.`
                : 'Please start a new chat session to try again.';
        } else {
            errorMessage = refinedErrorMessage;
        }
        const error = new Error(errorMessage);

        // we assume that the real error has been logged somehwere else, so we don't log this one
        await this.processError(error, { title, isProcessTerminated: true, skipLogError: true });
    }

    private async signalProcessTerminated(code?: number, stderr?: string) {
        if (this._isProviderDisabled) {
            return;
        }

        // Check if this is an unauthorized error (expired/invalid credentials)
        if (stderr && stderr.includes('UnauthorizedError')) {
            // First check if user has valid Jira credentials - these can be used seamlessly
            const primarySite = await this.extensionApi.auth.getCloudPrimaryAuthSite();
            if (primarySite && primarySite.authInfo.user?.email) {
                // User has valid Jira credentials with API token - RovoDev can use them
                // Don't disable RovoDev, let it continue with these credentials
                return;
            }

            // No valid Jira credentials, show login UI
            await this.signalRovoDevDisabled('UnauthorizedAuth');
            return;
        }

        this._isProviderDisabled = true;

        this.setRovoDevTerminated();

        const title = 'Agent process terminated';

        let errorMessage = this.getRefinedInitializationErrorMessage(stderr);
        if (!errorMessage) {
            errorMessage =
                typeof code === 'number'
                    ? `Rovo Dev process terminated with exit code ${code}.\nPlease start a new chat session to continue.`
                    : 'Please start a new chat session to continue.';
        }
        const error = new Error(errorMessage);

        // Include stderr if available
        if (stderr && stderr.trim()) {
            (error as any).stderr = stderr.trim();
        }

        // we assume that the real error has been logged somehwere else, so we don't log this one
        await this.processError(error, { title, isProcessTerminated: true, skipLogError: true });
    }

    // Disabled and Terminated states are almost identical, except that
    // with Terminated you can restart Rovo Dev with the [+] button,
    // and with Disabled you can't.
    private setRovoDevTerminated(): Promise<void> {
        this._rovoDevApiClient = undefined;
        this._pendingAgentMode = undefined;
        setCommandContext(RovodevCommandContext.RovoDevApiReady, false);

        this._chatProvider.shutdown();
        this._telemetryProvider.shutdown();
        this._dwellTracker?.dispose();
        this._dwellTracker = undefined;
        this._contentTracker?.dispose();
        this._contentTracker = undefined;

        return this.refreshDebugPanel();
    }
}
