import { Container } from 'src/container';
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
import { RovoDevContextItem, RovoDevPrompt, TechnicalPlan } from './rovoDevTypes';
import { RovoDevProviderMessage, RovoDevProviderMessageType } from './rovoDevWebviewProviderMessages';

interface TypedWebview<MessageOut, MessageIn> extends Webview {
    readonly onDidReceiveMessage: Event<MessageIn>;
    postMessage(message: MessageOut): Thenable<boolean>;
}

type StreamingApi = 'chat' | 'replay';

export class RovoDevChatProvider {
    private readonly isDebugging = Container.isDebugging;

    private _pendingToolConfirmation: Record<string, ToolPermissionChoice | 'undecided'> = {};
    private _pendingToolConfirmationLeft = 0;
    private _pendingPrompt: RovoDevPrompt | undefined;
    private _currentPrompt: RovoDevPrompt | undefined;
    private _rovoDevApiClient: RovoDevApiClient | undefined;
    private _webView: TypedWebview<RovoDevProviderMessage, RovoDevViewResponse> | undefined;

    private _replayInProgress = false;

    private get isDebugPanelEnabled() {
        return Container.config.rovodev.debugPanelEnabled;
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

            return this.processChatResponse(response);
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
            return this.processReplayResponse(response);
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

    private async processReplayResponse(fetchOp: Promise<Response> | Response) {
        const response = await fetchOp;
        if (!response.body) {
            throw new Error("Error processing the Rovo Dev's response: response is empty.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const parser = new RovoDevResponseParser({ mergeAllChunks: true });

        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                for (const msg of parser.flush()) {
                    await this.processRovoDevResponse('replay', msg);
                }
                break;
            }

            const data = decoder.decode(value, { stream: true });
            for (const msg of parser.parse(data)) {
                await this.processRovoDevResponse('replay', msg);
            }
        }
    }

    private async processChatResponse(fetchOp: Promise<Response> | Response) {
        const response = await fetchOp;
        if (!response.body) {
            throw new Error("Error processing the Rovo Dev's response: response is empty.");
        }

        this._telemetryProvider.perfLogger.promptStarted(this._currentPromptId);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const parser = new RovoDevResponseParser();

        let isFirstByte = true;
        let isFirstMessage = true;

        while (true) {
            const { done, value } = await reader.read();

            if (isFirstByte) {
                this._telemetryProvider.perfLogger.promptFirstByteReceived(this._currentPromptId);
                isFirstByte = false;
            }

            if (done) {
                // last response of the stream -> fire performance telemetry event
                this._telemetryProvider.perfLogger.promptLastMessageReceived(this._currentPromptId);

                for (const msg of parser.flush()) {
                    await this.processRovoDevResponse('chat', msg);
                }
                break;
            }

            const data = decoder.decode(value, { stream: true });
            for (const msg of parser.parse(data)) {
                if (isFirstMessage) {
                    this._telemetryProvider.perfLogger.promptFirstMessageReceived(this._currentPromptId);
                    isFirstMessage = false;
                }

                await this.processRovoDevResponse('chat', msg);
            }
        }
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

            this._telemetryProvider.fireTelemetryEvent(
                'rovoDevTechnicalPlanningShownEvent',
                this._currentPromptId,
                stepsCount,
                filesCount,
                questionsCount,
            );
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
                // ignore it as we are not consuming it
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

            case 'exception':
                RovoDevLogger.error(new Error(`${response.type} ${response.message}`), response.title || undefined);
                await webview.postMessage({
                    type: RovoDevProviderMessageType.ShowDialog,
                    message: {
                        event_kind: '_RovoDevDialog',
                        type: 'error',
                        title: response.title || undefined,
                        text: response.message,
                        statusCode: `Error code: ${response.type}`,
                        uid: v4(),
                    },
                });
                break;

            case 'warning':
                await webview.postMessage({
                    type: RovoDevProviderMessageType.ShowDialog,
                    message: {
                        type: 'warning',
                        text: response.message,
                        title: response.title,
                        event_kind: '_RovoDevDialog',
                    },
                });
                break;

            case 'clear':
                await webview.postMessage({
                    type: RovoDevProviderMessageType.ClearChat,
                });
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

            case 'close':
                // response terminated
                break;

            default:
                // this should really never happen, as unknown messages are caugh and wrapped into the
                // message `_parsing_error`

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
                await this.processError(error, { isRetriable: sourceApi === 'chat' });
            }
        } else {
            await this.processError(new Error('RovoDev client not initialized'));
        }

        // whatever happens, at the end of the streaming API we need to tell the webview
        // that the generation of the response has finished
        await webview.postMessage({
            type: RovoDevProviderMessageType.CompleteMessage,
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
        RovoDevLogger.error(error);

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
                isFocus: false,
                enabled: true,
                file: {
                    name: filePath.split('/').pop() || filePath,
                    absolutePath: filePath,
                    relativePath: filePath.split('/').pop() || filePath, // Use basename as relative path
                },
                selection: selection,
            });
        }

        return { text: source.replace(contextRegex, '').trim(), context };
    }
}
