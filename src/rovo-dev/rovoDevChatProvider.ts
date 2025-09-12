import { Logger } from 'src/logger';
import { RovoDevViewResponse } from 'src/react/atlascode/rovo-dev/rovoDevViewMessages';
import { v4 } from 'uuid';
import { Event, Webview } from 'vscode';

import { RovoDevResponse, RovoDevResponseParser } from './responseParser';
import { RovoDevApiClient, RovoDevChatRequest, RovoDevChatRequestContextFileEntry } from './rovoDevApiClient';
import { RovoDevTelemetryProvider } from './rovoDevTelemetryProvider';
import { RovoDevContextItem, RovoDevPrompt, TechnicalPlan } from './rovoDevTypes';
import { RovoDevProviderMessage, RovoDevProviderMessageType } from './rovoDevWebviewProviderMessages';

interface TypedWebview<MessageOut, MessageIn> extends Webview {
    readonly onDidReceiveMessage: Event<MessageIn>;
    postMessage(message: MessageOut): Thenable<boolean>;
}

export class RovoDevChatProvider {
    private _pendingPrompt: RovoDevPrompt | undefined;
    private _currentPrompt: RovoDevPrompt | undefined;
    private _rovoDevApiClient: RovoDevApiClient | undefined;
    private _webView: TypedWebview<RovoDevProviderMessage, RovoDevViewResponse> | undefined;

    private _replayInProgress = false;

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

    constructor(private _telemetryProvider: RovoDevTelemetryProvider) {}

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

        if (!flushingPendingPrompt) {
            await this.sendUserPromptToView(text, context);
        }

        await this.sendPromptSentToView(text, enable_deep_plan, context);

        if (!this._rovoDevApiClient) {
            this._pendingPrompt = { text, enable_deep_plan, context };
            return;
        }

        this.beginNewPrompt();

        this._currentPrompt = {
            text,
            enable_deep_plan,
            context,
        };

        const requestPayload = this.preparePayloadForChatRequest(this._currentPrompt);

        if (!isCommand) {
            this.addUndoContextToPrompt(requestPayload, revertedFiles);
        }

        const currentPrompt = this._currentPrompt;
        const fetchOp = async (client: RovoDevApiClient) => {
            const response = await client.chat(requestPayload);

            this._telemetryProvider.fireTelemetryEvent(
                'rovoDevPromptSentEvent',
                this._currentPromptId,
                !!currentPrompt.enable_deep_plan,
            );

            return this.processChatResponse('chat', response);
        };

        await this.executeApiWithErrorHandling(fetchOp, true);
    }

    public async executeReplay(): Promise<void> {
        if (!this._rovoDevApiClient) {
            throw new Error('Unable to replay the previous conversation. Rovo Dev failed to initialize');
        }

        this.beginNewPrompt('replay');
        await this.sendPromptSentToView('', false, []);

        this._replayInProgress = true;

        await this.executeApiWithErrorHandling(async (client) => {
            return this.processChatResponse('replay', client.replay());
        }, false);

        this._replayInProgress = false;
    }

    public async executeRetryPromptAfterError() {
        if (!this._currentPrompt) {
            return;
        }

        this.beginNewPrompt();

        const currentPrompt = this._currentPrompt;
        const requestPayload = this.preparePayloadForChatRequest(currentPrompt);
        this.addRetryAfterErrorContextToPrompt(requestPayload);

        // we need to echo back the prompt to the View since it's not user submitted
        await this.sendPromptSentToView(requestPayload.message, currentPrompt.enable_deep_plan, currentPrompt.context);

        const fetchOp = async (client: RovoDevApiClient) => {
            const response = await client.chat(requestPayload);

            this._telemetryProvider.fireTelemetryEvent(
                'rovoDevPromptSentEvent',
                this._currentPromptId,
                !!requestPayload.enable_deep_plan,
            );

            return this.processChatResponse('chat', response);
        };

        await this.executeApiWithErrorHandling(fetchOp, true);
    }

    public async executeCancel(fromNewSession: boolean): Promise<boolean> {
        const webview = this._webView!;

        let success: boolean;
        if (this._rovoDevApiClient) {
            if (this._pendingCancellation) {
                throw new Error('Cancellation already in progress');
            }
            this._pendingCancellation = true;

            const cancelResponse = await this.executeApiWithErrorHandling((client) => client.cancel(), false);

            this._pendingCancellation = false;

            success =
                !!cancelResponse && (cancelResponse.cancelled || cancelResponse.message === 'No chat in progress');

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

    private async processChatResponse(sourceApi: 'chat' | 'replay', fetchOp: Promise<Response> | Response) {
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

        // Send final complete message when stream ends
        await this.completeChatResponse(sourceApi);
    }

    private completeChatResponse(sourceApi: 'replay' | 'chat' | 'error') {
        // if (this._processState === RovoDevProcessState.Disabled) {
        //     return Promise.resolve(false);
        // }

        const webview = this._webView!;
        return webview.postMessage({
            type: RovoDevProviderMessageType.CompleteMessage,
            isReplay: sourceApi === 'replay',
        });
    }

    private processRovoDevResponse(sourceApi: 'chat' | 'replay', response: RovoDevResponse): Thenable<boolean> {
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
                    return this.sendUserPromptToView(response.content);
                }
                return Promise.resolve(false);

            case 'exception':
                const msg = response.title ? `${response.title} - ${response.message}` : response.message;
                return this.processError(new Error(msg), false);

            case 'warning':
                return webview.postMessage({
                    type: RovoDevProviderMessageType.ErrorMessage,
                    message: {
                        type: 'warning',
                        text: response.message,
                        title: response.title,
                        source: 'RovoDevError',
                        isRetriable: false,
                        uid: v4(),
                    },
                });

            case 'clear':
                return webview.postMessage({
                    type: RovoDevProviderMessageType.ClearChat,
                });

            case 'prune':
                return webview.postMessage({
                    type: RovoDevProviderMessageType.ErrorMessage,
                    message: {
                        type: 'info',
                        text: response.message,
                        source: 'RovoDevError',
                        isRetriable: false,
                        uid: v4(),
                    },
                });

            default:
                return Promise.resolve(false);
        }
    }

    private async executeApiWithErrorHandling<T>(
        func: (client: RovoDevApiClient) => Promise<T>,
        isErrorRetriable: boolean,
    ): Promise<T | void> {
        if (this._rovoDevApiClient) {
            try {
                return await func(this._rovoDevApiClient);
            } catch (error) {
                await this.processError(error, isErrorRetriable);
            }
        } else {
            await this.processError(new Error('RovoDev client not initialized'), false);
        }
    }

    private processError(error: Error, isRetriable: boolean, isProcessTerminated?: boolean) {
        Logger.error('RovoDev', error);

        const webview = this._webView!;
        return webview.postMessage({
            type: RovoDevProviderMessageType.ErrorMessage,
            message: {
                type: 'error',
                text: error.message,
                source: 'RovoDevError',
                isRetriable,
                isProcessTerminated,
                uid: v4(),
            },
        });
    }

    private async sendUserPromptToView(text: string, context?: RovoDevContextItem[]) {
        const webview = this._webView!;

        return await webview.postMessage({
            type: RovoDevProviderMessageType.UserChatMessage,
            message: {
                text: text,
                source: 'User',
                context: context,
            },
        });
    }

    private async sendPromptSentToView(text: string, enable_deep_plan: boolean, context: RovoDevContextItem[]) {
        const webview = this._webView!;

        return await webview.postMessage({
            type: RovoDevProviderMessageType.PromptSent,
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
