import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Disposable, ExtensionContext, Uri, ViewColumn, WebviewPanel, window } from 'vscode';

import { RovoDevViewResponse } from '../react/atlascode/rovo-dev/rovoDevViewMessages';
import { RovoDevProcessManager, RovoDevProcessManagerInstance } from '../rovo-dev/rovoDevProcessManager';
import { RovoDevContextItem } from '../rovo-dev/rovoDevTypes';
import { RovoDevWebviewProviderActual, TypedWebview } from '../rovo-dev/rovoDevWebviewProvider';
import { RovoDevProviderMessage } from '../rovo-dev/rovoDevWebviewProviderMessages';
import { getHtmlForView } from '../webview/common/getHtmlForView';

interface RovoDevSession {
    id: string;
    panel: WebviewPanel;
    provider: RovoDevWebviewProviderActual;
    processManagerInstance: RovoDevProcessManagerInstance;
    sessionNumber: number;
}

export class RovoDevPageProvider extends Disposable {
    private readonly viewType = 'atlascodeRovoDevPage';
    private _sessions: Map<string, RovoDevSession> = new Map();
    private _sessionCounter = 0;
    private _extensionPath: string;
    private _extensionUri: Uri;
    private _context: ExtensionContext;
    private _activePanelId?: string;

    constructor(context: ExtensionContext, extensionPath: string) {
        super(() => {
            this.dispose();
        });

        this._context = context;
        this._extensionPath = extensionPath;
        this._extensionUri = Uri.file(extensionPath);
    }

    public async createOrShow(forceNew: boolean = false): Promise<string> {
        const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined;

        // If we have sessions and don't want to force a new one, show the most recent active session
        if (!forceNew && this._activePanelId && this._sessions.has(this._activePanelId)) {
            const session = this._sessions.get(this._activePanelId)!;
            session.panel.reveal(column);
            return this._activePanelId;
        }

        // Create a new session
        const sessionId = uuidv4();
        this._sessionCounter++;
        const sessionNumber = this._sessionCounter;

        // Create a new panel
        const panel = window.createWebviewPanel(
            this.viewType,
            `Rovo Dev ${sessionNumber > 1 ? `(${sessionNumber})` : ''}`,
            column || ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    Uri.file(path.join(this._extensionPath, 'images')),
                    Uri.file(path.join(this._extensionPath, 'build')),
                    Uri.file(path.join(this._extensionPath, 'node_modules', '@vscode', 'codicons', 'dist')),
                ],
            },
        );

        // Create a dedicated process manager instance for this session
        const processManagerInstance = RovoDevProcessManager.createInstance(this._context, sessionId);
        // Create a new provider for this session
        const provider = new RovoDevWebviewProviderActual(
            this._context,
            this._extensionPath,
            processManagerInstance,
            `atlascode.views.rovoDev.webViewPage.${sessionId}`,
        );

        // Create session object
        const session: RovoDevSession = {
            id: sessionId,
            panel,
            provider,
            processManagerInstance,
            sessionNumber,
        };

        // Store the session
        this._sessions.set(sessionId, session);
        this._activePanelId = sessionId;

        // Set up the webview
        this._setupWebview(session);

        // Listen for when the panel is disposed
        panel.onDidDispose(() => this._disposeSession(sessionId), null, this._context.subscriptions);

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            (message) => this._handleWebviewMessage(sessionId, message),
            undefined,
            this._context.subscriptions,
        );

        // Track when this panel becomes active
        panel.onDidChangeViewState(
            (e) => {
                if (e.webviewPanel.active) {
                    this._activePanelId = sessionId;
                }
            },
            null,
            this._context.subscriptions,
        );

        return sessionId;
    }

    public async createNewSession(): Promise<string> {
        return this.createOrShow(true);
    }

    private _setupWebview(session: RovoDevSession): void {
        const { panel, provider } = session;
        const webview = panel.webview;
        const typedWebview = webview as TypedWebview<RovoDevProviderMessage, RovoDevViewResponse>;

        // Configure webview options
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

        // Set the HTML content
        webview.html = getHtmlForView(
            this._extensionPath,
            webview.asWebviewUri(this._extensionUri),
            webview.cspSource,
            this.viewType,
            codiconsUri,
        );

        // Set up the webview provider with the typed webview
        provider.setWebview(typedWebview);
    }

    private async _handleWebviewMessage(sessionId: string, message: RovoDevViewResponse): Promise<void> {
        // The actual message handling is delegated to the session's RovoDevWebviewProviderActual
        // which already has all the logic implemented through the webview's onDidReceiveMessage
        // event that's set up in RovoDevWebviewProviderActual.setWebview()
    }

    private _getActiveSession(): RovoDevSession | undefined {
        if (!this._activePanelId) {
            return undefined;
        }
        return this._sessions.get(this._activePanelId);
    }

    private _getActiveProvider(): RovoDevWebviewProviderActual | undefined {
        const session = this._getActiveSession();
        return session?.provider;
    }

    public async invokeRovoDevAskCommand(prompt: string, context?: RovoDevContextItem[]): Promise<void> {
        await this.createOrShow();
        const provider = this._getActiveProvider();
        return provider?.invokeRovoDevAskCommand(prompt, context);
    }

    public async executeNewSession(): Promise<void> {
        const sessionId = await this.createNewSession();
        const session = this._sessions.get(sessionId);
        return session?.provider.executeNewSession();
    }

    public async executeTriggerFeedback(): Promise<void> {
        await this.createOrShow();
        const provider = this._getActiveProvider();
        return provider?.executeTriggerFeedback();
    }

    public addToContext(contextItem: RovoDevContextItem) {
        const provider = this._getActiveProvider();
        return provider?.addToContext(contextItem);
    }

    public get isVisible(): boolean {
        const session = this._getActiveSession();
        return session?.panel.visible ?? false;
    }

    public get isDisabled(): boolean {
        const provider = this._getActiveProvider();
        return provider?.isDisabled ?? true;
    }

    public get isReady(): boolean {
        const provider = this._getActiveProvider();
        return provider?.isReady ?? false;
    }

    public async setPromptTextWithFocus(text: string, contextItem?: RovoDevContextItem): Promise<void> {
        await this.createOrShow();
        const provider = this._getActiveProvider();
        return provider?.setPromptTextWithFocus(text, contextItem);
    }

    public getSessionCount(): number {
        return this._sessions.size;
    }

    public getActiveSessionId(): string | undefined {
        return this._activePanelId;
    }

    private _disposeSession(sessionId: string): void {
        const session = this._sessions.get(sessionId);
        if (session) {
            session.provider.dispose();
            // Remove the process instance from the global registry
            RovoDevProcessManager.removeInstance(sessionId);
            this._sessions.delete(sessionId);

            // If this was the active session, clear the active panel ID
            if (this._activePanelId === sessionId) {
                this._activePanelId = undefined;

                // If there are other sessions, make the most recent one active
                if (this._sessions.size > 0) {
                    const remainingSessions = Array.from(this._sessions.values());
                    const mostRecentSession = remainingSessions[remainingSessions.length - 1];
                    this._activePanelId = mostRecentSession.id;
                }
            }
        }
    }

    public override dispose(): void {
        // Dispose all sessions
        for (const session of this._sessions.values()) {
            session.provider.dispose();
            session.panel.dispose();
            // Remove each process instance from the global registry
            RovoDevProcessManager.removeInstance(session.id);
        }
        this._sessions.clear();
        this._activePanelId = undefined;

        super.dispose();
    }
}
