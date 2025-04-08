import { Disposable, Uri } from 'vscode';

import { WorkspaceRepo } from '../../bitbucket/model';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { UIWSPort } from '../../lib/ipc/models/ports';
import { CommonActionMessageHandler } from '../../lib/webview/controller/common/commonActionMessageHandler';
import { CreatePullRequestActionApi } from '../../lib/webview/controller/pullrequest/createPullRequestActionApi';
import { CreatePullRequestWebviewController } from '../../lib/webview/controller/pullrequest/createPullRequestWebviewController';
import { Logger } from '../../logger';
import { iconSet, Resources } from '../../resources';
import { getHtmlForView } from '../common/getHtmlForView';
import { PostMessageFunc, VSCWebviewControllerFactory } from '../vscWebviewControllerFactory';

export class VSCCreatePullRequestWebviewControllerFactory implements VSCWebviewControllerFactory<{}> {
    constructor(
        private api: CreatePullRequestActionApi,
        private commonHandler: CommonActionMessageHandler,
        private analytics: AnalyticsApi,
    ) {}

    public tabIcon(): Uri | { light: Uri; dark: Uri } | undefined {
        return Resources.icons.get(iconSet.PULLREQUEST)!;
    }

    public uiWebsocketPort(): number {
        return UIWSPort.CreatePullRequest;
    }

    public createController(postMessage: PostMessageFunc): [CreatePullRequestWebviewController, Disposable | undefined];

    public createController(postMessage: PostMessageFunc): CreatePullRequestWebviewController;

    public createController(
        postMessage: PostMessageFunc,
        factoryData?: WorkspaceRepo,
    ): CreatePullRequestWebviewController | [CreatePullRequestWebviewController, Disposable | undefined] {
        const controller = new CreatePullRequestWebviewController(
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
        return getHtmlForView(extensionPath, baseUri, cspSource, 'createPullRequestPageV2');
    }
}
