import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import Axios from 'axios';
import { ProductBitbucket } from '../../../../atlclients/authInfo';
import { BitbucketIssue, User } from '../../../../bitbucket/model';
import { AnalyticsApi } from '../../../analyticsApi';
import { BitbucketIssueAction, BitbucketIssueActionType } from '../../../ipc/fromUI/bbIssue';
import { CommonActionType } from '../../../ipc/fromUI/common';
import { WebViewID } from '../../../ipc/models/common';
import { BitbucketIssueMessage, BitbucketIssueMessageType, BitbucketIssueResponse } from '../../../ipc/toUI/bbIssue';
import { CommonMessage, CommonMessageType } from '../../../ipc/toUI/common';
import { Logger } from '../../../logger';
import { formatError } from '../../formatError';
import { CommonActionMessageHandler } from '../common/commonActionMessageHandler';
import { MessagePoster, WebviewController } from '../webviewController';
import { BitbucketIssueActionApi } from './bitbucketIssueActionApi';

export const id: string = 'bitbucketIssuePageV2';

export class BitbucketIssueWebviewController implements WebviewController<BitbucketIssue> {
    public readonly requiredFeatureFlags = [];
    public readonly requiredExperiments = [];

    private _issue: BitbucketIssue;
    private _messagePoster: MessagePoster;
    private _api: BitbucketIssueActionApi;
    private _logger: Logger;
    private _analytics: AnalyticsApi;
    private _commonHandler: CommonActionMessageHandler;
    private _isRefreshing = false;
    private _participants: Map<string, User> = new Map();

    constructor(
        issue: BitbucketIssue,
        messagePoster: MessagePoster,
        api: BitbucketIssueActionApi,
        commonHandler: CommonActionMessageHandler,
        logger: Logger,
        analytics: AnalyticsApi,
    ) {
        this._issue = issue;
        this._messagePoster = messagePoster;
        this._api = api;
        this._logger = logger;
        this._analytics = analytics;
        this._commonHandler = commonHandler;
    }

    public title(): string {
        return `Bitbucket issue #${this._issue.data.id}`;
    }

    public screenDetails() {
        return { id: WebViewID.BitbucketIssueWebview, site: this._issue.site.details, product: ProductBitbucket };
    }

    private postMessage(message: BitbucketIssueMessage | BitbucketIssueResponse | CommonMessage) {
        this._messagePoster(message);
    }

    private async currentUser(): Promise<User> {
        return await this._api.currentUser(this._issue);
    }

    private async invalidate() {
        try {
            if (this._isRefreshing) {
                return;
            }

            this._isRefreshing = true;
            this._issue = await this._api.getIssue(this._issue);
            this.postMessage({
                type: BitbucketIssueMessageType.Init,
                issue: this._issue,
                currentUser: await this.currentUser(),
                showJiraButton: this._api.getShowJiraButtonConfig(),
            });

            const comments = await this._api.getComments(this._issue);
            this._participants.clear();
            comments.forEach((c) => this._participants.set(c.user.accountId, c.user));

            this.postMessage({
                type: BitbucketIssueMessageType.InitComments,
                comments: comments,
            });
        } catch (e) {
            const err = new Error(`error updating bitbucket issue: ${e}`);
            this._logger.error(err);
            this.postMessage({ type: CommonMessageType.Error, reason: formatError(e) });
        } finally {
            this._isRefreshing = false;
        }
    }

    public async update(issue: BitbucketIssue) {
        this.postMessage({
            type: BitbucketIssueMessageType.Init,
            issue: issue,
            currentUser: await this.currentUser(),
            showJiraButton: this._api.getShowJiraButtonConfig(),
        });
    }

    public async onMessageReceived(msg: BitbucketIssueAction) {
        switch (msg.type) {
            case BitbucketIssueActionType.UpdateStatusRequest:
                try {
                    const [status, comment] = await this._api.updateStatus(this._issue, msg.status);
                    this.postMessage({
                        type: BitbucketIssueMessageType.UpdateStatusResponse,
                        status: status,
                    });
                    this.postMessage({
                        type: BitbucketIssueMessageType.UpdateComments,
                        comments: [comment],
                    });
                    this._analytics.fireBBIssueTransitionedEvent(this._issue.site.details);
                } catch (e) {
                    this._logger.error(new Error(`error updating status: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error updating status'),
                    });
                }
                break;
            case BitbucketIssueActionType.AddCommentRequest:
                try {
                    const comment = await this._api.postComment(this._issue, msg.content);
                    this.postMessage({
                        type: BitbucketIssueMessageType.AddCommentResponse,
                        comment: comment,
                    });
                    this._analytics.fireBBIssueCommentEvent(this._issue.site.details);
                } catch (e) {
                    this._logger.error(new Error(`error adding comment: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error adding comment'),
                    });
                }
                break;
            case BitbucketIssueActionType.FetchUsersRequest:
                try {
                    const users = await this._api.fetchUsers(this._issue, msg.query, msg.abortKey);
                    this.postMessage({
                        type: BitbucketIssueMessageType.FetchUsersResponse,
                        users: users,
                    });
                } catch (e) {
                    if (Axios.isCancel(e)) {
                        this._logger.warn(formatError(e));
                    } else {
                        this._logger.error(new Error(`error fetching users: ${e}`));
                        this.postMessage({
                            type: CommonMessageType.Error,
                            reason: formatError(e, 'Error fetching users'),
                        });
                    }
                }
                break;
            case BitbucketIssueActionType.AssignRequest:
                try {
                    const [assignee, comment] = await this._api.assign(this._issue, msg.accountId);
                    this.postMessage({
                        type: BitbucketIssueMessageType.AssignResponse,
                        assignee: assignee,
                    });
                    this.postMessage({
                        type: BitbucketIssueMessageType.UpdateComments,
                        comments: [comment],
                    });
                } catch (e) {
                    this._logger.error(new Error(`error assigning issue: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error assigning issue'),
                    });
                }
                break;
            case BitbucketIssueActionType.StartWork:
                this._api.openStartWorkPage(this._issue);
                break;
            case BitbucketIssueActionType.CreateJiraIssue:
                this._api.createJiraIssue(this._issue);
                break;
            case CommonActionType.Refresh: {
                try {
                    await this.invalidate();
                } catch (e) {
                    this._logger.error(new Error(`error refreshing config: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error refeshing config'),
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
                this._commonHandler.onMessageReceived(msg);
                break;
            }

            default: {
                defaultActionGuard(msg);
            }
        }
    }
}
