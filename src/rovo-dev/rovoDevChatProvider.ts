import { Logger } from 'src/logger';
import { getProductName } from 'src/rovo-dev/api/rovodevStaticConfig';
import { RovoDevViewResponse } from 'src/rovo-dev/ui/rovoDevViewMessages';
import { v4 } from 'uuid';
import { commands, Event, EventEmitter } from 'vscode';

import { Container } from '../container';
import { Track } from './analytics/events';
import { ExtensionApi } from './api/extensionApi';
import {
    AgentMode,
    RovoDevApiClient,
    RovoDevApiError,
    RovoDevAskUserQuestionsToolArgs,
    RovoDevChatRequest,
    RovoDevChatRequestContext,
    RovoDevChatRequestContextFileEntry,
    RovoDevChatRequestContextOtherEntry,
    RovoDevDeferredToolCallResponse,
    RovoDevExitPlanModeToolArgs,
    RovoDevResponse,
    RovoDevResponseParser,
    RovoDevToolCallResponse,
    RovoDevToolName,
    ToolPermissionChoice,
} from './client';
import { buildErrorDetails, buildExceptionDetails } from './errorDetailsBuilder';
import { RovoDevTelemetryProvider } from './rovoDevTelemetryProvider';
import { RovoDevContextItem, RovoDevFileContext, RovoDevJiraContext, RovoDevPrompt } from './rovoDevTypes';
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

const FILE_MODIFYING_TOOLS: ReadonlySet<RovoDevToolName> = new Set<RovoDevToolName>([
    'create_file',
    'delete_file',
    'move_file',
    'find_and_replace_code',
]);

export class RovoDevChatProvider {
    private readonly extensionApi = new ExtensionApi();
    private readonly isDebugging = this.extensionApi.metadata.isDebugging();

    private _onAgentModelChanged = new EventEmitter<void>();
    public get onAgentModelChanged(): Event<void> {
        return this._onAgentModelChanged.event;
    }

    private _onPromptComplete = new EventEmitter<void>();
    public get onPromptComplete(): Event<void> {
        return this._onPromptComplete.event;
    }

    private _onFileModifyingToolReturn = new EventEmitter<void>();
    public get onFileModifyingToolReturn(): Event<void> {
        return this._onFileModifyingToolReturn.event;
    }

    private _pendingToolConfirmation: Record<string, ToolPermissionChoice | 'undecided'> = {};
    private _pendingToolConfirmationLeft = 0;
    private _pendingDeferredRequest: string | undefined;
    private _pendingPrompt: RovoDevPrompt | undefined;
    private _currentPrompt: RovoDevPrompt | undefined;
    private _rovoDevApiClient: RovoDevApiClient | undefined;
    private _webView: TypedWebview<RovoDevProviderMessage, RovoDevViewResponse> | undefined;
    private _onUnauthorizedCallback: (() => Promise<void>) | undefined;

    /**
     * Bounded LRU of `promptId`s for which `rovoDevPromptCompleted` has already
     * been fired. Used to enforce the exactly-once-per-prompt invariant on the
     * `rovoDevPromptCompleted` telemetry event without unbounded memory growth.
     *
     * Insertion-ordered (a `Set` preserves insertion order); when the cap is
     * exceeded the oldest entry is evicted. The cap is set well above the
     * realistic number of concurrent in-flight + recently-finished prompts.
     */
    private _completedPromptIds: Set<string> = new Set<string>();
    private static readonly _completedPromptIdsCap = 64;
    /** Counts user-visible message parts seen during the current prompt's stream. */
    private _currentPromptUserVisiblePartsCount = 0;

    private _replayInProgress = false;
    private _lastMessageSentTime: number | undefined;

    // true while a live-preview stream is being processed (drives non-retriable
    // errors and restoring the button when the attempt doesn't start a preview)
    private _livePreviewInProgress = false;
    // set when a `configure_live_preview` tool-call is seen, i.e. the preview started
    private _livePreviewStarted = false;

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

    public get isAgentRunning(): boolean {
        return this._abortController !== null;
    }

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

    /**
     * Clears session-scoped state (e.g. pending deferred tool call) so the next
     * prompt is sent as a normal message instead of tool call results. Call when
     * starting a new session or clearing the chat so the backend is not sent
     * tool_call_id + result when message history is empty.
     */
    public clearSessionState(): void {
        this._pendingDeferredRequest = undefined;
        this._currentPrompt = undefined;
        this._pendingPrompt = undefined;
    }

    public async clearChat(): Promise<void> {
        this.clearSessionState();
        await this._webView!.postMessage({
            type: RovoDevProviderMessageType.ClearChat,
        });
    }

    public executeChat(prompt: RovoDevPrompt, revertedFiles: string[]) {
        return this.internalExecuteChat(prompt, revertedFiles, false);
    }

    private async internalExecuteChat(
        { text, context }: RovoDevPrompt,
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
            context = [];
        }

        // when flushing a pending prompt, we don't want to echo the prompt in chat again
        await this.signalPromptSent({ text, context }, !flushingPendingPrompt);

        if (!this._rovoDevApiClient) {
            this._pendingPrompt = { text, context };
            return;
        }

        this._currentPrompt = {
            text,
            context,
        };

        const requestPayload = this.preparePayloadForChatRequest(this._currentPrompt);

        // if there's a pending deferred tool call, attach the tool_call_id and the result to the next prompt payload to bypass
        if (this._pendingDeferredRequest) {
            requestPayload.message = {
                tool_call_id: this._pendingDeferredRequest,
                result: {
                    proceed: false,
                    followUp: text,
                },
            };
            this._pendingDeferredRequest = undefined;
        }

        if (!isCommand) {
            if (this.fullContextMode && typeof requestPayload.message === 'string') {
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

    public async executeDeferredToolCall(payload: RovoDevDeferredToolCallResponse) {
        const chatRequestPayload: RovoDevChatRequest = {
            message: payload,
            context: [],
        };
        this._pendingDeferredRequest = undefined;
        await this.sendPromptToRovoDev(chatRequestPayload);
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
                },
            });

            return this.processResponse('chat', response);
        };

        await this.executeStreamingApiWithErrorHandling('chat', fetchOp);
        this._abortController = null;
    }

    public async executeReplay(): Promise<void> {
        if (!this._rovoDevApiClient) {
            const error = new Error(
                `Unable to replay the previous conversation. ${getProductName()} failed to initialize`,
            );
            RovoDevTelemetryProvider.logError(
                error,
                `Cannot replay conversation - ${getProductName()} not initialized`,
            );
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

        // Clear any pending deferred tool call so the next user prompt is sent
        // as a plain message instead of a tool-call response.  Without this the
        // backend would reject the prompt with "Cannot provide a new user prompt
        // when the message history contains unprocessed tool calls".
        this._pendingDeferredRequest = undefined;

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

            // Fire the terminal `rovoDevPromptCompleted` for this prompt so the
            // chat-response SLO sees a cancelled outcome. We only emit when the
            // cancel actually succeeded; a failed cancel leaves the stream
            // running, in which case the eventual stream-end path will classify
            // the prompt instead.
            if (success) {
                this.firePromptCompleted('cancelled', { errorReason: 'aborted' });
            }
        }

        return success;
    }

    private beginNewPrompt(overrideId?: string): void {
        this._currentPromptId = overrideId || v4();
        // Reset the per-prompt user-visible message-part counter so that the
        // `no_response` vs `success` classification at the end of the stream
        // reflects only this prompt.
        this._currentPromptUserVisiblePartsCount = 0;
        this._telemetryProvider.startNewPrompt(this._currentPromptId);
    }

    private async processResponse(sourceApi: StreamingApi, fetchOp: Promise<Response> | Response) {
        const telemetryProvider = sourceApi === 'replay' ? undefined : this._telemetryProvider;

        const response = await fetchOp;
        if (!response.body) {
            const error = new Error(`Error processing the ${getProductName()}'s response: response is empty.`);
            RovoDevTelemetryProvider.logError(error, `Received empty response from ${getProductName()}`);
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

                // Count user-visible parts so the terminal classification can
                // distinguish a successful response from a stream that ended
                // without delivering anything (`no_response`). Only the chat
                // path participates in the SLO.
                if (sourceApi === 'chat' && this.isUserVisiblePart(msg)) {
                    this._currentPromptUserVisiblePartsCount++;
                }

                await this.processRovoDevResponse(sourceApi, msg);
            }
        }

        // last response of the stream -> fire performance telemetry event
        telemetryProvider?.perfLogger.promptLastMessageReceived(this._currentPromptId);

        // Store timestamp for render time measurement (for both chat and replay)
        this._lastMessageSentTime = performance.now();

        for (const msg of parser.flush()) {
            if (sourceApi === 'chat' && this.isUserVisiblePart(msg)) {
                this._currentPromptUserVisiblePartsCount++;
            }
            await this.processRovoDevResponse(sourceApi, msg);
        }

        // Rovo Dev can change agent mid-response to a fallback model when the main one is troublesome.
        // While we should handle such events in real time, this is meant to capture anything that we
        // may have missed, and make sure the agent selector is always in sync with Rovo Dev
        this._onAgentModelChanged.fire();

        // Terminal classification for the SLO:
        //   - `success` ⇒ at least one user-visible part was rendered.
        //   - `no_response` ⇒ stream ended cleanly but no part was rendered
        //     (e.g. backend returned an empty stream).
        // The dedupe Set ensures this is a no-op if a mid-stream error already
        // classified the prompt (e.g. `_parsing_error`, `exception`).
        if (sourceApi === 'chat') {
            const partsCount = this._currentPromptUserVisiblePartsCount;
            if (partsCount > 0) {
                this.firePromptCompleted('success', { messagePartsCount: partsCount });
            } else {
                this.firePromptCompleted('error', {
                    errorReason: 'no_response',
                    messagePartsCount: 0,
                });
            }
        }
    }

    /**
     * Whether a streamed `RovoDevResponse` represents a "user-visible" message
     * part for the purposes of the chat-response SLO. Text and tool activity
     * count as user-visible output; control / lifecycle events (warnings,
     * prune notices, replay markers, dialog signals, …) do not.
     */
    private isUserVisiblePart(response: RovoDevResponse): boolean {
        switch (response.event_kind) {
            case 'text':
            case 'tool-call':
            case 'tool-return':
                return true;
            default:
                return false;
        }
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

    private async processDeferredToolCallResponse(deferredTool: RovoDevToolCallResponse): Promise<void> {
        const webview = this._webView!;

        try {
            this._pendingDeferredRequest = deferredTool.tool_call_id;
            switch (deferredTool.tool_name) {
                case 'ask_user_questions':
                    const askUserQuestionsArgs = (
                        deferredTool.args && typeof deferredTool.args === 'string'
                            ? JSON.parse(deferredTool.args)
                            : deferredTool.args
                    ) as RovoDevAskUserQuestionsToolArgs;
                    await webview.postMessage({
                        type: RovoDevProviderMessageType.ShowDeferredAskUserQuestions,
                        toolCallId: deferredTool.tool_call_id,
                        args: askUserQuestionsArgs,
                    });
                    break;
                case 'exit_plan_mode':
                    const exitPlanModeArgs = (
                        typeof deferredTool.args === 'string' ? JSON.parse(deferredTool.args) : deferredTool.args
                    ) as RovoDevExitPlanModeToolArgs;
                    await webview.postMessage({
                        type: RovoDevProviderMessageType.ShowDeferredExitPlanMode,
                        toolCallId: deferredTool.tool_call_id,
                        args: exitPlanModeArgs,
                    });
                    break;
                default:
                    throw new Error(`Unknown deferred tool call: ${deferredTool.tool_name}`);
            }
        } catch (error) {
            const err =
                error instanceof Error ? error : new Error('Failed to process the deferred tool call response.');
            await this.processError(err);
            // If parsing deferred tool request failed, we should still send a response to Rovo Dev to avoid blocking the agent's execution
            await this.executeDeferredToolCall({
                tool_call_id: deferredTool.tool_call_id,
                result: err.message,
            });
        }
    }

    private async processRovoDevResponse(sourceApi: StreamingApi, response: RovoDevResponse): Promise<void> {
        const webview = this._webView!;

        switch (response.event_kind) {
            case 'text':
                await webview.postMessage({
                    type: RovoDevProviderMessageType.RovoDevResponseMessage,
                    message: response,
                });
                break;

            case 'tool-call': {
                await webview.postMessage({
                    type: RovoDevProviderMessageType.RovoDevResponseMessage,
                    message: response,
                });
                if (response.tool_name === 'configure_live_preview' && sourceApi !== 'replay') {
                    this._livePreviewStarted = true;
                    webview
                        .postMessage({
                            type: RovoDevProviderMessageType.ShowLivePreviewButton,
                            show: false,
                        })
                        .then(null, (ex) => {
                            Logger.error(ex, 'Error while sending hide live preview button message');
                        });
                    try {
                        const args = typeof response.args === 'string' ? JSON.parse(response.args) : response.args;
                        if (args.port) {
                            await commands.executeCommand('workbench.action.launchLivePreview', args.port, {
                                showPreview: true,
                            });
                        }
                    } catch (e) {
                        Logger.error(e, 'Failed to parse configure_live_preview args');
                    }
                }
                break;
            }
            case 'tool-return':
                await webview.postMessage({
                    type: RovoDevProviderMessageType.RovoDevResponseMessage,
                    message: response,
                });
                if (FILE_MODIFYING_TOOLS.has(response.tool_name as RovoDevToolName)) {
                    this._onFileModifyingToolReturn.fire();
                }
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
                        context: context,
                    };
                    await this.signalPromptSent({ text, context }, true);
                }
                break;

            case '_parsing_error':
                // Terminal classification for this prompt. The dedupe Set in
                // firePromptCompleted ensures the later `success` emit from
                // processResponse's normal exit path becomes a no-op.
                if (sourceApi !== 'replay') {
                    this.firePromptCompleted('parse_error', { errorReason: 'parsing_error' });
                }
                await this.processError(response.error, { showOnlyInDebug: true });
                break;

            case 'exception': {
                // Handle InvalidPromptError for unsupported slash commands as a warning instead of an error
                if (
                    response.type.toLowerCase().includes('invalidprompt') &&
                    response.message.includes('Unknown command:')
                ) {
                    // Extract the command name from the message (e.g., "Unknown command: /model" -> "/model")
                    const commandMatch = response.message.match(/Unknown command:\s*(\/\S+)/);
                    const command = commandMatch ? commandMatch[1] : 'the command you entered';

                    await webview.postMessage({
                        type: RovoDevProviderMessageType.ShowDialog,
                        message: {
                            event_kind: '_RovoDevDialog',
                            type: 'warning',
                            title: 'Unsupported Command',
                            text: `The command ${command} is not supported.`,
                        },
                    });
                    break;
                }

                RovoDevTelemetryProvider.logError(
                    new Error(`${response.type} ${response.message}`),
                    response.title || undefined,
                    ...(response.params || []),
                );

                // Terminal classification: an `exception` event_kind from the
                // stream means the agent surfaced a hard error mid-response.
                // Replay path never fires PromptCompleted.
                if (sourceApi !== 'replay') {
                    this.firePromptCompleted('error', { errorReason: 'stream_exception' });
                }

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

            case 'deferred_request':
                const deferredTool = response.tools[0]; // currently we only support one deferred tool call at a time, so we take the first one from the array
                this.processDeferredToolCallResponse(deferredTool);
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
                            title: `You've reached your ${getProductName()} credit limit`,
                            text: alert_message.message
                                .replace('{title}', response.data.content.title)
                                .replace('{ctaLink}', ''),
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

            case 'ui_changes_detected':
                // Only show live preview button in Boysenberry
                if (!Container.isBoysenberryMode) {
                    return;
                }
                // Check feature flag enabled for live preview
                let isLivePreviewFeatureEnabled = false;
                if ('SANDBOX_ENABLE_LIVE_PREVIEW' in process.env && process.env.SANDBOX_ENABLE_LIVE_PREVIEW) {
                    try {
                        isLivePreviewFeatureEnabled = Boolean(JSON.parse(process.env.SANDBOX_ENABLE_LIVE_PREVIEW));
                    } catch {
                        // ignore parsing error and treat it as the feature being disabled
                    }
                }
                if (!isLivePreviewFeatureEnabled) {
                    return;
                }

                await webview.postMessage({
                    type: RovoDevProviderMessageType.ShowLivePreviewButton,
                    show: true,
                });
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
                const error = new Error(
                    `${getProductName()} response error: unknown event kind: ${(response as any).event_kind}`,
                );
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
                if (error.name === 'AbortError' || (error instanceof TypeError && error.message === 'terminated')) {
                    // Unexpected mid-stream abort that did not go through
                    // executeCancel (which would have already emitted
                    // 'cancelled'). The dedupe Set keeps this a no-op when the
                    // user-initiated cancel already classified the prompt.
                    if (sourceApi === 'chat') {
                        this.firePromptCompleted('cancelled', { errorReason: 'aborted' });
                    }
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
                        // Intentionally do NOT emit rovoDevPromptCompleted here:
                        // the user will re-authenticate and the next prompt
                        // (or retry) provides a clean SLO sample.
                        await this._onUnauthorizedCallback();
                        return;
                    }
                }
                // Terminal classification for fetch / HTTP / reader errors.
                // Replay path is excluded — the SLO only covers user-submitted
                // prompts. The dedupe Set ensures that if an in-stream event
                // (e.g. `_parsing_error` or `exception`) already classified
                // this prompt, this call becomes a no-op.
                if (sourceApi === 'chat') {
                    const { errorReason, httpStatus } = this.classifyStreamingError(error);
                    this.firePromptCompleted('error', {
                        errorReason,
                        ...(httpStatus !== undefined ? { httpStatus } : {}),
                    });
                }
                // retriable only for a 'chat' response; live-preview retries via the restored button
                await this.processError(error, {
                    isRetriable: sourceApi === 'chat' && !this._livePreviewInProgress,
                });
            }
        } else {
            if (sourceApi === 'chat') {
                this.firePromptCompleted('error', { errorReason: 'unknown' });
            }
            await this.processError(new Error('RovoDev client not initialized'));
        }

        // whatever happens, at the end of the streaming API we need to tell the webview
        // that the generation of the response has finished
        await webview.postMessage({
            type: RovoDevProviderMessageType.CompleteMessage,
            promptId: this._currentPromptId,
        });

        // Signal that the prompt is complete so listeners can refresh data
        this._onPromptComplete.fire();
    }

    /**
     * Classify a thrown error from the streaming-API catch block into a
     * `PromptCompletedErrorReason` and (when applicable) an HTTP status code.
     * Kept in one place so the chat-response SLO classification stays in sync
     * with the user-facing error dialog logic in `processError`.
     */
    private classifyStreamingError(error: unknown): {
        errorReason: Track.PromptCompletedErrorReason;
        httpStatus?: number;
    } {
        if (error instanceof RovoDevApiError && typeof error.httpStatus === 'number') {
            const status = error.httpStatus;
            if (status >= 500 && status < 600) {
                return { errorReason: 'http_5xx', httpStatus: status };
            }
            if (status >= 400 && status < 500) {
                return { errorReason: 'http_4xx', httpStatus: status };
            }
        }
        return { errorReason: 'network_error' };
    }

    /**
     * Emit the terminal `rovoDevPromptCompleted` event for the current prompt.
     *
     * Enforces the exactly-once-per-prompt invariant via `_completedPromptIds`,
     * so it is safe to call from multiple terminal paths (in-stream exception,
     * parse error, fetch error catch block, normal stream end, user cancel) for
     * the same prompt — the first call wins.
     *
     * Only emits when running in Boysenberry mode — this event exists solely to
     * drive the chat-response SLO computed on the host Jira page via the
     * VSCode → Jira analytics bridge. In the standard IDE there is no consumer
     * for the event and emitting it would just add noise to the analytics
     * pipeline.
     *
     * Never emits for the replay streaming path (the caller should not invoke
     * this with `sourceApi === 'replay'`).
     */
    private firePromptCompleted(
        result: Track.PromptCompletedResult,
        extras: {
            errorReason?: Track.PromptCompletedErrorReason;
            httpStatus?: number;
            messagePartsCount?: number;
        } = {},
    ): void {
        if (!this._isBoysenberry) {
            return;
        }

        const promptId = this._currentPromptId;
        if (!promptId || this._completedPromptIds.has(promptId)) {
            return; // exactly-once dedupe
        }

        // Bounded LRU: evict oldest entry when at cap. `Set` preserves insertion order.
        if (this._completedPromptIds.size >= RovoDevChatProvider._completedPromptIdsCap) {
            const oldest = this._completedPromptIds.values().next().value;
            if (oldest !== undefined) {
                this._completedPromptIds.delete(oldest);
            }
        }
        this._completedPromptIds.add(promptId);

        this._telemetryProvider.fireTelemetryEvent({
            action: 'rovoDevPromptCompleted',
            subject: 'atlascode',
            attributes: {
                promptId,
                result,
                ...(extras.errorReason !== undefined ? { errorReason: extras.errorReason } : {}),
                ...(extras.httpStatus !== undefined ? { httpStatus: extras.httpStatus } : {}),
                ...(extras.messagePartsCount !== undefined ? { messagePartsCount: extras.messagePartsCount } : {}),
            },
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

    private async signalPromptSent({ text, context }: RovoDevPrompt, echoMessage: boolean) {
        const webview = this._webView!;
        return await webview.postMessage({
            type: RovoDevProviderMessageType.SignalPromptSent,
            echoMessage,
            text,
            context,
        });
    }

    /**
     * Triggers a live-preview request on the agent, then streams the agent's response into the
     * chat exactly like a normal user-initiated chat would. Used by the Live Preview button —
     * clicking that button causes the agent to behave as if the user had asked it to start a
     * live preview, so we:
     *   1. Begin a fresh prompt (new promptId + telemetry bucket).
     *   2. Tell the webview to enter "GeneratingResponse" mode without echoing a user-message
     *      bubble (echoMessage = false).
     *   3. POST `/v3/live-preview` and pipe its SSE body through the same `processResponse`
     *      pipeline used for `executeChat`, so text parts, tool-calls, and tool-returns all
     *      render in the chat as they stream in.
     */
    public async executeLivePreview(): Promise<void> {
        if (!this._rovoDevApiClient) {
            const error = new Error(`Unable to start live preview. ${getProductName()} failed to initialize`);
            RovoDevTelemetryProvider.logError(error, `Cannot start live preview - ${getProductName()} not initialized`);
            throw error;
        }
        if (!this._webView) {
            return;
        }

        // Backstop against the HTTP 409 "agent busy" race: `/v3/live-preview` starts a
        // `stream_chat`, which the backend rejects if one is already in flight.
        if (this.isAgentRunning) {
            Logger.info('Ignoring live preview request: the agent is already running');
            // Restore the button (hidden optimistically on click) without touching the
            // running response's state, so it reappears once the response finishes.
            await this._webView.postMessage({
                type: RovoDevProviderMessageType.ShowLivePreviewButton,
                show: true,
            });
            return;
        }

        this._livePreviewInProgress = true;
        this._livePreviewStarted = false;

        this.beginNewPrompt();
        await this.signalPromptSent({ text: 'Start a live preview for this project', context: [] }, true);

        const fetchOp = async (client: RovoDevApiClient) => {
            this._abortController = new AbortController();

            const response = client.createLivePreview(this._abortController.signal);
            return this.processResponse('chat', response);
        };

        try {
            await this.executeStreamingApiWithErrorHandling('chat', fetchOp);
        } finally {
            this._abortController = null;

            // if the preview never started, restore the button so the user can retry
            if (!this._livePreviewStarted && this._webView) {
                await this._webView.postMessage({
                    type: RovoDevProviderMessageType.ShowLivePreviewButton,
                    show: true,
                });
            }

            this._livePreviewInProgress = false;
        }
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
