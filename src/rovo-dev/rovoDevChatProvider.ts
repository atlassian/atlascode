import { RovoDevLogger } from 'src/logger';
import { RovoDevViewResponse } from 'src/react/atlascode/rovo-dev/rovoDevViewMessages';
import { v4 } from 'uuid';
import { Event, Webview } from 'vscode';

import { RovoDevResponseParser } from './responseParser';
import { RovoDevResponse } from './responseParserInterfaces';
import { RovoDevApiClient } from './rovoDevApiClient';
import {
    RovoDevChatRequest,
    RovoDevChatRequestContextFileEntry,
    ToolPermissionChoice,
} from './rovoDevApiClientInterfaces';
import { RovoDevTelemetryProvider } from './rovoDevTelemetryProvider';
import { RovoDevPrompt, TechnicalPlan } from './rovoDevTypes';
import { RovoDevProviderMessage, RovoDevProviderMessageType } from './rovoDevWebviewProviderMessages';

interface TypedWebview<MessageOut, MessageIn> extends Webview {
    readonly onDidReceiveMessage: Event<MessageIn>;
    postMessage(message: MessageOut): Thenable<boolean>;
}

type StreamingApi = 'chat' | 'replay';

export class RovoDevChatProvider {
    private _pendingToolConfirmation: Record<string, ToolPermissionChoice | 'undecided'> = {};
    private _pendingToolConfirmationLeft = 0;
    private _pendingPrompt: RovoDevPrompt | undefined;
    private _currentPrompt: RovoDevPrompt | undefined;
    private _rovoDevApiClient: RovoDevApiClient | undefined;
    private _webView: TypedWebview<RovoDevProviderMessage, RovoDevViewResponse> | undefined;

    private _replayInProgress = false;

    private _yoloMode = false;
    public get yoloMode() {
        return this._yoloMode;
    }
    public set yoloMode(value: boolean) {
        this._yoloMode = value;
        if (value) {
            this.signalYoloModeEngaged();
        }
    }

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

    constructor(
        private readonly _isBoysenberry: boolean,
        private _telemetryProvider: RovoDevTelemetryProvider,
    ) {}

    public setWebview(webView: TypedWebview<RovoDevProviderMessage, RovoDevViewResponse> | undefined) {
        this._webView = webView;
    }

    public async setReady(rovoDevApiClient: RovoDevApiClient) {
        this._rovoDevApiClient = rovoDevApiClient;

        if (this._pendingPrompt) {
            const pendingPrompt = this._pendingPrompt;
            this._pendingPrompt = undefined;
            await this.internalExecuteChat(pendingPrompt, [], true);
        }
    }

    public shutdown() {
        this._rovoDevApiClient = undefined;
        this._pendingPrompt = undefined;
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

        const isCommand = text.trim() === '/clear' || text.trim() === '/prune';
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
            // Boysenberry is always in YOLO mode
            const response = await client.chat(requestPayload, !this._isBoysenberry);

            this._telemetryProvider.fireTelemetryEvent(
                'rovoDevPromptSentEvent',
                this._currentPromptId,
                !!requestPayload.enable_deep_plan,
            );

            return this.processChatResponse('chat', response);
        };

        await this.executeStreamingApiWithErrorHandling('chat', fetchOp);
    }

    public async executeReplay(): Promise<void> {
        if (!this._rovoDevApiClient) {
            throw new Error('Unable to replay the previous conversation. Rovo Dev failed to initialize');
        }

        this.beginNewPrompt('replay');

        this._replayInProgress = true;

        const fetchOp = async (client: RovoDevApiClient) => {
            const response = client.replay();
            return this.processChatResponse('replay', response);
        };

        await this.executeStreamingApiWithErrorHandling('replay', fetchOp);

        this._replayInProgress = false;
    }

    public async executeCancel(fromNewSession: boolean): Promise<boolean> {
        const webview = this._webView!;

        let success: boolean;
        if (this._rovoDevApiClient) {
            if (this._pendingCancellation) {
                throw new Error('Cancellation already in progress');
            }
            this._pendingCancellation = true;

            try {
                const cancelResponse = await this._rovoDevApiClient.cancel();
                success = cancelResponse.cancelled || cancelResponse.message === 'No chat in progress';
            } catch {
                await this.processError(new Error('Failed to cancel the current response. Please try again.'), false);
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
            });
        }

        // don't instrument the cancellation if it's coming from a 'New session' action
        // also, don't instrument the cancellation if it's done before initialization
        if (!fromNewSession && this._rovoDevApiClient) {
            this._telemetryProvider.fireTelemetryEvent(
                'rovoDevStopActionEvent',
                this.currentPromptId,
                success ? undefined : true,
            );
        }

        return success;
    }

    private beginNewPrompt(overrideId?: string): void {
        this._currentPromptId = overrideId || v4();
        this._telemetryProvider.startNewPrompt(this._currentPromptId);
    }

    private async processChatResponse(sourceApi: StreamingApi, fetchOp: Promise<Response> | Response) {
        const fireTelemetry = sourceApi === 'chat';
        const response = await fetchOp;
        if (!response.body) {
            throw new Error("Error processing the Rovo Dev's response: response is empty.");
        }

        if (fireTelemetry) {
            this._telemetryProvider.perfLogger.promptStarted(this._currentPromptId);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const parser =
            sourceApi === 'replay' ? new RovoDevResponseParser({ mergeAllChunks: true }) : new RovoDevResponseParser();

        let isFirstByte = true;
        let isFirstMessage = true;

        while (true) {
            const { done, value } = await reader.read();

            if (fireTelemetry && isFirstByte) {
                this._telemetryProvider.perfLogger.promptFirstByteReceived(this._currentPromptId);
                isFirstByte = false;
            }

            if (done) {
                // last response of the stream -> fire performance telemetry event
                if (fireTelemetry) {
                    this._telemetryProvider.perfLogger.promptLastMessageReceived(this._currentPromptId);
                }

                for (const msg of parser.flush()) {
                    await this.processRovoDevResponse(sourceApi, msg);
                }
                break;
            }

            const data = decoder.decode(value, { stream: true });
            for (const msg of parser.parse(data)) {
                if (fireTelemetry && isFirstMessage) {
                    this._telemetryProvider.perfLogger.promptFirstMessageReceived(this._currentPromptId);
                    isFirstMessage = false;
                }

                await this.processRovoDevResponse(sourceApi, msg);
            }
        }
    }

    private processRovoDevResponse(sourceApi: StreamingApi, response: RovoDevResponse): Thenable<unknown> {
        // if (this._processState === RovoDevProcessState.Disabled) {
        //     return Promise.resolve(false);
        // }

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
                    this._telemetryProvider.perfLogger.promptTechnicalPlanReceived(this._currentPromptId);

                    const parsedContent = response.parsedContent as TechnicalPlan;
                    const stepsCount = parsedContent.logicalChanges.length;
                    const filesCount = parsedContent.logicalChanges.reduce((p, c) => p + c.filesToChange.length, 0);
                    const questionsCount = parsedContent.logicalChanges.reduce(
                        (p, c) => p + c.filesToChange.reduce((p2, c2) => p2 + (c2.clarifyingQuestionIfAny ? 1 : 0), 0),
                        0,
                    );

                    this._telemetryProvider.fireTelemetryEvent(
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
                if (this._replayInProgress) {
                    this._currentPrompt = {
                        text: response.content,
                        enable_deep_plan: false,
                        context: [],
                    };
                    return this.signalPromptSent(
                        { text: response.content, enable_deep_plan: false, context: [] },
                        true,
                    );
                }
                return Promise.resolve(false);

            case 'exception':
                const msg = response.title ? `${response.title} - ${response.message}` : response.message;
                return this.processError(new Error(msg), false);

            case 'warning':
                return webview.postMessage({
                    type: RovoDevProviderMessageType.ShowDialog,
                    message: {
                        type: 'warning',
                        text: response.message,
                        title: response.title,
                        source: 'RovoDevDialog',
                    },
                });

            case 'clear':
                return webview.postMessage({
                    type: RovoDevProviderMessageType.ClearChat,
                });

            case 'prune':
                return webview.postMessage({
                    type: RovoDevProviderMessageType.ShowDialog,
                    message: {
                        type: 'info',
                        text: response.message,
                        source: 'RovoDevDialog',
                    },
                });

            case 'on_call_tools_start':
                this._pendingToolConfirmation = {};
                this._pendingToolConfirmationLeft = 0;

                if (this.yoloMode) {
                    const yoloChoices: RovoDevChatProvider['_pendingToolConfirmation'] = {};
                    response.tools.forEach((x) => (yoloChoices[x.tool_call_id] = 'allow'));
                    return this._rovoDevApiClient!.resumeToolCall(yoloChoices);
                } else {
                    response.tools.forEach((x) => (this._pendingToolConfirmation[x.tool_call_id] = 'undecided'));
                    this._pendingToolConfirmationLeft = response.tools.length;

                    const promises = response.tools.map((tool) => {
                        return webview.postMessage({
                            type: RovoDevProviderMessageType.ShowDialog,
                            message: {
                                type: 'toolPermissionRequest',
                                source: 'RovoDevDialog',
                                toolName: tool.tool_name,
                                toolArgs: tool.args,
                                mcpServer: tool.mcp_server,
                                text: 'To do this I will need to',
                                toolCallId: tool.tool_call_id,
                            },
                        });
                    });
                    return Promise.all(promises);
                }

            case 'close':
                // response terminated
                return Promise.resolve(true);

            default:
                // @ts-expect-error ts(2339) - response here should be 'never'
                throw new Error(`Rovo Dev response error: unknown event kind: ${response.event_kind}`);
        }
    }

    public async signalToolRequestChoiceSubmit(toolCallId: string, choice: ToolPermissionChoice) {
        if (!this._pendingToolConfirmation[toolCallId]) {
            throw new Error('Received an unexpected tool confirmation: not found.');
        }
        if (this._pendingToolConfirmation[toolCallId] !== 'undecided') {
            throw new Error('Received an unexpected tool confirmation: already confirmed.');
        }

        this._pendingToolConfirmation[toolCallId] = choice;

        if (--this._pendingToolConfirmationLeft <= 0) {
            await this._rovoDevApiClient!.resumeToolCall(this._pendingToolConfirmation);
            this._pendingToolConfirmation = {};
        }
    }

    private async signalYoloModeEngaged() {
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

    private async executeStreamingApiWithErrorHandling(
        sourceApi: StreamingApi,
        func: (client: RovoDevApiClient) => Promise<any>,
    ): Promise<void> {
        const webview = this._webView!;

        if (this._rovoDevApiClient) {
            try {
                await func(this._rovoDevApiClient);
            } catch (error) {
                // the error is retriable only when it happens during the streaming of a 'chat' response
                await this.processError(error, sourceApi === 'chat');
            }
        } else {
            await this.processError(new Error('RovoDev client not initialized'), false);
        }

        // whatever happens, at the end of the streaming API we need to tell the webview
        // that the generation of the response has finished
        await webview.postMessage({
            type: RovoDevProviderMessageType.CompleteMessage,
            isReplay: sourceApi === 'replay',
        });
    }

    private processError(error: Error, isRetriable: boolean, isProcessTerminated?: boolean) {
        RovoDevLogger.error(error);

        const webview = this._webView!;
        return webview.postMessage({
            type: RovoDevProviderMessageType.ShowDialog,
            message: {
                type: 'error',
                text: error.message,
                source: 'RovoDevDialog',
                isRetriable,
                isProcessTerminated,
                uid: v4(),
            },
        });
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
            .filter((x) => x.enabled)
            .map((x) => ({
                type: 'file' as const,
                file_path: x.file.absolutePath,
                selection: x.selection,
                note: 'I currently have this file open in my IDE',
            }));

        return {
            message: prompt.text,
            enable_deep_plan: prompt.enable_deep_plan,
            context: fileContext,
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
}
