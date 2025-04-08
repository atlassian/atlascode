import { Disposable, Uri } from 'vscode';

import { BitbucketIssue } from '../../bitbucket/model';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { UIWSPort } from '../../lib/ipc/models/ports';
import { BitbucketIssueActionApi } from '../../lib/webview/controller/bbIssue/bitbucketIssueActionApi';
import {
    BitbucketIssueWebviewController,
    id,
} from '../../lib/webview/controller/bbIssue/bitbucketIssueWebviewController';
import { CommonActionMessageHandler } from '../../lib/webview/controller/common/commonActionMessageHandler';
import { Logger } from '../../logger';
import { iconSet, Resources } from '../../resources';
import { getHtmlForView } from '../common/getHtmlForView';
import { PostMessageFunc, VSCWebviewControllerFactory } from '../vscWebviewControllerFactory';

export class VSCBitbucketIssueWebviewControllerFactory implements VSCWebviewControllerFactory<{}> {
    private _api: BitbucketIssueActionApi;
    private _commonHandler: CommonActionMessageHandler;
    private _analytics: AnalyticsApi;

    constructor(api: BitbucketIssueActionApi, commonHandler: CommonActionMessageHandler, analytics: AnalyticsApi) {
        this._api = api;
        this._commonHandler = commonHandler;
        this._analytics = analytics;
    }

    public tabIcon(): Uri | { light: Uri; dark: Uri } | undefined {
        return Resources.icons.get(iconSet.BITBUCKETICON);
    }

    public uiWebsocketPort(): number {
        return UIWSPort.BitbucketIssuePage;
    }

    public createController(postMessage: PostMessageFunc): [BitbucketIssueWebviewController, Disposable | undefined];

    public createController(postMessage: PostMessageFunc): BitbucketIssueWebviewController;

    public createController(
        postMessage: PostMessageFunc,
        factoryData?: BitbucketIssue,
    ): BitbucketIssueWebviewController | [BitbucketIssueWebviewController, Disposable | undefined] {
        if (!factoryData) {
            throw new Error('Error creating Bitbucket issue webview');
        }
        const controller = new BitbucketIssueWebviewController(
            factoryData,
            postMessage,
            this._api,
            this._commonHandler,
            Logger.Instance,
            this._analytics,
        );

        return [controller, undefined];
    }

    public webviewHtml(extensionPath: string, baseUri: Uri, cspSource: string): string {
        return getHtmlForView(extensionPath, baseUri, cspSource, id);
    }
}
