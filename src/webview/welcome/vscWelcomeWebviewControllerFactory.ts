import { Disposable, Uri } from 'vscode';

import { UIWSPort } from '../../lib/ipc/models/ports';
import { WelcomeInitMessage } from '../../lib/ipc/toUI/welcome';
import { CommonActionMessageHandler } from '../../lib/webview/controller/common/commonActionMessageHandler';
import { WelcomeActionApi } from '../../lib/webview/controller/welcome/welcomeActionApi';
import { WelcomeWebviewController } from '../../lib/webview/controller/welcome/welcomeWebviewController';
import { Logger } from '../../logger';
import { iconSet, Resources } from '../../resources';
import { getHtmlForView } from '../common/getHtmlForView';
import { PostMessageFunc, VSCWebviewControllerFactory } from '../vscWebviewControllerFactory';

export class VSCWelcomeWebviewControllerFactory implements VSCWebviewControllerFactory<WelcomeInitMessage> {
    constructor(
        private api: WelcomeActionApi,
        private commonHandler: CommonActionMessageHandler,
    ) {}

    public tabIcon(): Uri | { light: Uri; dark: Uri } | undefined {
        return Resources.icons.get(iconSet.ATLASSIANICON);
    }

    public uiWebsocketPort(): number {
        return UIWSPort.WelcomePage;
    }

    public createController(
        postMessage: PostMessageFunc,
        factoryData?: WelcomeInitMessage,
    ): [WelcomeWebviewController, Disposable | undefined];

    public createController(postMessage: PostMessageFunc, factoryData?: WelcomeInitMessage): WelcomeWebviewController;

    public createController(
        postMessage: PostMessageFunc,
        factoryData?: WelcomeInitMessage,
    ): WelcomeWebviewController | [WelcomeWebviewController, Disposable | undefined] {
        const controller = new WelcomeWebviewController(
            postMessage,
            this.api,
            this.commonHandler,
            Logger.Instance,
            factoryData,
        );

        return [controller, undefined];
    }

    public webviewHtml(extensionPath: string, baseUri: Uri, cspSource: string): string {
        return getHtmlForView(extensionPath, baseUri, cspSource, 'welcomePageV2');
    }
}
