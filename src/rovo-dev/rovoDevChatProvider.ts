import { Logger } from 'src/logger';
import { RovoDevViewResponse } from 'src/rovo-dev/ui/rovoDevViewMessages';
import { v4 } from 'uuid';
import { Event, EventEmitter } from 'vscode';

import { ExtensionApi } from './api/extensionApi';
import {
    AgentMode,
    RovoDevApiClient,
    RovoDevApiError,
    RovoDevChatRequest,
    RovoDevChatRequestContext,
    RovoDevChatRequestContextFileEntry,
    RovoDevChatRequestContextOtherEntry,
    RovoDevResponse,
    RovoDevResponseParser,
    ToolPermissionChoice,
} from './client';
import { buildErrorDetails, buildExceptionDetails } from './errorDetailsBuilder';
import { RovoDevTelemetryProvider } from './rovoDevTelemetryProvider';
import {
    RovoDevContextItem,
    RovoDevFileContext,
    RovoDevJiraContext,
    RovoDevPrompt,
    TechnicalPlan,
} from './rovoDevTypes';
import {
    modelsJsonResponseToMarkdown,
    parseCustomCliTagsForMarkdown,
    promptsJsonResponseToMarkdown,
    readLastNLogLines,
    statusJsonResponseToMarkdown,
    usageJsonResponseToMarkdown,
} from './rovoDevUtils';
import { TypedWebview } from './rovoDevWebviewProvider';
import {
    RovoDevProviderMessage,
    RovoDevProviderMessageType,
    RovoDevResponseMessageType,
} from './rovoDevWebviewProviderMessages';

type StreamingApi = 'chat' | 'replay';

export class RovoDevChatProvider {
    private readonly extensionApi = new ExtensionApi();
    private readonly isDebugging = this.extensionApi.metadata.isDebugging();

    private _onAgentModelChanged = new EventEmitter<void>();
    public get onAgentModelChanged(): Event<void> {
        return this._onAgentModelChanged.event;
    }

    private _pendingToolConfirmation: Record<string, ToolPermissionChoice | 'undecided'> = {};
    private _pendingToolConfirmationLeft = 0;
    private _pendingPrompt: RovoDevPrompt | undefined;
    private _currentPrompt: RovoDevPrompt | undefined;
    private _rovoDevApiClient: RovoDevApiClient | undefined;
    private _webView: TypedWebview<RovoDevProviderMessage, RovoDevViewResponse> | undefined;
    private _onUnauthorizedCallback: (() => Promise<void>) | undefined;

    private _replayInProgress = false;
    private _lastMessageSentTime: number | undefined;

    private get isDebugPanelEnabled() {
        return this.extensionApi.config.isDebugPanelEnabled();
    }

    private get isRetryPromptEnabled() {
        return this._isBoysenberry;
    }

    private _yoloMode = false;
    public get yoloMode() {
        return this._yoloMode;
    }
    public set yoloMode(value: boolean) {
        this._yoloMode = value;
        if (value) {
            this.signalToolRequestAllowAll();
        }
    }

    private _agentMode: AgentMode = 'default';
    public get agentMode() {
        return this._agentMode;
    }
    public set agentMode(value: AgentMode) {
        this._agentMode = value;
    }

    public fullContextMode = false;

    private _currentPromptId: string = '';
    public get currentPromptId() {
        return this._currentPromptId;
    }

    private _pendingCancellation = false;
    public get pendingCancellation() {
        return this._pendingCancellation;
    }

    public get isPromptPending() {
        return !!this._pendingPrompt;
    }

    private _abortController: AbortController | null = null;

    constructor(
        private readonly _isBoysenberry: boolean,
        private _telemetryProvider: RovoDevTelemetryProvider,
    ) {}

    public setWebview(webView: TypedWebview<RovoDevProviderMessage, RovoDevViewResponse> | undefined) {
        this._webView = webView;
    }

    public setOnUnauthorizedCallback(callback: (() => Promise<void>) | undefined) {
        this._onUnauthorizedCallback = callback;
    }

    public isReady(): boolean {
        return !!this._rovoDevApiClient;
    }

    public async setReady(rovoDevApiClient: RovoDevApiClient, pendingAgentMode?: AgentMode) {
        this._rovoDevApiClient = rovoDevApiClient;

        if (pendingAgentMode) {
            await this.setAgentMode(pendingAgentMode);
        }

        if (this._pendingPrompt) {
            const pendingPrompt = this._pendingPrompt;
            this._pendingPrompt = undefined;
            await this.internalExecuteChat(pendingPrompt, [], true);
        }
    }

    public shutdown() {
        this._rovoDevApiClient = undefined;
        this._pendingPrompt = undefined;
        this._lastMessageSentTime = undefined;
    }

    public async clearChat(): Promise<void> {
        await this._webView!.postMessage({
            type: RovoDevProviderMessageType.ClearChat,
        });
    }

    public executeChat(prompt: RovoDevPrompt, revertedFiles: string[]) {
        return this.internalExecuteChat(prompt, revertedFiles, false);
    }

    private async internalExecuteChat(
        { text, enable_deep_plan, context }: RovoDevPrompt,
        revertedFiles: string[],
        flushingPendingPrompt: boolean,
    ) {
        if (!text) {
            return;
        }

        // remove hidden focused item from the context
        context = context.filter((x) => x.contextType !== 'file' || x.enabled);

        const isCommand = text.trim().startsWith('/');
        if (isCommand) {
            enable_deep_plan = false;
            context = [];
        }

        // when flushing a pending prompt, we don't want to echo the prompt in chat again
        await this.signalPromptSent({ text, enable_deep_plan, context }, !flushingPendingPrompt);

        if (!this._rovoDevApiClient) {
            this._pendingPrompt = { text, enable_deep_plan, context };
            return;
        }

        this._currentPrompt = {
            text,
            enable_deep_plan,
            context,
        };

        const requestPayload = this.preparePayloadForChatRequest(this._currentPrompt);

        if (!isCommand) {
            if (this.fullContextMode) {
                requestPayload.message = `use fullcontext: ${requestPayload.message}`;
            }

            this.addUndoContextToPrompt(requestPayload, revertedFiles);
        }

        await this.sendPromptToRovoDev(requestPayload);
    }

    public async executeRetryPromptAfterError() {
        if (!this._currentPrompt) {
            return;
        }

        // we need to echo back the prompt to the View since it's not submitted via prompt box
        await this.signalPromptSent(this._currentPrompt, true);

        const requestPayload = this.preparePayloadForChatRequest(this._currentPrompt);
        this.addRetryAfterErrorContextToPrompt(requestPayload);

        await this.sendPromptToRovoDev(requestPayload);
    }

    private async sendPromptToRovoDev(requestPayload: RovoDevChatRequest) {
        this.beginNewPrompt();

        const fetchOp = async (client: RovoDevApiClient) => {
            this._abortController?.abort();
            this._abortController = new AbortController();
            // Boysenberry is always in YOLO mode
            const response = await client.chat(requestPayload, !this._isBoysenberry, this._abortController.signal);

            this._telemetryProvider.fireTelemetryEvent({
                action: 'rovoDevPromptSent',
                subject: 'atlascode',
                attributes: {
                    promptId: this._currentPromptId,
                    deepPlanEnabled: !!requestPayload.enable_deep_plan,
                },
            });

            return this.processResponse('chat', response);
        };

        await this.executeStreamingApiWithErrorHandling('chat', fetchOp);
        this._abortController = null;
    }

    public async executeReplay(): Promise<void> {
        if (!this._rovoDevApiClient) {
            const error = new Error('Unable to replay the previous conversation. Rovo Dev failed to initialize');
            RovoDevTelemetryProvider.logError(error, 'Cannot replay conversation - Rovo Dev not initialized');
            throw error;
        }

        this.beginNewPrompt('replay');

        this._replayInProgress = true;

        const fetchOp = async (client: RovoDevApiClient) => {
            this._abortController?.abort();
            this._abortController = new AbortController();

            const response = client.replay(this._abortController?.signal);
            return this.processResponse('replay', response);
        };

        await this.executeStreamingApiWithErrorHandling('replay', fetchOp);

        this._replayInProgress = false;
        this._abortController = null;
    }

    public async executeCancel(fromNewSession: boolean): Promise<boolean> {
        const webview = this._webView!;

        let success: boolean;
        if (this._rovoDevApiClient) {
            if (this._pendingCancellation) {
                const error = new Error('Cancellation already in progress');
                RovoDevTelemetryProvider.logError(error, 'Cannot cancel - cancellation already in progress');
                throw error;
            }
            this._pendingCancellation = true;

            try {
                const cancelResponse = await this._rovoDevApiClient.cancel();
                success = cancelResponse.cancelled || cancelResponse.message === 'No chat in progress';
            } catch {
                await this.processError(new Error('Failed to cancel the current response. Please try again.'));
                success = false;
            }

            this._pendingCancellation = false;

            if (!success) {
                await webview.postMessage({
                    type: RovoDevProviderMessageType.CancelFailed,
                });
            }
        } else {
            // this._rovoDevApiClient is undefined, it means this cancellation happened while
            // the provider is still initializing
            this._pendingPrompt = undefined;
            success = true;

            // send a fake 'CompleteMessage' to tell the view the prompt isn't pending anymore
            await webview.postMessage({
                type: RovoDevProviderMessageType.CompleteMessage,
                promptId: this._currentPromptId,
            });
        }

        // Clear the render time tracking on cancellation
        this._lastMessageSentTime = undefined;

        // don't instrument the cancellation if it's coming from a 'New session' action
        // also, don't instrument the cancellation if it's done before initialization
        if (!fromNewSession && this._rovoDevApiClient) {
            this._telemetryProvider.fireTelemetryEvent({
                action: 'rovoDevStopAction',
                subject: 'atlascode',
                attributes: {
                    promptId: this._currentPromptId,
                    failed: success ? undefined : true,
                },
            });
        }

        return success;
    }

    private beginNewPrompt(overrideId?: string): void {
        this._currentPromptId = overrideId || v4();
        this._telemetryProvider.startNewPrompt(this._currentPromptId);
    }

    private async processResponse(sourceApi: StreamingApi, fetchOp: Promise<Response> | Response) {
        const telemetryProvider = sourceApi === 'replay' ? undefined : this._telemetryProvider;

        const response = await fetchOp;
        if (!response.body) {
            const error = new Error("Error processing the Rovo Dev's response: response is empty.");
            RovoDevTelemetryProvider.logError(error, 'Received empty response from Rovo Dev');
            throw error;
        }

        telemetryProvider?.perfLogger.promptStarted(this._currentPromptId);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const parser = new RovoDevResponseParser();

        let isFirstByte = true;
        let isFirstMessage = true;

        let replayInProgress = sourceApi === 'replay';
        let isDone = false;

        const replayBuffer: RovoDevResponse[] = [];

        while (replayInProgress) {
            const { done, value } = await reader.read();
            if (done) {
                isDone = true;
                break;
            }

            const data = decoder.decode(value, { stream: true });
            for (const msg of parser.parse(data)) {
                replayBuffer.push(msg);

                if (msg.event_kind === 'replay_end') {
                    // breaks after this `data` is parsed and switches to live streaming
                    replayInProgress = false;
                }
            }
        }

        // Emit analytics for replay completion
        this._telemetryProvider.fireTelemetryEvent({
            action: 'rovoDevReplayCompleted',
            subject: 'atlascode',
            attributes: {
                messagePartsCount: replayBuffer.length,
            },
        });

        if (replayBuffer.length > 0) {
            await this.processRovoDevReplayResponse(replayBuffer);
        }

        while (!isDone) {
            const { done, value } = await reader.read();
            if (done) {
                isDone = true;
                break;
            }

            if (isFirstByte) {
                telemetryProvider?.perfLogger.promptFirstByteReceived(this._currentPromptId);
                isFirstByte = false;
            }

            const data = decoder.decode(value, { stream: true });
            for (const msg of parser.parse(data)) {
                if (isFirstMessage) {
                    telemetryProvider?.perfLogger.promptFirstMessageReceived(this._currentPromptId);
                    isFirstMessage = false;
                }

                await this.processRovoDevResponse(sourceApi, msg);
            }
        }

        // last response of the stream -> fire performance telemetry event
        telemetryProvider?.perfLogger.promptLastMessageReceived(this._currentPromptId);

        // Store timestamp for render time measurement (for both chat and replay)
        this._lastMessageSentTime = performance.now();

        for (const msg of parser.flush()) {
            await this.processRovoDevResponse(sourceApi, msg);
        }

        // Rovo Dev can change agent mid-response to a fallback model when the main one is troublesome.
        // While we should handle such events in real time, this is meant to capture anything that we
        // may have missed, and make sure the agent selector is always in sync with Rovo Dev
        this._onAgentModelChanged.fire();
    }

    private async processRovoDevReplayResponse(responses: RovoDevResponse[]): Promise<void> {
        const webview = this._webView!;

        let group: RovoDevResponseMessageType[] = [];

        const flush = async () => {
            if (group.length > 0) {
                await webview.postMessage({
                    type: RovoDevProviderMessageType.RovoDevResponseMessage,
                    message: group,
                });
                group = [];
            }
        };

        // group all contiguous messages of type 'text', 'tool-call', 'tool-return',
        // and send them in batch. send all other type of messages normally.
        for (const response of responses) {
            switch (response.event_kind) {
                case 'text':
                case 'tool-call':
                case 'tool-return':
                    group.push(response);
                    break;

                default:
                    await flush();
                    await this.processRovoDevResponse('replay', response);
                    break;
            }
        }

        await flush();
    }

    private async processRovoDevResponse(sourceApi: StreamingApi, response: RovoDevResponse): Promise<void> {
        const fireTelemetry = sourceApi === 'chat';
        const webview = this._webView!;

        if (
            fireTelemetry &&
            response.event_kind === 'tool-return' &&
            response.tool_name === 'create_technical_plan' &&
            response.parsedContent
        ) {
            this._telemetryProvider.perfLogger.promptTechnicalPlanReceived(this._currentPromptId);

            const parsedContent = response.parsedContent as TechnicalPlan;
            const stepsCount = parsedContent.logicalChanges.length;
            const filesCount = parsedContent.logicalChanges.reduce((p, c) => p + c.filesToChange.length, 0);
            const questionsCount = parsedContent.logicalChanges.reduce(
                (p, c) => p + c.filesToChange.reduce((p2, c2) => p2 + (c2.clarifyingQuestionIfAny ? 1 : 0), 0),
                0,
            );

            this._telemetryProvider.fireTelemetryEvent({
                action: 'rovoDevTechnicalPlanningShown',
                subject: 'atlascode',
                attributes: {
                    promptId: this._currentPromptId,
                    stepsCount,
                    filesCount,
                    questionsCount,
                },
            });
        }

        switch (response.event_kind) {
            case 'text':
            case 'tool-call':
            case 'tool-return':
                await webview.postMessage({
                    type: RovoDevProviderMessageType.RovoDevResponseMessage,
                    message: response,
                });
                break;

            case 'retry-prompt':
                if (this.isRetryPromptEnabled) {
                    await webview.postMessage({
                        type: RovoDevProviderMessageType.RovoDevResponseMessage,
                        message: response,
                    });
                }
                break;

            case 'user-prompt':
                if (this._replayInProgress) {
                    const { text, context } = this.parseUserPromptReplay(response.content || '');
                    this._currentPrompt = {
                        text: text,
                        enable_deep_plan: false,
                        context: context,
                    };
                    await this.signalPromptSent({ text, enable_deep_plan: false, context }, true);
                }
                break;

            case '_parsing_error':
                await this.processError(response.error, { showOnlyInDebug: true });
                break;

            case 'exception': {
                RovoDevTelemetryProvider.logError(
                    new Error(`${response.type} ${response.message}`),
                    response.title || undefined,
                );

                const { text, link } = this.parseExceptionMessage(response.message);
                await webview.postMessage({
                    type: RovoDevProviderMessageType.ShowDialog,
                    message: {
                        event_kind: '_RovoDevDialog',
                        type: 'error',
                        title: response.title || undefined,
                        text,
                        ctaLink: link,
                        statusCode: `Error code: ${response.type}`,
                        uid: v4(),
                        stackTrace: buildExceptionDetails(response),
                        rovoDevLogs: readLastNLogLines(),
                    },
                });
                break;
            }

            case 'warning': {
                const { text, link } = this.parseExceptionMessage(response.message);
                await webview.postMessage({
                    type: RovoDevProviderMessageType.ShowDialog,
                    message: {
                        type: 'warning',
                        text,
                        ctaLink: link,
                        title: response.title,
                        event_kind: '_RovoDevDialog',
                    },
                });
                break;
            }

            case 'clear':
                await this.clearChat();
                break;

            case 'prune':
                await webview.postMessage({
                    type: RovoDevProviderMessageType.ShowDialog,
                    message: {
                        type: 'info',
                        text: response.message,
                        event_kind: '_RovoDevDialog',
                    },
                });
                break;

            case 'on_call_tools_start':
                this._pendingToolConfirmation = {};
                this._pendingToolConfirmationLeft = 0;

                if (!response.permission_required) {
                    break;
                }

                const toolsToAskForPermission = response.tools.filter(
                    (x) => response.permissions[x.tool_call_id] === 'ASK',
                );

                if (this.yoloMode) {
                    const yoloChoices: RovoDevChatProvider['_pendingToolConfirmation'] = {};
                    toolsToAskForPermission.forEach((x) => (yoloChoices[x.tool_call_id] = 'allow'));
                    await this._rovoDevApiClient!.resumeToolCall(yoloChoices);
                    break;
                } else {
                    toolsToAskForPermission.forEach(
                        (x) => (this._pendingToolConfirmation[x.tool_call_id] = 'undecided'),
                    );
                    this._pendingToolConfirmationLeft = toolsToAskForPermission.length;

                    const promises = toolsToAskForPermission.map((tool) => {
                        return webview.postMessage({
                            type: RovoDevProviderMessageType.ShowDialog,
                            message: {
                                event_kind: '_RovoDevDialog',
                                type: 'toolPermissionRequest',
                                toolName: tool.tool_name,
                                toolArgs: tool.args,
                                mcpServer: tool.mcp_server,
                                text: '',
                                toolCallId: tool.tool_call_id,
                            },
                        });
                    });
                    await Promise.all(promises);
                }
                break;

            case 'status':
                await webview.postMessage({
                    type: RovoDevProviderMessageType.ShowDialog,
                    message: {
                        type: 'info',
                        title: 'Status response',
                        text: statusJsonResponseToMarkdown(response),
                        event_kind: '_RovoDevDialog',
                    },
                });
                break;

            case 'usage':
                const { usage_response, alert_message } = usageJsonResponseToMarkdown(response);
                await webview.postMessage({
                    type: RovoDevProviderMessageType.ShowDialog,
                    message: {
                        type: 'info',
                        title: 'Usage response',
                        text: usage_response,
                        event_kind: '_RovoDevDialog',
                        statusCode: `Status code: ${response.data.content.status}`,
                    },
                });
                if (alert_message) {
                    await webview.postMessage({
                        type: RovoDevProviderMessageType.ShowDialog,
                        message: {
                            type: 'warning',
                            title: "You've reached your Rovo Dev credit limit",
                            text: alert_message.message.replace('{ctaLink}', ''),
                            event_kind: '_RovoDevDialog',
                            ctaLink: alert_message.ctaLink,
                        },
                    });
                }
                break;

            case 'prompts':
                await webview.postMessage({
                    type: RovoDevProviderMessageType.ShowDialog,
                    message: {
                        type: 'info',
                        title: 'Prompts response',
                        text: promptsJsonResponseToMarkdown(response),
                        event_kind: '_RovoDevDialog',
                    },
                });
                break;

            case 'models':
                const parsedModelsResponse = modelsJsonResponseToMarkdown(response);
                if (parsedModelsResponse) {
                    await webview.postMessage({
                        type: RovoDevProviderMessageType.ShowDialog,
                        message: {
                            type: 'info',
                            title: parsedModelsResponse.title,
                            text: parsedModelsResponse.text,
                            event_kind: '_RovoDevDialog',
                        },
                    });

                    if (parsedModelsResponse.agentModelChanged) {
                        this._onAgentModelChanged.fire();
                    }
                } else {
                    this.processError(new Error('Invalid models response'));
                }
                break;

            case 'close':
                // response terminated
                break;

            case 'replay_end':
                // signals that the replay has ended, and the API is now streaming live data
                // NOTE: this event is handled somewhere else
                break;

            // special event for messages we want to ignore
            case '_ignored':
                break;

            default:
                // this should really never happen, as unknown messages are caugh and wrapped into the
                // message `_parsing_error`
                // @ts-expect-error ts(2339) - response here should be 'never'
                const error = new Error(`Rovo Dev response error: unknown event kind: ${response.event_kind}`);
                RovoDevTelemetryProvider.logError(error);
                throw error;
        }
    }

    public async signalToolRequestChoiceSubmit(toolCallId: string, choice: ToolPermissionChoice) {
        if (!this._pendingToolConfirmation[toolCallId]) {
            const error = new Error('Received an unexpected tool confirmation: not found.');
            RovoDevTelemetryProvider.logError(error, 'Tool confirmation not found', toolCallId);
            throw error;
        }
        if (this._pendingToolConfirmation[toolCallId] !== 'undecided') {
            const error = new Error('Received an unexpected tool confirmation: already confirmed.');
            RovoDevTelemetryProvider.logError(error, 'Tool confirmation already processed', toolCallId);
            throw error;
        }

        this._pendingToolConfirmation[toolCallId] = choice;

        if (--this._pendingToolConfirmationLeft <= 0) {
            await this._rovoDevApiClient!.resumeToolCall(this._pendingToolConfirmation);
            this._pendingToolConfirmation = {};
        }
    }

    public async signalToolRequestAllowAll() {
        if (this._pendingToolConfirmationLeft > 0) {
            for (const key in this._pendingToolConfirmation) {
                if (this._pendingToolConfirmation[key] === 'undecided') {
                    this._pendingToolConfirmation[key] = 'allow';
                }
            }
            this._pendingToolConfirmationLeft = 0;

            await this._rovoDevApiClient!.resumeToolCall(this._pendingToolConfirmation);
            this._pendingToolConfirmation = {};
        }
    }

    public signalMessageRendered(promptId: string) {
        if (this._lastMessageSentTime !== undefined && promptId === this._currentPromptId) {
            const renderTime = performance.now() - this._lastMessageSentTime;
            this._telemetryProvider.perfLogger.promptLastMessageRendered(promptId, renderTime);
            this._lastMessageSentTime = undefined;
        }
    }

    public async setAgentMode(mode: AgentMode) {
        if (!this._rovoDevApiClient) {
            return;
        }

        try {
            await this._rovoDevApiClient.setAgentMode(mode);
            this._agentMode = mode;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to set agent mode: ${errorMessage}`);
        }
    }

    public async getAvailableAgentModes() {
        if (!this._rovoDevApiClient) {
            return;
        }

        try {
            const response = await this._rovoDevApiClient.getAvailableModes();
            return response.modes;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to get available agent modes: ${errorMessage}`);
        }
    }

    public async getCurrentAgentMode() {
        if (!this._rovoDevApiClient) {
            return;
        }

        try {
            const response = await this._rovoDevApiClient.getAgentMode();
            return response.mode;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to get current agent mode: ${errorMessage}`);
        }
    }

    private async executeStreamingApiWithErrorHandling(
        sourceApi: StreamingApi,
        func: (client: RovoDevApiClient) => Promise<any>,
    ): Promise<void> {
        const webview = this._webView!;

        if (this._rovoDevApiClient) {
            try {
                await func(this._rovoDevApiClient);
            } catch (error) {
                if (error.name === 'AbortError') {
                    await webview.postMessage({
                        type: RovoDevProviderMessageType.CompleteMessage,
                        promptId: this._currentPromptId,
                    });
                    Logger.info('Rovo Dev API request aborted by user');
                    return;
                }
                // Check if this is a 401 or 403 error indicating expired/invalid credentials
                // Also check if the stack trace contains "UnauthorizedError"
                const isUnauthorizedError =
                    (error instanceof RovoDevApiError && (error.httpStatus === 401 || error.httpStatus === 403)) ||
                    (error instanceof Error && error.stack?.includes('UnauthorizedError'));
                if (isUnauthorizedError) {
                    Logger.info('Detected unauthorized error - triggering login UI');
                    if (this._onUnauthorizedCallback) {
                        await this._onUnauthorizedCallback();
                        return;
                    }
                }
                // the error is retriable only when it happens during the streaming of a 'chat' response
                await this.processError(error, { isRetriable: sourceApi === 'chat' });
            }
        } else {
            await this.processError(new Error('RovoDev client not initialized'));
        }

        // whatever happens, at the end of the streaming API we need to tell the webview
        // that the generation of the response has finished
        await webview.postMessage({
            type: RovoDevProviderMessageType.CompleteMessage,
            promptId: this._currentPromptId,
        });
    }

    private async processError(
        error: Error,
        {
            isRetriable,
            isProcessTerminated,
            showOnlyInDebug,
        }: { isRetriable?: boolean; isProcessTerminated?: boolean; showOnlyInDebug?: boolean } = {},
    ) {
        RovoDevTelemetryProvider.logError(error);

        if (!showOnlyInDebug || this.isDebugging || this.isDebugPanelEnabled) {
            const webview = this._webView!;
            await webview.postMessage({
                type: RovoDevProviderMessageType.ShowDialog,
                message: {
                    event_kind: '_RovoDevDialog',
                    type: 'error',
                    text: error.message,
                    isRetriable,
                    isProcessTerminated,
                    uid: v4(),
                    stackTrace: buildErrorDetails(error),
                    rovoDevLogs: readLastNLogLines(),
                },
            });
        }
    }

    private async signalPromptSent({ text, enable_deep_plan, context }: RovoDevPrompt, echoMessage: boolean) {
        const webview = this._webView!;
        return await webview.postMessage({
            type: RovoDevProviderMessageType.SignalPromptSent,
            echoMessage,
            text,
            enable_deep_plan,
            context,
        });
    }

    private preparePayloadForChatRequest(prompt: RovoDevPrompt): RovoDevChatRequest {
        const fileContext: RovoDevChatRequestContextFileEntry[] = (prompt.context || [])
            .filter((x) => x.contextType === 'file' && x.enabled)
            .map((x: RovoDevFileContext) => ({
                type: 'file' as const,
                file_path: x.file.absolutePath,
                selection: x.selection,
                note: 'I currently have this file open in my IDE',
            }));

        const jiraContext: RovoDevChatRequestContextOtherEntry[] = (prompt.context || [])
            .filter((x) => x.contextType === 'jiraWorkItem')
            .map((x: RovoDevJiraContext) => ({
                type: 'jiraWorkItem',
                content: x.url,
            }));

        return {
            message: prompt.text,
            enable_deep_plan: prompt.enable_deep_plan,
            context: Array<RovoDevChatRequestContext>().concat(fileContext).concat(jiraContext),
        };
    }

    private addUndoContextToPrompt(requestPayload: RovoDevChatRequest, revertedFiles: string[]) {
        const revertedFileEntries = revertedFiles.map((x) => ({
            type: 'file' as const,
            file_path: x,
            note: 'I have reverted the changes you have done on this file',
        }));

        requestPayload.context.push(...revertedFileEntries);
    }

    private addRetryAfterErrorContextToPrompt(requestPayload: RovoDevChatRequest) {
        requestPayload.context.push({
            type: 'retry-after-error',
            content:
                'The previous response interrupted prematurely because of an error. Continue processing the previous prompt from the point where it was interrupted.',
        });
    }

    // Rovo Dev CLI inserts context into the response during replay
    // we need to parse it out to reconstruct the prompt
    // TODO: get a proper solution for this from the CLI team :)
    private parseUserPromptReplay(source: string): { text: string; context: RovoDevContextItem[] } {
        // Let's target the specific pattern from `/replay` to minimize the risk of
        // accidentally matching something in the user's prompt.
        const contextRegex =
            /<context>\nWhen relevant, use the context below to better respond to the message above([\s\S]*?)<\/context>$/g;
        const contextMatch = contextRegex.exec(source);

        if (!contextMatch) {
            return { text: source.trim(), context: [] };
        }

        const contextContent = contextMatch[1];
        const context: RovoDevContextItem[] = [];

        // Parse individual file entries within context
        const fileRegex = /<file path="([^"]+)"[^>]*>\s*([^<]*)\s*<\/file>/g;
        let fileMatch;

        while ((fileMatch = fileRegex.exec(contextContent)) !== null) {
            const filePath = fileMatch[1];

            // Parse selection info if available (format: "path" selection="start-end")
            const selectionMatch = fileMatch[0].match(/selection="(\d+-\d+)"/);
            let selection: { start: number; end: number } | undefined;

            if (selectionMatch) {
                const [start, end] = selectionMatch[1].split('-').map(Number);
                selection = { start, end };
            }

            // Create context item for each file
            context.push({
                contextType: 'file',
                isFocus: false,
                enabled: true,
                file: {
                    name: filePath.split('/').pop() || filePath,
                    absolutePath: filePath,
                },
                selection: selection,
            });
        }

        return { text: source.replace(contextRegex, '').trim(), context };
    }

    private parseExceptionMessage(message: string) {
        let links: Parameters<typeof parseCustomCliTagsForMarkdown>[1] = [];
        let exceptionText = parseCustomCliTagsForMarkdown(message, links);

        if (links.length === 1) {
            exceptionText = exceptionText.replace('{link1}', '').trim();
        } else if (links.length > 1) {
            for (let i = 1; i <= links.length; ++i) {
                exceptionText = exceptionText.replace('{link' + i + '}', links[i - 1].link);
            }
            links = [];
        }

        return { text: exceptionText, link: links.length === 1 ? links[0] : undefined };
    }

    public executeAbortSignal() {
        this._abortController?.abort();
        this._abortController = null;
    }
}
