import { Disposable, Uri } from 'vscode';
import { WebviewController } from '../lib/webview/controller/webviewController';

export type PostMessageFunc = (m: any) => Thenable<boolean>;

export interface VSCWebviewControllerFactory<FD> {
    tabIcon():
        | Uri
        | {
              light: Uri;
              dark: Uri;
          }
        | undefined;

    webviewHtml(extensionPath: string, baseUri: Uri, cspSource: string): string;

    createController(postMessage: PostMessageFunc, factoryData?: FD): [WebviewController<FD>, Disposable | undefined];
    createController(postMessage: PostMessageFunc, factoryData?: FD): WebviewController<FD>;
    uiWebsocketPort(): number;
}
