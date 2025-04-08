import { Disposable, Uri } from 'vscode';

import { Container } from '../../container';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { UIWSPort } from '../../lib/ipc/models/ports';
import { SectionChangeMessage } from '../../lib/ipc/toUI/config';
import { CommonActionMessageHandler } from '../../lib/webview/controller/common/commonActionMessageHandler';
import { ConfigActionApi } from '../../lib/webview/controller/config/configActionApi';
import { ConfigWebviewController, id } from '../../lib/webview/controller/config/configWebviewController';
import { Logger } from '../../logger';
import { iconSet, Resources } from '../../resources';
import { getHtmlForView } from '../common/getHtmlForView';
import { PostMessageFunc, VSCWebviewControllerFactory } from '../vscWebviewControllerFactory';

export class VSCConfigWebviewControllerFactory implements VSCWebviewControllerFactory<SectionChangeMessage> {
    private _api: ConfigActionApi;
    private _commonHandler: CommonActionMessageHandler;
    private _analytics: AnalyticsApi;
    private _settingsUrl: string;

    constructor(
        api: ConfigActionApi,
        commonHandler: CommonActionMessageHandler,
        analytics: AnalyticsApi,
        settingsUrl: string,
    ) {
        this._api = api;
        this._commonHandler = commonHandler;
        this._analytics = analytics;
        this._settingsUrl = settingsUrl;
    }

    public tabIcon(): Uri | { light: Uri; dark: Uri } | undefined {
        return Resources.icons.get(iconSet.ATLASSIANICON);
    }

    public uiWebsocketPort(): number {
        return UIWSPort.Settings;
    }

    public createController(
        postMessage: PostMessageFunc,
        factoryData?: SectionChangeMessage,
    ): [ConfigWebviewController, Disposable | undefined];

    public createController(postMessage: PostMessageFunc, factoryData?: SectionChangeMessage): ConfigWebviewController;

    public createController(
        postMessage: PostMessageFunc,
        factoryData?: SectionChangeMessage,
    ): ConfigWebviewController | [ConfigWebviewController, Disposable | undefined] {
        const controller = new ConfigWebviewController(
            postMessage,
            this._api,
            this._commonHandler,
            Logger.Instance,
            this._analytics,
            this._settingsUrl,
            factoryData,
        );

        const disposables = Disposable.from(
            Container.siteManager.onDidSitesAvailableChange(controller.onSitesChanged, controller),
        );

        return [controller, disposables];
    }

    public webviewHtml(extensionPath: string, baseUri: Uri, cspSource: string): string {
        return getHtmlForView(extensionPath, baseUri, cspSource, id);
    }
}
