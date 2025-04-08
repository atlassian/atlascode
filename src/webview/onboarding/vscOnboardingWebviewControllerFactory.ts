import { Disposable, Uri } from 'vscode';

import { Container } from '../../container';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { UIWSPort } from '../../lib/ipc/models/ports';
import { SectionChangeMessage } from '../../lib/ipc/toUI/config';
import { CommonActionMessageHandler } from '../../lib/webview/controller/common/commonActionMessageHandler';
import { OnboardingActionApi } from '../../lib/webview/controller/onboarding/onboardingActionApi';
import { id, OnboardingWebviewController } from '../../lib/webview/controller/onboarding/onboardingWebviewController';
import { Logger } from '../../logger';
import { iconSet, Resources } from '../../resources';
import { getHtmlForView } from '../common/getHtmlForView';
import { PostMessageFunc, VSCWebviewControllerFactory } from '../vscWebviewControllerFactory';

export class VSCOnboardingWebviewControllerFactory implements VSCWebviewControllerFactory<SectionChangeMessage> {
    private _api: OnboardingActionApi;
    private _commonHandler: CommonActionMessageHandler;
    private _analytics: AnalyticsApi;
    private _onboardingUrl: string;

    constructor(
        api: OnboardingActionApi,
        commonHandler: CommonActionMessageHandler,
        analytics: AnalyticsApi,
        settingsUrl: string,
    ) {
        this._api = api;
        this._commonHandler = commonHandler;
        this._analytics = analytics;
        this._onboardingUrl = settingsUrl;
    }

    public tabIcon(): Uri | { light: Uri; dark: Uri } | undefined {
        return Resources.icons.get(iconSet.ATLASSIANICON);
    }

    public uiWebsocketPort(): number {
        return UIWSPort.Onboarding;
    }

    public createController(postMessage: PostMessageFunc): [OnboardingWebviewController, Disposable | undefined];

    public createController(postMessage: PostMessageFunc): OnboardingWebviewController;

    public createController(
        postMessage: PostMessageFunc,
    ): OnboardingWebviewController | [OnboardingWebviewController, Disposable | undefined] {
        const controller = new OnboardingWebviewController(
            postMessage,
            this._api,
            this._commonHandler,
            Logger.Instance,
            this._analytics,
            this._onboardingUrl,
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
