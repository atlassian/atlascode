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
    Uri,
    Webview,
    WebviewView,
    WebviewViewProvider,
    WebviewViewResolveContext,
    window,
    workspace,
} from 'vscode';

import { rovodevInfo } from '../constants';
import {
    PromptMessage,
    RovoDevViewResponse,
    RovoDevViewResponseType,
} from '../react/atlascode/rovo-dev/rovoDevViewMessages';
import { getHtmlForView } from '../webview/common/getHtmlForView';
import { RovoDevResponse, RovoDevResponseParser } from './responseParser';
import { RovoDevApiClient, RovoDevHealthcheckResponse } from './rovoDevApiClient';
import { RovoDevPullRequestHandler } from './rovoDevPullRequestHandler';
import { RovoDevProviderMessage, RovoDevProviderMessageType } from './rovoDevWebviewProviderMessages';

const MIN_SUPPORTED_ROVODEV_VERSION = '0.8.2';

interface TypedWebview<MessageOut, MessageIn> extends Webview {
    readonly onDidReceiveMessage: Event<MessageIn>;
    postMessage(message: MessageOut): Thenable<boolean>;
}

export class RovoDevWebviewProvider extends Disposable implements WebviewViewProvider {
    private readonly viewType = 'atlascodeRovoDev';
    private _prHandler = new RovoDevPullRequestHandler();
    private _webView?: TypedWebview<RovoDevProviderMessage, RovoDevViewResponse>;
    private _rovoDevApiClient?: RovoDevApiClient;
    private _initialized = false;

    private _previousPrompt: PromptMessage | undefined;
    private _pendingPrompt: PromptMessage | undefined;
    private _pendingCancellation = false;

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
            switch (e.type) {
                case RovoDevViewResponseType.Prompt:
                    this._pendingCancellation = false;
                    await this.executeChat(e.text, e.enable_deep_plan);
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
                    await this.executeUndoFiles(e.filePaths);
                    break;

                case RovoDevViewResponseType.KeepFileChanges:
                    await this.executeKeepFiles(e.filePaths);
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
                    await this.createPR();
                    break;

                case RovoDevViewResponseType.RetryPromptAfterError:
                    this._pendingCancellation = false;
                    await this.executeRetryPromptAfterError();
                    break;
            }
        });

        this.waitFor(() => this.executeHealthcheck(), 10000, 500).then(async (result) => {
            if (result) {
                const version = ((await this.executeHealthcheckInfo()) ?? {}).version;
                if (version && semver_gte(version, MIN_SUPPORTED_ROVODEV_VERSION)) {
                    await this.executeReplay();
                } else {
                    this.processError(
                        new Error(
                            `Rovo Dev version (${version}) is out of date. Please update Rovo Dev and try again.\nMin version compatible: ${MIN_SUPPORTED_ROVODEV_VERSION}`,
                        ),
                        false,
                    );
                }
            } else {
                const errorMsg = this._rovoDevApiClient
                    ? `Unable to initialize RovoDev at "${this._rovoDevApiClient.baseApiUrl}". Service wasn't ready within 10000ms`
                    : `Unable to initialize RovoDev's client within 10000ms`;

                this.processError(new Error(errorMsg), false);
            }

            // sets this flag regardless are we are not going to retry the replay anymore
            this._initialized = true;

            // send this message regardless, so the UI can unblock the send button
            await webviewView.webview.postMessage({
                type: 'initialized',
            });

            // re-send the buffered prompt
            if (this._pendingPrompt) {
                this.executeChat(this._pendingPrompt.text, this._pendingPrompt.enable_deep_plan, true);
                this._pendingPrompt = undefined;
            }
        });
    }

    private async processChatResponse(fetchOp: Promise<Response>) {
        const response = await fetchOp;
        if (!response.body) {
            throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const parser = new RovoDevResponseParser();

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                for (const msg of parser.flush()) {
                    await this.processRovoDevResponse(msg);
                }
                break;
            }

            const data = decoder.decode(value, { stream: true });
            for (const msg of parser.parse(data)) {
                await this.processRovoDevResponse(msg);
            }
        }

        // Send final complete message when stream ends
        await this.completeChatResponse();
    }

    private completeChatResponse() {
        const webview = this._webView!;
        return webview.postMessage({
            type: RovoDevProviderMessageType.CompleteMessage,
        });
    }

    private processError(error: Error, isRetriable: boolean) {
        const webview = this._webView!;
        return webview.postMessage({
            type: RovoDevProviderMessageType.ErrorMessage,
            message: {
                text: `Error: ${error.message}`,
                source: 'RovoDevError',
                isRetriable,
                uid: v4(),
            },
        });
    }

    private async sendUserPromptToView(message: string, enable_deep_plan?: boolean) {
        const webview = this._webView!;

        await webview.postMessage({
            type: RovoDevProviderMessageType.UserChatMessage,
            message: {
                text: message,
                source: 'User',
            },
        });

        return await webview.postMessage({
            type: RovoDevProviderMessageType.PromptSent,
            enable_deep_plan: !!enable_deep_plan,
        });
    }

    private processRovoDevResponse(response: RovoDevResponse): Thenable<boolean> {
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
            case 'retry-prompt':
                return webview.postMessage({
                    type: RovoDevProviderMessageType.ToolReturn,
                    dataObject: response,
                });

            case 'user-prompt':
                // receiving a user-prompt pre-initialized means we are in the 'replay' response
                if (!this._initialized) {
                    this._previousPrompt = {
                        text: response.content,
                    };
                    return this.sendUserPromptToView(response.content);
                }
                return Promise.resolve(false);

            default:
                return Promise.resolve(false);
        }
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

    private async executeChat(message: string, enable_deep_plan?: boolean, suppressEcho?: boolean) {
        if (!message) {
            return;
        }

        if (!suppressEcho) {
            await this.sendUserPromptToView(message, enable_deep_plan);
        }

        this._previousPrompt = {
            text: message,
            enable_deep_plan,
        };

        const payloadToSend = this.addUndoContextToPrompt(message);

        if (this._initialized) {
            await this.executeApiWithErrorHandling((client) => {
                return this.processChatResponse(client.chat(payloadToSend, enable_deep_plan));
            }, true);
        } else {
            this._pendingPrompt = {
                text: payloadToSend,
                enable_deep_plan,
            };
        }
    }

    private async executeRetryPromptAfterError() {
        const webview = this._webView!;

        if (!this._initialized || !this._previousPrompt) {
            return;
        }

        const previousPrompt = this._previousPrompt;
        const payloadToSend = this.addRetryAfterErrorContextToPrompt(previousPrompt.text);

        await webview.postMessage({
            type: RovoDevProviderMessageType.PromptSent,
            enable_deep_plan: !!previousPrompt.enable_deep_plan,
        });

        await this.executeApiWithErrorHandling((client) => {
            return this.processChatResponse(client.chat(payloadToSend, previousPrompt.enable_deep_plan));
        }, true);
    }

    async executeReset(): Promise<void> {
        const webview = this._webView!;
        await this.executeApiWithErrorHandling(async (client) => {
            await client.reset();

            this._revertedChanges = [];

            await webview.postMessage({
                type: RovoDevProviderMessageType.NewSession,
            });
        });
    }

    private async executeCancel(): Promise<boolean> {
        const webview = this._webView!;

        const cancelResponse = await this.executeApiWithErrorHandling(async (client) => {
            return await client.cancel();
        });

        if (cancelResponse && (cancelResponse.cancelled || cancelResponse.message === 'No chat in progress')) {
            return true;
        } else {
            await webview.postMessage({
                type: RovoDevProviderMessageType.CancelFailed,
            });
            return false;
        }
    }

    private async executeReplay(): Promise<void> {
        await this.executeApiWithErrorHandling(async (client) => {
            return this.processChatResponse(client.replay());
        });
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

    private async executeUndoFiles(filePaths: string[]) {
        const promises = filePaths.map(async (filePath) => {
            const resolvedPath = this.makeRelativePathAbsolute(filePath);
            const cachedFilePath = await this.rovoDevApiClient!.getCacheFilePath(filePath);
            await this.getPromise((callback) => fs.rm(resolvedPath, callback));
            await this.getPromise((callback) => fs.copyFile(cachedFilePath, resolvedPath, callback));
            await this.getPromise((callback) => fs.rm(cachedFilePath, callback));
        });

        await Promise.all(promises);

        this._revertedChanges.push(...filePaths);
    }

    private async executeKeepFiles(filePaths: string[]) {
        const promises = filePaths.map(async (filePath) => {
            const cachedFilePath = await this.rovoDevApiClient!.getCacheFilePath(filePath);
            await this.getPromise((callback) => fs.rm(cachedFilePath, callback));
        });

        await Promise.all(promises);
    }

    private async createPR() {
        try {
            await this._prHandler.createPR();
        } catch (e) {
            await this.processError(e, false);
        } finally {
            const webview = this._webView!;
            await webview.postMessage({
                type: RovoDevProviderMessageType.CreatePRComplete,
            });
        }
    }

    private async executeApiWithErrorHandling<T>(
        func: (client: RovoDevApiClient) => Promise<T>,
        cancellationAware?: true,
    ): Promise<T | void> {
        if (this.rovoDevApiClient) {
            try {
                return await func(this.rovoDevApiClient);
            } catch (error) {
                if (cancellationAware && this._pendingCancellation && error.cause?.code === 'UND_ERR_SOCKET') {
                    this._pendingCancellation = false;
                    this.completeChatResponse();
                } else {
                    await this.processError(error, true);
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

    async invokeRovoDevAskCommand(prompt: string): Promise<void> {
        // focus on the specific vscode view
        commands.executeCommand('atlascode.views.rovoDev.webView.focus');

        // Wait for the webview to initialize, up to 5 seconds
        const initialized = await this.waitFor(() => !!this._webView, 5000, 50);
        if (!initialized) {
            console.error('Webview is not initialized after waiting.');
            return;
        }

        // Actually invoke the rovodev service, feed responses to the webview as normal
        await this.executeChat(prompt);
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
