import { Disposable, Uri } from 'vscode';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { UIWSPort } from '../../lib/ipc/models/ports';
import { PipelinesSummaryActionApi } from '../../lib/webview/controller/pipelines/pipelinesSummaryActionApi';
import {
    id,
    PipelineSummaryWebviewController,
    title,
} from '../../lib/webview/controller/pipelines/pipelineSummaryWebviewController';
import { Logger } from '../../logger';
import { Pipeline } from '../../pipelines/model';
import { iconSet, Resources } from '../../resources';
import { getHtmlForView } from '../common/getHtmlForView';
import { PostMessageFunc, VSCWebviewControllerFactory } from '../vscWebviewControllerFactory';

export class PipelineSummaryWebviewControllerFactory implements VSCWebviewControllerFactory<Pipeline> {
    constructor(
        private api: PipelinesSummaryActionApi,
        private analytics: AnalyticsApi,
    ) {}

    public tabIcon(): Uri | { light: Uri; dark: Uri } | undefined {
        return Resources.icons.get(iconSet.BITBUCKETICON);
    }

    public uiWebsocketPort(): number {
        return UIWSPort.Settings;
    }

    public title(): string {
        return title;
    }

    public createController(
        postMessage: PostMessageFunc,
        factoryData?: Pipeline,
    ): [PipelineSummaryWebviewController, Disposable | undefined];

    public createController(postMessage: PostMessageFunc, factoryData?: Pipeline): PipelineSummaryWebviewController;

    public createController(
        postMessage: PostMessageFunc,
        factoryData?: Pipeline,
    ): PipelineSummaryWebviewController | [PipelineSummaryWebviewController, Disposable | undefined] {
        const controller = new PipelineSummaryWebviewController(
            postMessage,
            this.api,
            Logger.Instance,
            this.analytics,
            factoryData,
        );

        const disposables = Disposable.from();

        return [controller, disposables];
    }

    public webviewHtml(extensionPath: string, baseUri: Uri, cspSource: string): string {
        return getHtmlForView(extensionPath, baseUri, cspSource, id);
    }
}
