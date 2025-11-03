import * as path from 'path';
import { Disposable, ExtensionContext, Uri, ViewColumn, Webview, WebviewPanel, window } from 'vscode';

import { RovoDevViewResponse } from '../react/atlascode/rovo-dev/rovoDevViewMessages';
import { RovoDevContextItem } from '../rovo-dev/rovoDevTypes';
import { RovoDevWebviewProviderActual, TypedWebview } from '../rovo-dev/rovoDevWebviewProvider';
import { RovoDevProviderMessage } from '../rovo-dev/rovoDevWebviewProviderMessages';
import { getHtmlForView } from '../webview/common/getHtmlForView';

export class RovoDevPageProvider extends Disposable {
    private readonly viewType = 'atlascodeRovoDevPage';
    private _panel?: WebviewPanel;
    private _rovodevWebviewProvider: RovoDevWebviewProviderActual;
    private _extensionPath: string;
    private _extensionUri: Uri;
    private _context: ExtensionContext;

    constructor(context: ExtensionContext, extensionPath: string) {
        super(() => {
            this.dispose();
        });

        this._context = context;
        this._extensionPath = extensionPath;
        this._extensionUri = Uri.file(extensionPath);
        this._rovodevWebviewProvider = new RovoDevWebviewProviderActual(
            context,
            extensionPath,
            'atlascode.views.rovoDev.webViewPage',
        );
    }

    public async createOrShow(): Promise<void> {
        const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : undefined;

        // If we already have a panel, show it.
        if (this._panel) {
            this._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        this._panel = window.createWebviewPanel(this.viewType, 'Rovo Dev', column || ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                Uri.file(path.join(this._extensionPath, 'images')),
                Uri.file(path.join(this._extensionPath, 'build')),
                Uri.file(path.join(this._extensionPath, 'node_modules', '@vscode', 'codicons', 'dist')),
            ],
        });

        // Set the webview's initial html content
        this._setupWebview(this._panel.webview);

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this._dispose(), null, this._context.subscriptions);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            (message) => this._handleWebviewMessage(message),
            undefined,
            this._context.subscriptions,
        );
    }

    private _setupWebview(webview: Webview): void {
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
        this._rovodevWebviewProvider.setWebview(typedWebview);
    }

    private async _handleWebviewMessage(message: RovoDevViewResponse): Promise<void> {
        // The actual message handling is delegated to the RovoDevWebviewProviderActual
        // which already has all the logic implemented through the webview's onDidReceiveMessage
        // event that's set up in RovoDevWebviewProviderActual.setWebview()
        // This method is kept for potential future custom handling specific to the page provider
    }

    public async invokeRovoDevAskCommand(prompt: string, context?: RovoDevContextItem[]): Promise<void> {
        await this.createOrShow();
        return this._rovodevWebviewProvider.invokeRovoDevAskCommand(prompt, context);
    }

    public async executeNewSession(): Promise<void> {
        await this.createOrShow();
        return this._rovodevWebviewProvider.executeNewSession();
    }

    public async executeTriggerFeedback(): Promise<void> {
        await this.createOrShow();
        return this._rovodevWebviewProvider.executeTriggerFeedback();
    }

    public addToContext(contextItem: RovoDevContextItem) {
        return this._rovodevWebviewProvider.addToContext(contextItem);
    }

    public get isVisible(): boolean {
        return this._panel?.visible ?? false;
    }

    public get isDisabled(): boolean {
        return this._rovodevWebviewProvider.isDisabled;
    }

    public get isReady(): boolean {
        return this._rovodevWebviewProvider.isReady;
    }

    public async setPromptTextWithFocus(text: string, contextItem?: RovoDevContextItem): Promise<void> {
        await this.createOrShow();
        return this._rovodevWebviewProvider.setPromptTextWithFocus(text, contextItem);
    }

    private _dispose(): void {
        this._panel = undefined;
    }

    public override dispose(): void {
        this._rovodevWebviewProvider.dispose();

        if (this._panel) {
            this._panel.dispose();
        }

        super.dispose();
    }
}
