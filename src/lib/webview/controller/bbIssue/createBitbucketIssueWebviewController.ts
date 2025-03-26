import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import { ProductBitbucket } from '../../../../atlclients/authInfo';
import { BitbucketSite } from '../../../../bitbucket/model';
import { AnalyticsApi } from '../../../analyticsApi';
import { CommonActionType } from '../../../ipc/fromUI/common';
import { CreateBitbucketIssueAction, CreateBitbucketIssueActionType } from '../../../ipc/fromUI/createBitbucketIssue';
import { WebViewID } from '../../../ipc/models/common';
import { CommonMessage, CommonMessageType } from '../../../ipc/toUI/common';
import {
    CreateBitbucketIssueMessage,
    CreateBitbucketIssueMessageType,
    CreateBitbucketIssueResponse,
} from '../../../ipc/toUI/createBitbucketIssue';
import { Logger } from '../../../logger';
import { formatError } from '../../formatError';
import { CommonActionMessageHandler } from '../common/commonActionMessageHandler';
import { MessagePoster, WebviewController } from '../webviewController';
import { CreateBitbucketIssueActionApi } from './createbitbucketIssueActionApi';

export class CreateBitbucketIssueWebviewController implements WebviewController<BitbucketSite> {
    public readonly requiredFeatureFlags = [];
    public readonly requiredExperiments = [];

    private isRefreshing = false;

    constructor(
        private site: BitbucketSite,
        private messagePoster: MessagePoster,
        private api: CreateBitbucketIssueActionApi,
        private commonHandler: CommonActionMessageHandler,
        private logger: Logger,
        private analytics: AnalyticsApi,
    ) {}

    public title(): string {
        return 'Create Bitbucket Issue';
    }

    public screenDetails() {
        return { id: WebViewID.CreateBitbucketIssueWebview, site: this.site.details, product: ProductBitbucket };
    }

    private postMessage(message: CreateBitbucketIssueMessage | CreateBitbucketIssueResponse | CommonMessage) {
        this.messagePoster(message);
    }

    private async invalidate() {
        try {
            if (this.isRefreshing) {
                return;
            }

            this.isRefreshing = true;
            this.postMessage({
                type: CreateBitbucketIssueMessageType.Init,
                site: this.site,
            });
        } catch (e) {
            const err = new Error(`error updating the view: ${e}`);
            this.logger.error(err);
            this.postMessage({ type: CommonMessageType.Error, reason: formatError(e) });
        } finally {
            this.isRefreshing = false;
        }
    }

    public async update(site: BitbucketSite) {
        this.site = site;
        this.invalidate();
    }

    public async onMessageReceived(msg: CreateBitbucketIssueAction) {
        switch (msg.type) {
            case CreateBitbucketIssueActionType.SubmitCreateRequest:
                try {
                    const result = await this.api.createIssue(
                        msg.site,
                        msg.title,
                        msg.description,
                        msg.kind,
                        msg.priority,
                    );
                    this.postMessage({
                        type: CreateBitbucketIssueMessageType.SubmitResponse,
                        issue: result,
                    });
                    this.analytics.fireBBIssueCreatedEvent(this.site.details);
                } catch (e) {
                    this.logger.error(new Error(`error creating issue: ${e}`));
                    this.postMessage({
                        type: CreateBitbucketIssueMessageType.SubmitResponse,
                        issue: undefined!,
                    });
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error creating issue'),
                    });
                }
                break;
            case CommonActionType.Refresh: {
                try {
                    await this.invalidate();
                } catch (e) {
                    this.logger.error(new Error(`error refreshing create bitbucket issue page: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error refeshing the page'),
                    });
                }
                break;
            }

            case CommonActionType.SendAnalytics:
            case CommonActionType.CopyLink:
            case CommonActionType.OpenJiraIssue:
            case CommonActionType.Cancel:
            case CommonActionType.SubmitFeedback:
            case CommonActionType.ExternalLink:
            case CommonActionType.DismissPMFLater:
            case CommonActionType.DismissPMFNever:
            case CommonActionType.OpenPMFSurvey:
            case CommonActionType.SubmitPMF: {
                this.commonHandler.onMessageReceived(msg);
                break;
            }

            default: {
                defaultActionGuard(msg);
            }
        }
    }
}
