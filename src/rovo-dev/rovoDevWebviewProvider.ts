import * as fs from 'fs';
import path from 'path';
import { gte as semver_gte } from 'semver';
import { setTimeout } from 'timers/promises';
import { v4 } from 'uuid';
import {
    CancellationToken,
    commands,
    Disposable,
    Event,
    Memento,
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

import {
    rovoDevDetailsExpandedEvent,
    RovoDevEnv,
    rovoDevFileChangedActionEvent,
    rovoDevFilesSummaryShownEvent,
    rovoDevGitPushActionEvent,
    rovoDevNewSessionActionEvent,
    rovoDevPromptSentEvent,
    rovoDevStopActionEvent,
    rovoDevTechnicalPlanningShownEvent,
} from '../../src/analytics';
import { Container } from '../../src/container';
import { Logger } from '../../src/logger';
import { rovodevInfo } from '../constants';
import {
    ModifiedFile,
    RovoDevViewResponse,
    RovoDevViewResponseType,
} from '../react/atlascode/rovo-dev/rovoDevViewMessages';
import { GitErrorCodes } from '../typings/git';
import { getHtmlForView } from '../webview/common/getHtmlForView';
import { PerformanceLogger } from './performanceLogger';
import { RovoDevResponse, RovoDevResponseParser } from './responseParser';
import { RovoDevApiClient, RovoDevHealthcheckResponse } from './rovoDevApiClient';
import { RovoDevPullRequestHandler } from './rovoDevPullRequestHandler';
import { RovoDevContext, RovoDevContextItem, RovoDevPrompt, TechnicalPlan } from './rovoDevTypes';
import { RovoDevProviderMessage, RovoDevProviderMessageType } from './rovoDevWebviewProviderMessages';

type ParametersSkip2<T extends (...args: any) => any> =
    // eslint-disable-next-line no-unused-vars
    Parameters<T> extends [infer _1, infer _2, ...infer Rest] ? Rest : never;

type TelemetryFunction = keyof typeof rovoDevTelemetryEvents;

type TelemetryRecord<T> = {
    [x in TelemetryFunction]?: T;
};

const MIN_SUPPORTED_ROVODEV_VERSION = '0.9.3';

interface TypedWebview<MessageOut, MessageIn> extends Webview {
    readonly onDidReceiveMessage: Event<MessageIn>;
    postMessage(message: MessageOut): Thenable<boolean>;
}

const rovoDevTelemetryEvents = {
    rovoDevFileChangedActionEvent,
    rovoDevFilesSummaryShownEvent,
    rovoDevGitPushActionEvent,
    rovoDevNewSessionActionEvent,
    rovoDevPromptSentEvent,
    rovoDevStopActionEvent,
    rovoDevTechnicalPlanningShownEvent,
    rovoDevDetailsExpandedEvent,
};

export class RovoDevWebviewProvider extends Disposable implements WebviewViewProvider {
    private readonly viewType = 'atlascodeRovoDev';
    private readonly isBBY = process.env.ROVODEV_BBY;

    private _prHandler = new RovoDevPullRequestHandler();
    private _perfLogger = new PerformanceLogger();
    private _webView?: TypedWebview<RovoDevProviderMessage, RovoDevViewResponse>;
    private _rovoDevApiClient?: RovoDevApiClient;
    private _initialized = false;

    private _chatSessionId: string = '';
    private _currentPromptId: string = '';
    private _currentPrompt: RovoDevPrompt | undefined;
    private _pendingPrompt: RovoDevPrompt | undefined;
    private _pendingCancellation = false;

    private _firedTelemetryForCurrentPrompt: TelemetryRecord<boolean> = {};

    // we keep the data in this collection so we can attach some metadata to the next
    // prompt informing Rovo Dev that those files has been reverted
    private _revertedChanges: string[] = [];

    private _disposables: Disposable[] = [];

    private _globalState: Memento;
    private _extensionPath: string;
    private _extensionUri: Uri;

    private get rovoDevApiClient() {
        if (!this._rovoDevApiClient) {
            const rovoDevPort = this.getWorkspacePort();
            const rovoDevHost = process.env[rovodevInfo.envVars.host] || 'localhost';
            if (rovoDevPort) {
                this._rovoDevApiClient = new RovoDevApiClient(rovoDevHost, rovoDevPort);
            }
        }

        return this._rovoDevApiClient;
    }

    constructor(extensionPath: string, globalState: Memento) {
        super(() => {
            this._dispose();
        });

        this._extensionPath = extensionPath;
        this._extensionUri = Uri.file(this._extensionPath);
        this._globalState = globalState;

        // Register the webview view provider
        this._disposables.push(
            window.registerWebviewViewProvider('atlascode.views.rovoDev.webView', this, {
                webviewOptions: { retainContextWhenHidden: true },
            }),
        );

        // Register editor listeners
        this._registerEditorListeners();
    }

    private getWorkspacePort(): number | undefined {
        const workspaceFolders = workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return undefined;
        }

        const globalPort = process.env[rovodevInfo.envVars.port];
        if (globalPort) {
            return parseInt(globalPort);
        }

        const wsPath = workspaceFolders[0].uri.fsPath;
        const mapping = this._globalState.get<{ [key: string]: number }>(rovodevInfo.mappingKey);
        if (mapping && mapping[wsPath]) {
            return mapping[wsPath];
        }

        return undefined;
    }

    public resolveWebviewView(
        webviewView: WebviewView,
        _context: WebviewViewResolveContext,
        _token: CancellationToken,
    ): Thenable<void> | void {
        this._webView = webviewView.webview;
        const webview = this._webView;

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
                        this._pendingCancellation = false;
                        await this.executeChat(e);
                        break;

                    case RovoDevViewResponseType.CancelResponse:
                        // we set _pendingCancellation to true first, and update it
                        // later if the API fails, because we don't want to risk a race
                        // condition where the chat socket closes before the result of the
                        // cancel API has been evaluated
                        this._pendingCancellation = true;
                        if (!(await this.executeCancel())) {
                            this._pendingCancellation = false;
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

                    case RovoDevViewResponseType.GetOriginalText:
                        const text = await this.executeGetText(e.filePath, e.range);
                        await webviewView.webview.postMessage({
                            type: RovoDevProviderMessageType.ReturnText,
                            text: text || '',
                            nonce: e.requestId, // Use the requestId as nonce
                        });
                        break;

                    case RovoDevViewResponseType.CreatePR:
                        await this.createPR(e.payload.commitMessage, e.payload.branchName);
                        break;

                    case RovoDevViewResponseType.RetryPromptAfterError:
                        this._pendingCancellation = false;
                        await this.executeRetryPromptAfterError();
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
                        this.fireTelemetryEvent('rovoDevFilesSummaryShownEvent', this._currentPromptId, e.filesCount);
                        break;

                    case RovoDevViewResponseType.ReportChangesGitPushed:
                        this.fireTelemetryEvent(
                            'rovoDevGitPushActionEvent',
                            this._currentPromptId,
                            e.pullRequestCreated,
                        );
                        break;

                    case RovoDevViewResponseType.CheckGitChanges:
                        await this._prHandler.isGitStateClean().then((isClean) => {
                            this._webView?.postMessage({
                                type: RovoDevProviderMessageType.CheckGitChangesComplete,
                                hasChanges: !isClean,
                            });
                        });
                        break;

                    case RovoDevViewResponseType.ReportThinkingDrawerExpanded:
                        this.fireTelemetryEvent('rovoDevDetailsExpandedEvent', this._currentPromptId);
                        break;
                }
            } catch (error) {
                this.processError(error, false);
            }
        });

        // wait for Rovo Dev to be ready, for up to 10 seconds
        this.waitFor(() => this.executeHealthcheck(), 100000, 500)
            .then(async (result) => {
                if (result) {
                    const version = ((await this.executeHealthcheckInfo()) ?? {}).version;
                    if (version && semver_gte(version, MIN_SUPPORTED_ROVODEV_VERSION)) {
                        this.beginNewSession();
                        if (this.isBBY) {
                            // TODO: we should obtain the session id from the boysenberry environment
                            await this.executeReplay();
                        }
                    } else {
                        throw new Error(
                            `Rovo Dev version (${version}) is out of date. Please update Rovo Dev and try again.\nMin version compatible: ${MIN_SUPPORTED_ROVODEV_VERSION}`,
                        );
                    }
                } else {
                    const errorMsg = this._rovoDevApiClient
                        ? `Unable to initialize RovoDev at "${this._rovoDevApiClient.baseApiUrl}". Service wasn't ready within 10000ms`
                        : `Unable to initialize RovoDev's client within 10000ms`;

                    throw new Error(errorMsg);
                }

                this._initialized = true;
                // re-send the buffered prompt
                if (this._pendingPrompt) {
                    this.executeChat(this._pendingPrompt, true);
                    this._pendingPrompt = undefined;
                }
            })
            .catch((error) => {
                this.processError(error, false);
            })
            .finally(() => {
                this._initialized = true;

                webviewView.webview.postMessage({
                    type: RovoDevProviderMessageType.Initialized,
                });
            });
    }

    private beginNewSession(): void {
        this._chatSessionId = v4();
        this._perfLogger.sessionStarted(this._chatSessionId);
        this.fireTelemetryEvent('rovoDevNewSessionActionEvent', true);
    }

    private beginNewPrompt(overrideId?: string): void {
        this._currentPromptId = overrideId || v4();
        this._firedTelemetryForCurrentPrompt = {};
    }

    // This function esures that the same telemetry event is not sent twice for the same prompt
    private fireTelemetryEvent<T extends TelemetryFunction>(
        funcName: T,
        ...params: ParametersSkip2<(typeof rovoDevTelemetryEvents)[T]>
    ): void {
        if (!this._chatSessionId) {
            throw new Error('Unable to send Rovo Dev telemetry: ChatSessionId not initialized');
        }
        // rovoDevNewSessionActionEvent is the only event that doesn't need the promptId
        if (funcName !== 'rovoDevNewSessionActionEvent' && !this._currentPromptId) {
            throw new Error('Unable to send Rovo Dev telemetry: PromptId not initialized');
        }

        // the following events can be fired multiple times during the same prompt
        delete this._firedTelemetryForCurrentPrompt['rovoDevFileChangedActionEvent'];

        if (!this._firedTelemetryForCurrentPrompt[funcName]) {
            this._firedTelemetryForCurrentPrompt[funcName] = true;

            // add `rovoDevEnv` and `sessionId` as the first two arguments
            const rovoDevEnv: RovoDevEnv = this.isBBY ? 'Boysenberry' : 'IDE';
            params.unshift(rovoDevEnv, this._chatSessionId);

            const ret: ReturnType<(typeof rovoDevTelemetryEvents)[T]> = rovoDevTelemetryEvents[funcName].apply(
                undefined,
                params,
            );
            ret.then((evt) => Container.analyticsClient.sendTrackEvent(evt));

            Logger.debug(`Event fired: ${funcName}(${params})`);
        }
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
                this.forceUserFocusUpdate(editor);
            }),
        );
        // Listen for selection changes
        this._disposables.push(
            window.onDidChangeTextEditorSelection((event) => {
                this.forceUserFocusUpdate(event.textEditor);
            }),
        );
    }

    private async processChatResponse(sourceApi: 'chat' | 'replay', fetchOp: Promise<Response> | Response) {
        const fireTelemetry = sourceApi === 'chat';
        const response = await fetchOp;
        if (!response.body) {
            throw new Error("Error processing the Rovo Dev's response: response is empty.");
        }

        if (fireTelemetry) {
            this._perfLogger.promptStarted(this._currentPromptId);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const parser = new RovoDevResponseParser();

        let isFirstByte = true;
        let isFirstMessage = true;

        while (true) {
            const { done, value } = await reader.read();

            if (fireTelemetry && isFirstByte) {
                this._perfLogger.promptFirstByteReceived(this._currentPromptId);
                isFirstByte = false;
            }

            if (done) {
                // last response of the stream -> fire performance telemetry event
                if (fireTelemetry) {
                    this._perfLogger.promptLastMessageReceived(this._currentPromptId);
                }

                for (const msg of parser.flush()) {
                    await this.processRovoDevResponse(sourceApi, msg);
                }
                break;
            }

            const data = decoder.decode(value, { stream: true });
            for (const msg of parser.parse(data)) {
                if (fireTelemetry && isFirstMessage) {
                    this._perfLogger.promptFirstMessageReceived(this._currentPromptId);
                    isFirstMessage = false;
                }

                await this.processRovoDevResponse(sourceApi, msg);
            }
        }

        // Send final complete message when stream ends
        await this.completeChatResponse(sourceApi);
    }

    private completeChatResponse(sourceApi: 'replay' | 'chat' | 'error') {
        const webview = this._webView!;
        return webview.postMessage({
            type: RovoDevProviderMessageType.CompleteMessage,
            isReplay: sourceApi === 'replay',
        });
    }

    private processError(error: Error & { gitErrorCode?: GitErrorCodes }, isRetriable: boolean) {
        Logger.error('RovoDev', error);

        const webview = this._webView!;
        return webview.postMessage({
            type: RovoDevProviderMessageType.ErrorMessage,
            message: {
                text: `Error: ${error.message}${error.gitErrorCode ? `\n ${error.gitErrorCode}` : ''}`,
                source: 'RovoDevError',
                isRetriable,
                uid: v4(),
            },
        });
    }

    private async sendUserPromptToView({ text, enable_deep_plan, context }: RovoDevPrompt) {
        const webview = this._webView!;

        await webview.postMessage({
            type: RovoDevProviderMessageType.UserChatMessage,
            message: {
                text: text,
                source: 'User',
                context: context,
            },
        });

        return await webview.postMessage({
            type: RovoDevProviderMessageType.PromptSent,
            text,
            enable_deep_plan,
            context: context,
        });
    }

    private processRovoDevResponse(sourceApi: 'chat' | 'replay', response: RovoDevResponse): Thenable<boolean> {
        const fireTelemetry = sourceApi === 'chat';
        const webview = this._webView!;

        switch (response.event_kind) {
            case 'text':
                return webview.postMessage({
                    type: RovoDevProviderMessageType.Response,
                    dataObject: response,
                });

            case 'tool-call':
                return webview.postMessage({
                    type: RovoDevProviderMessageType.ToolCall,
                    dataObject: response,
                });

            case 'tool-return':
                if (fireTelemetry && response.tool_name === 'create_technical_plan' && response.parsedContent) {
                    this._perfLogger.promptTechnicalPlanReceived(this._currentPromptId);

                    const parsedContent = response.parsedContent as TechnicalPlan;
                    const stepsCount = parsedContent.logicalChanges.length;
                    const filesCount = parsedContent.logicalChanges.reduce((p, c) => p + c.filesToChange.length, 0);
                    const questionsCount = parsedContent.logicalChanges.reduce(
                        (p, c) => p + c.filesToChange.reduce((p2, c2) => p2 + (c2.clarifyingQuestionIfAny ? 1 : 0), 0),
                        0,
                    );

                    this.fireTelemetryEvent(
                        'rovoDevTechnicalPlanningShownEvent',
                        this._currentPromptId,
                        stepsCount,
                        filesCount,
                        questionsCount,
                    );
                }
                return webview.postMessage({
                    type: RovoDevProviderMessageType.ToolReturn,
                    dataObject: response,
                });

            case 'retry-prompt':
                return webview.postMessage({
                    type: RovoDevProviderMessageType.ToolReturn,
                    dataObject: response,
                });

            case 'user-prompt':
                // receiving a user-prompt pre-initialized means we are in the 'replay' response
                if (!this._initialized) {
                    this._currentPrompt = {
                        text: response.content,
                        // TODO: content is not restored here at the moment, so we'll just render all prompts as they were submitted
                    };
                    return this.sendUserPromptToView({ text: response.content });
                }
                return Promise.resolve(false);

            default:
                return Promise.resolve(false);
        }
    }

    private addContextToPrompt(message: string, context?: RovoDevContext): string {
        if (!context) {
            return message;
        }

        let extra = '';
        if (context.focusInfo && context.focusInfo.enabled && !context.focusInfo.invalid) {
            extra += `
            <context>
                Consider that the user has the following open in the editor:
                    <name>${context.focusInfo.file.name}</name>
                        <absolute_path>${context.focusInfo.file.absolutePath}</absolute_path>
                        <relative_path>${context.focusInfo.file.relativePath}</relative_path>
                        ${
                            context.focusInfo.selection
                                ? `<lines>${context.focusInfo.selection.start}-${context.focusInfo.selection.end}</lines>`
                                : ''
                        }
                        Please avoid excessively repeating the context in the response.
                </context>`;
        }

        if (context.contextItems && context.contextItems.length > 0) {
            extra += `
                <context>
                    The user has the following additional context items:
                    ${context.contextItems
                        .map(
                            (item) => `
                        <item>
                            <name>${item.file.name}</name>
                            <absolute_path>${item.file.absolutePath}</absolute_path>
                            <relative_path>${item.file.relativePath}</relative_path>
                            ${item.selection ? `<lines>${item.selection.start}-${item.selection.end}</lines>` : ''}
                        </item>`,
                        )
                        .join('\n')}
                </context>`;
        }

        // Trim excessive whitespace:
        extra = extra.replace(/\s+/g, ' ').trim();
        return `${message}\n${extra}`.trim();
    }

    private addUndoContextToPrompt(message: string): string {
        if (this._revertedChanges.length) {
            const files = this._revertedChanges.join('\n');
            this._revertedChanges = [];
            return `<context>
    The following files have been reverted:
    ${files}
</context>
            
${message}`;
        } else {
            return message;
        }
    }

    private addRetryAfterErrorContextToPrompt(message: string): string {
        return `<context>The previous response interrupted prematurely because of an error. Continue processing the previous prompt from the point where it was interrupted.
    <previous_prompt>${message}</previous_prompt>
</context>`;
    }

    private async executeChat({ text, enable_deep_plan, context }: RovoDevPrompt, suppressEcho?: boolean) {
        if (!text) {
            return;
        }

        if (!suppressEcho) {
            await this.sendUserPromptToView({ text, enable_deep_plan, context });
        }

        this.beginNewPrompt();

        this._currentPrompt = {
            text,
            enable_deep_plan,
            context,
        };

        let payloadToSend = this.addUndoContextToPrompt(text);
        payloadToSend = this.addContextToPrompt(payloadToSend, context);

        const currentPrompt = this._currentPrompt;
        const fetchOp = async (client: RovoDevApiClient) => {
            const response = await client.chat(payloadToSend, enable_deep_plan);

            this.fireTelemetryEvent('rovoDevPromptSentEvent', this._currentPromptId, !!currentPrompt.enable_deep_plan);

            return this.processChatResponse('chat', response);
        };

        if (this._initialized) {
            await this.executeApiWithErrorHandling(fetchOp, true);
        } else {
            this._pendingPrompt = {
                text: payloadToSend,
                enable_deep_plan,
                context,
            };
        }
    }

    private async executeRetryPromptAfterError() {
        const webview = this._webView!;

        if (!this._initialized || !this._currentPrompt) {
            return;
        }

        this.beginNewPrompt();

        const currentPrompt = this._currentPrompt;
        const payloadToSend = this.addRetryAfterErrorContextToPrompt(currentPrompt.text);

        // we need to echo back the prompt to the View since it's not user submitted
        await webview.postMessage({
            type: RovoDevProviderMessageType.PromptSent,
            text: payloadToSend,
            enable_deep_plan: currentPrompt.enable_deep_plan,
            context: currentPrompt.context,
        });

        const fetchOp = async (client: RovoDevApiClient) => {
            const response = await client.chat(payloadToSend, currentPrompt.enable_deep_plan);

            this.fireTelemetryEvent('rovoDevPromptSentEvent', this._currentPromptId, !!currentPrompt.enable_deep_plan);

            return this.processChatResponse('chat', response);
        };

        await this.executeApiWithErrorHandling(fetchOp, true);
    }

    public async addContextItem(contextItem: RovoDevContextItem): Promise<void> {
        const webview = this._webView!;
        await webview.postMessage({
            type: RovoDevProviderMessageType.ContextAdded,
            context: contextItem,
        });
    }

    public async selectContextItem(): Promise<RovoDevContextItem | undefined> {
        // Get all workspace files
        const files = await workspace.findFiles('**/*', '**/node_modules/**');
        if (!files.length) {
            window.showWarningMessage('No files found in workspace.');
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

    async executeAddContext(currentContext?: RovoDevContext): Promise<void> {
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

    async executeReset(): Promise<void> {
        const webview = this._webView!;
        const success = await this.executeApiWithErrorHandling(async (client) => {
            await client.reset();

            this._revertedChanges = [];

            await webview.postMessage({
                type: RovoDevProviderMessageType.NewSession,
            });

            return true;
        }, false);

        if (success) {
            this._chatSessionId = v4();
            this._perfLogger.sessionStarted(this._chatSessionId);
            this.fireTelemetryEvent('rovoDevNewSessionActionEvent', true);
        }
    }

    private async executeCancel(): Promise<boolean> {
        const webview = this._webView!;

        const cancelResponse = await this.executeApiWithErrorHandling(async (client) => {
            return await client.cancel();
        }, false);

        const success =
            !!cancelResponse && (cancelResponse.cancelled || cancelResponse.message === 'No chat in progress');

        if (success) {
            this.fireTelemetryEvent('rovoDevStopActionEvent', this._currentPromptId);
            return true;
        } else {
            this.fireTelemetryEvent('rovoDevStopActionEvent', this._currentPromptId, true);
            await webview.postMessage({
                type: RovoDevProviderMessageType.CancelFailed,
            });
            return false;
        }
    }

    private async executeReplay(): Promise<void> {
        this.beginNewPrompt('replay');

        await this.executeApiWithErrorHandling(async (client) => {
            return this.processChatResponse('replay', client.replay());
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

    private async executeOpenFile(filePath: string, tryShowDiff: boolean, _range?: number[]): Promise<void> {
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

            await window.showTextDocument(fileUri, {
                preview: true,
                selection: range || undefined,
            });
        }
    }

    private async executeUndoFiles(files: ModifiedFile[]) {
        const promises = files.map(async (file) => {
            const resolvedPath = this.makeRelativePathAbsolute(file.filePath);
            await this.getPromise((callback) => fs.rm(resolvedPath, { force: true }, callback));

            if (file.type !== 'create') {
                const cachedFilePath = await this.rovoDevApiClient!.getCacheFilePath(file.filePath);
                await this.getPromise((callback) => fs.copyFile(cachedFilePath, resolvedPath, callback));
                await this.getPromise((callback) => fs.rm(cachedFilePath, callback));
            }
        });

        await Promise.all(promises);

        const paths = files.map((x) => x.filePath);
        this._revertedChanges.push(...paths);

        this.fireTelemetryEvent('rovoDevFileChangedActionEvent', this._currentPromptId, 'undo', files.length);
    }

    private async executeKeepFiles(files: ModifiedFile[]) {
        const promises = files.map(async (file) => {
            const cachedFilePath = await this.rovoDevApiClient!.getCacheFilePath(file.filePath);
            await this.getPromise((callback) => fs.rm(cachedFilePath, callback));
        });

        await Promise.all(promises);

        this.fireTelemetryEvent('rovoDevFileChangedActionEvent', this._currentPromptId, 'keep', files.length);
    }

    private async createPR(commitMessage?: string, branchName?: string): Promise<void> {
        let prLink: string | undefined;
        const webview = this._webView!;
        try {
            if (!commitMessage || !branchName) {
                throw new Error('Commit message and branch name are required to create a PR');
            }
            prLink = await this._prHandler.createPR(branchName, commitMessage);

            await webview.postMessage({
                type: RovoDevProviderMessageType.CreatePRComplete,
                data: {
                    url: prLink,
                },
            });
        } catch (e) {
            await this.processError(e, false);

            const errorMessage = e.message;
            const errorCode = e.gitErrorCode;

            await webview.postMessage({
                type: RovoDevProviderMessageType.CreatePRComplete,
                data: {
                    error: e.message
                        ? `${errorMessage}${errorCode ? ` (Error code: ${errorCode})` : ''}`
                        : 'Unknown error occurred while creating PR',
                },
            });
        }
    }

    private async getCurrentBranchName(): Promise<void> {
        const webview = this._webView!;
        try {
            const branchName = await this._prHandler.getCurrentBranchName();
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
        cancellationAware?: true,
    ): Promise<T | void> {
        if (this.rovoDevApiClient) {
            try {
                return await func(this.rovoDevApiClient);
            } catch (error) {
                if (cancellationAware && this._pendingCancellation && error.cause?.code === 'UND_ERR_SOCKET') {
                    this._pendingCancellation = false;
                    this.completeChatResponse('error');
                } else {
                    await this.processError(error, isErrorRetriable);
                }
            }
        } else {
            await this.processError(new Error('RovoDev client not initialized'), false);
        }
    }

    private async executeGetText(filePath: string, range?: number[]): Promise<string | undefined> {
        const resolvedPath = this.makeRelativePathAbsolute(filePath);
        if (!fs.existsSync(resolvedPath)) {
            console.warn(`File not found: ${resolvedPath}`);
            return undefined;
        }

        const document = await workspace.openTextDocument(Uri.file(resolvedPath));

        if (!document) {
            console.warn(`Unable to open document for file: ${resolvedPath}`);
            return undefined;
        }

        const lineRange =
            range && Array.isArray(range) ? new Range(new Position(range[0], 0), new Position(range[1], 0)) : undefined;

        const text = document.getText(document.validateRange(lineRange || new Range(0, 0, document.lineCount, 0)));

        return text;
    }

    async invokeRovoDevAskCommand(prompt: string, context?: RovoDevContext): Promise<void> {
        // focus on the specific vscode view
        commands.executeCommand('atlascode.views.rovoDev.webView.focus');

        // Wait for the webview to initialize, up to 5 seconds
        const initialized = await this.waitFor(() => !!this._webView, 5000, 50);
        if (!initialized) {
            console.error('Webview is not initialized after waiting.');
            return;
        }

        // Actually invoke the rovodev service, feed responses to the webview as normal
        await this.executeChat({ text: prompt, context }, false);
    }

    /**
     * Adds a context item to the RovoDev webview. Intended for external calls, e.g. commands
     * @param contextItem The context item to add.
     * @returns A promise that resolves when the context item has been added.
     */
    async addToContext(contextItem: RovoDevContextItem): Promise<void> {
        if (!this._webView) {
            console.error('Webview is not initialized.');
            return;
        }

        this._webView.postMessage({
            type: RovoDevProviderMessageType.ContextAdded,
            context: contextItem,
        });
    }

    private async waitFor(
        check: () => Promise<boolean> | boolean,
        timeoutMs: number,
        interval: number,
    ): Promise<boolean> {
        let result = await check();
        while (!result && timeoutMs) {
            await setTimeout(interval);
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

    private getPromise(code: (callback: fs.NoParamCallback) => void): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const callback: fs.NoParamCallback = (err) => (err ? reject(err) : resolve());
            try {
                code(callback);
            } catch (error) {
                reject(error);
            }
        });
    }
}
