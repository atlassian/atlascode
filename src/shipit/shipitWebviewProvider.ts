import * as path from 'path';
import { getHtmlForView } from 'src/webview/common/getHtmlForView';
import {
    CancellationToken,
    Disposable,
    Uri,
    WebviewView,
    WebviewViewProvider,
    WebviewViewResolveContext,
    window,
} from 'vscode';

export class ShipitWebviewProvider extends Disposable implements WebviewViewProvider {
    private _extensionPath: string;
    private _extensionUri: Uri;
    private _webView?: WebviewView['webview'];
    private readonly viewType = 'shipitWebview';

    constructor(extensionPath: string) {
        super(() => {});
        this._extensionPath = extensionPath;
        this._extensionUri = Uri.file(this._extensionPath);
        // Register the webview view provider
        this._register();
    }

    private _register() {
        window.registerWebviewViewProvider('atlascode.views.shipitWebviewView', this, {
            webviewOptions: { retainContextWhenHidden: true },
        });
    }

    public resolveWebviewView(
        webviewView: WebviewView,
        _context: WebviewViewResolveContext,
        _token: CancellationToken,
    ): void {
        this._webView = webviewView.webview;
        const webview = this._webView;
        webview.options = {
            enableScripts: true,
            localResourceRoots: [Uri.file(path.join(this._extensionPath, 'build'))],
        };
        webview.html = getHtmlForView(
            this._extensionPath,
            webview.asWebviewUri(this._extensionUri),
            webview.cspSource,
            this.viewType,
        );
    }
}
