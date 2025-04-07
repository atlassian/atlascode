import { Disposable, Uri } from 'vscode';

import { AnalyticsApi } from '../../lib/analyticsApi';
import { UIWSPort } from '../../lib/ipc/models/ports';
import { StartWorkInitMessage } from '../../lib/ipc/toUI/startWork';
import { CommonActionMessageHandler } from '../../lib/webview/controller/common/commonActionMessageHandler';
import { StartWorkActionApi } from '../../lib/webview/controller/startwork/startWorkActionApi';
import { StartWorkWebviewController } from '../../lib/webview/controller/startwork/startWorkWebviewController';
import { Logger } from '../../logger';
import { iconSet, Resources } from '../../resources';
import { getHtmlForView } from '../common/getHtmlForView';
import { PostMessageFunc, VSCWebviewControllerFactory } from '../vscWebviewControllerFactory';

export class VSCStartWorkWebviewControllerFactory implements VSCWebviewControllerFactory<StartWorkInitMessage> {
    constructor(
        private api: StartWorkActionApi,
        private commonHandler: CommonActionMessageHandler,
        private analytics: AnalyticsApi,
    ) {}

    public tabIcon(): Uri | { light: Uri; dark: Uri } | undefined {
        return Resources.icons.get(iconSet.JIRAICON);
    }

    public uiWebsocketPort(): number {
        return UIWSPort.StartWork;
    }

    public createController(
        postMessage: PostMessageFunc,
        factoryData?: StartWorkInitMessage,
    ): [StartWorkWebviewController, Disposable | undefined];

    public createController(
        postMessage: PostMessageFunc,
        factoryData?: StartWorkInitMessage,
    ): StartWorkWebviewController;

    public createController(
        postMessage: PostMessageFunc,
        factoryData?: StartWorkInitMessage,
    ): StartWorkWebviewController | [StartWorkWebviewController, Disposable | undefined] {
        const controller = new StartWorkWebviewController(
            postMessage,
            this.api,
            this.commonHandler,
            Logger.Instance,
            this.analytics,
            factoryData,
        );

        return [controller, undefined];
    }

    public webviewHtml(extensionPath: string, baseUri: Uri, cspSource: string): string {
        return getHtmlForView(extensionPath, baseUri, cspSource, 'startWorkPageV2');
    }
}
