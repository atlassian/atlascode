import { Disposable, Uri } from 'vscode';

import { BitbucketSite } from '../../bitbucket/model';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { UIWSPort } from '../../lib/ipc/models/ports';
import { CreateBitbucketIssueActionApi } from '../../lib/webview/controller/bbIssue/createbitbucketIssueActionApi';
import { CreateBitbucketIssueWebviewController } from '../../lib/webview/controller/bbIssue/createBitbucketIssueWebviewController';
import { CommonActionMessageHandler } from '../../lib/webview/controller/common/commonActionMessageHandler';
import { Logger } from '../../logger';
import { iconSet, Resources } from '../../resources';
import { getHtmlForView } from '../common/getHtmlForView';
import { PostMessageFunc, VSCWebviewControllerFactory } from '../vscWebviewControllerFactory';

export class VSCCreateBitbucketIssueWebviewControllerFactory implements VSCWebviewControllerFactory<BitbucketSite> {
    constructor(
        private api: CreateBitbucketIssueActionApi,
        private commonHandler: CommonActionMessageHandler,
        private analytics: AnalyticsApi,
    ) {}

    public tabIcon(): Uri | { light: Uri; dark: Uri } | undefined {
        return Resources.icons.get(iconSet.BITBUCKETICON);
    }

    public uiWebsocketPort(): number {
        return UIWSPort.CreateBitbucketIssuePage;
    }

    public createController(
        postMessage: PostMessageFunc,
    ): [CreateBitbucketIssueWebviewController, Disposable | undefined];

    public createController(postMessage: PostMessageFunc): CreateBitbucketIssueWebviewController;

    public createController(
        postMessage: PostMessageFunc,
        factoryData?: BitbucketSite,
    ): CreateBitbucketIssueWebviewController | [CreateBitbucketIssueWebviewController, Disposable | undefined] {
        if (!factoryData) {
            throw new Error('Error creating Bitbucket issue webview');
        }
        const controller = new CreateBitbucketIssueWebviewController(
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
        return getHtmlForView(extensionPath, baseUri, cspSource, 'createBitbucketIssuePageV2');
    }
}
