import { Logger } from 'src/logger';
import { RovoDevViewResponse } from 'src/react/atlascode/rovo-dev/rovoDevViewMessages';
import { v4 } from 'uuid';
import { Event, Webview } from 'vscode';

import { RovoDevResponse, RovoDevResponseParser } from './responseParser';
import { RovoDevApiClient } from './rovoDevApiClient';
import { RovoDevTelemetryProvider } from './rovoDevTelemetryProvider';
import { RovoDevContext, RovoDevPrompt, TechnicalPlan } from './rovoDevTypes';
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
            context = undefined;
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

        let payloadToSend = text;
        if (!isCommand) {
            payloadToSend = this.addUndoContextToPrompt(payloadToSend, revertedFiles);
            payloadToSend = this.addContextToPrompt(payloadToSend, context);
        }

        const currentPrompt = this._currentPrompt;
        const fetchOp = async (client: RovoDevApiClient) => {
            const response = await client.chat(payloadToSend, enable_deep_plan);

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
        this.beginNewPrompt('replay');
        await this.sendPromptSentToView('', false);

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
        const payloadToSend = this.addRetryAfterErrorContextToPrompt(currentPrompt.text);

        // we need to echo back the prompt to the View since it's not user submitted
        await this.sendPromptSentToView(payloadToSend, currentPrompt.enable_deep_plan, currentPrompt.context);

        const fetchOp = async (client: RovoDevApiClient) => {
            const response = await client.chat(payloadToSend, currentPrompt.enable_deep_plan);

            this._telemetryProvider.fireTelemetryEvent(
                'rovoDevPromptSentEvent',
                this._currentPromptId,
                !!currentPrompt.enable_deep_plan,
            );

            return this.processChatResponse('chat', response);
        };

        await this.executeApiWithErrorHandling(fetchOp, true);
    }

    public async executeCancel(fromNewSession: boolean): Promise<boolean> {
        const webview = this._webView!;

        if (this._pendingCancellation) {
            throw new Error('Cancellation already in progress');
        }
        this._pendingCancellation = true;

        const cancelResponse = await this.executeApiWithErrorHandling((client) => client.cancel(), false);

        this._pendingCancellation = false;

        const success =
            !!cancelResponse && (cancelResponse.cancelled || cancelResponse.message === 'No chat in progress');

        if (!fromNewSession) {
            this._telemetryProvider.fireTelemetryEvent(
                'rovoDevStopActionEvent',
                this.currentPromptId,
                success ? undefined : true,
            );
        }

        if (!success) {
            await webview.postMessage({
                type: RovoDevProviderMessageType.CancelFailed,
            });
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
                    isReplay: sourceApi === 'replay',
                });

            case 'retry-prompt':
                return webview.postMessage({
                    type: RovoDevProviderMessageType.ToolReturn,
                    dataObject: response,
                });

            case 'user-prompt':
                if (this._replayInProgress) {
                    const cleanedText = this.stripContextTags(response.content);
                    this._currentPrompt = {
                        text: cleanedText,
                        enable_deep_plan: false,
                    };
                    return this.sendUserPromptToView(cleanedText);
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

    private stripContextTags(text: string): string {
        // Remove content between <context> and </context> tags (including the tags themselves)
        // This regex handles multiline content and nested tags
        let cleanedText = text.replace(/<context>[\s\S]*?<\/context>/gi, '');

        // Clean up excessive whitespace that might be left behind
        cleanedText = cleanedText.replace(/\n\s*\n\s*\n/g, '\n\n'); // Replace 3+ newlines with 2

        return cleanedText.trim();
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

    private async sendUserPromptToView(text: string, context?: RovoDevContext) {
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

    private async sendPromptSentToView(text: string, enable_deep_plan: boolean, context?: RovoDevContext) {
        const webview = this._webView!;

        return await webview.postMessage({
            type: RovoDevProviderMessageType.PromptSent,
            text,
            enable_deep_plan,
            context: context,
        });
    }

    private addContextToPrompt(message: string, context?: RovoDevContext): string {
        if (!context) {
            return message;
        }

        let extra = '';
        if (context.focusInfo && context.focusInfo.enabled && !context.focusInfo.invalid) {
            extra += `
            <context>
                I have this open in editor:
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
                    I have these additional context items:
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

    private addUndoContextToPrompt(message: string, revertedFiles: string[]): string {
        if (revertedFiles.length) {
            const files = revertedFiles.join('\n');
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
}
