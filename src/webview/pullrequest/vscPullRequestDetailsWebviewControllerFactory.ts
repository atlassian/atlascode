import { Disposable, Uri } from 'vscode';

import { PullRequest } from '../../bitbucket/model';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { UIWSPort } from '../../lib/ipc/models/ports';
import { CommonActionMessageHandler } from '../../lib/webview/controller/common/commonActionMessageHandler';
import { PullRequestDetailsActionApi } from '../../lib/webview/controller/pullrequest/pullRequestDetailsActionApi';
import { PullRequestDetailsWebviewController } from '../../lib/webview/controller/pullrequest/pullRequestDetailsWebviewController';
import { Logger } from '../../logger';
import { iconSet, Resources } from '../../resources';
import { getHtmlForView } from '../common/getHtmlForView';
import { PostMessageFunc, VSCWebviewControllerFactory } from '../vscWebviewControllerFactory';

const id: string = 'pullRequestDetailsPageV2';

export class VSCPullRequestDetailsWebviewControllerFactory implements VSCWebviewControllerFactory<{}> {
    private api: PullRequestDetailsActionApi;
    private commonHandler: CommonActionMessageHandler;
    private analytics: AnalyticsApi;

    constructor(api: PullRequestDetailsActionApi, commonHandler: CommonActionMessageHandler, analytics: AnalyticsApi) {
        this.api = api;
        this.commonHandler = commonHandler;
        this.analytics = analytics;
    }

    public tabIcon(): Uri | { light: Uri; dark: Uri } | undefined {
        return Resources.icons.get(iconSet.PULLREQUEST);
    }

    public uiWebsocketPort(): number {
        return UIWSPort.PullRequestDetailsPage;
    }

    public createController(
        postMessage: PostMessageFunc,
    ): [PullRequestDetailsWebviewController, Disposable | undefined];

    public createController(postMessage: PostMessageFunc): PullRequestDetailsWebviewController;

    public createController(
        postMessage: PostMessageFunc,
        factoryData?: PullRequest,
    ): PullRequestDetailsWebviewController | [PullRequestDetailsWebviewController, Disposable | undefined] {
        if (!factoryData) {
            throw new Error('Error creating Pull Request webview');
        }
        const controller = new PullRequestDetailsWebviewController(
            factoryData,
            postMessage,
            this.api,
            this.commonHandler,
            Logger.Instance,
            this.analytics,
        );

        return [controller, undefined];
    }

    public webviewHtml(extensionPath: string, baseUri: Uri, cspSource: string): string {
        return getHtmlForView(extensionPath, baseUri, cspSource, id);
    }
}
