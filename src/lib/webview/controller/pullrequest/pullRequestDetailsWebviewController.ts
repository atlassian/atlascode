import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import Axios from 'axios';
import { DetailedSiteInfo } from '../../../../atlclients/authInfo';
import {
    ApprovalStatus,
    BitbucketIssue,
    BuildStatus,
    Comment,
    Commit,
    FileDiff,
    MergeStrategy,
    PullRequest,
    Task,
    User,
} from '../../../../bitbucket/model';
import { AnalyticsApi } from '../../../analyticsApi';
import { CommonAction, CommonActionType } from '../../../ipc/fromUI/common';
import { PullRequestDetailsAction, PullRequestDetailsActionType } from '../../../ipc/fromUI/pullRequestDetails';
import { WebViewID } from '../../../ipc/models/common';
import { CommonMessage, CommonMessageType } from '../../../ipc/toUI/common';
import {
    emptyPullRequestDetailsInitMessage,
    PullRequestDetailsMessage,
    PullRequestDetailsMessageType,
    PullRequestDetailsResponse,
} from '../../../ipc/toUI/pullRequestDetails';
import { Logger } from '../../../logger';
import { formatError } from '../../formatError';
import { CommonActionMessageHandler } from '../common/commonActionMessageHandler';
import { MessagePoster, WebviewController } from '../webviewController';
import { PullRequestDetailsActionApi } from './pullRequestDetailsActionApi';
// eslint-disable-next-line no-restricted-imports
import { l10n } from 'vscode';

export const title: string = l10n.t('Pull Request'); //TODO: Needs the pull request ID as well...

export class PullRequestDetailsWebviewController implements WebviewController<PullRequest> {
    private pr: PullRequest;
    private commits: Commit[] = [];
    private messagePoster: MessagePoster;
    private api: PullRequestDetailsActionApi;
    private logger: Logger;
    private analytics: AnalyticsApi;
    private commonHandler: CommonActionMessageHandler;
    private isRefreshing: boolean;
    private pageComments: Comment[];
    private inlineComments: Comment[];
    private tasks: Task[];

    constructor(
        pr: PullRequest,
        messagePoster: MessagePoster,
        api: PullRequestDetailsActionApi,
        commonHandler: CommonActionMessageHandler,
        logger: Logger,
        analytics: AnalyticsApi,
    ) {
        this.pr = pr;
        this.messagePoster = messagePoster;
        this.api = api;
        this.logger = logger;
        this.analytics = analytics;
        this.commonHandler = commonHandler;
    }

    private postMessage(message: PullRequestDetailsMessage | PullRequestDetailsResponse | CommonMessage) {
        this.messagePoster(message);
    }

    private async getCurrentUser(): Promise<User> {
        return await this.api.getCurrentUser(this.pr);
    }

    public title(): string {
        return l10n.t('Pull Request {0}', this.pr.data.id);
    }

    public screenDetails() {
        return { id: WebViewID.PullRequestDetailsWebview, site: undefined, product: undefined };
    }

    private splitComments(allComments: Comment[]) {
        const pageComments: Comment[] = [];
        const inlineComments: Comment[] = [];
        allComments.forEach((comment) => (comment.inline ? inlineComments.push(comment) : pageComments.push(comment)));
        return [pageComments, inlineComments];
    }

    private async invalidate() {
        try {
            if (this.isRefreshing) {
                return;
            }
            this.isRefreshing = true;

            /* The page state is loaded in chunks (comments, commits, tasks, etc).
             * Some of these chunks rely on others (e.g. tasks rely on comments), but others do not.
             * Therefore, we can break the data-gathering process into parts. Many of these parts can
             * be ran concurrently with promises, and then only data that relies on this new data
             * needs to wait. The hope is to shave significant time off the PR load processes.
             */

            //Gather some basic data about the PR to use in future calls
            this.pr = await this.api.getPR(this.pr);
            this.postMessage({
                ...emptyPullRequestDetailsInitMessage,
                type: PullRequestDetailsMessageType.Init,
                pr: this.pr,
                currentUser: await this.getCurrentUser(),
                currentBranchName: this.api.getCurrentBranchName(this.pr),
            });

            //Launch several independent, async processes
            //Comments, commits, build statuses, and merge strategies
            const allCommentsPromise = this.api.getComments(this.pr).then((allComments: Comment[]) => {
                const [pageComments, inlineComments] = this.splitComments(allComments);
                this.postMessage({
                    type: PullRequestDetailsMessageType.UpdateComments,
                    comments: pageComments,
                });
                return [pageComments, inlineComments];
            });
            const commitPromise = this.api.updateCommits(this.pr).then((commits: Commit[]) => {
                this.postMessage({
                    type: PullRequestDetailsMessageType.UpdateCommits,
                    commits: commits,
                });
                return commits;
            });
            const buildStatusPromise = this.api.updateBuildStatuses(this.pr).then((buildStatuses: BuildStatus[]) => {
                this.postMessage({
                    type: PullRequestDetailsMessageType.UpdateBuildStatuses,
                    buildStatuses: buildStatuses,
                });
                return buildStatuses;
            });
            const mergeStrategiesPromise = this.api
                .updateMergeStrategies(this.pr)
                .then((mergeStrategies: MergeStrategy[]) => {
                    this.postMessage({
                        type: PullRequestDetailsMessageType.UpdateMergeStrategies,
                        mergeStrategies: mergeStrategies,
                    });
                    return mergeStrategies;
                });

            //We wait for the comment promise because tasks require them
            //Diffs technically do not, but diffs don't know which comment belong to which file
            //until comment data is returned, so better to wait on diffs until comments are done.
            [this.pageComments, this.inlineComments] = await allCommentsPromise;

            const tasksPromise = this.api
                .getTasks(this.pr, this.pageComments, this.inlineComments)
                .then((tasksAndComments) => {
                    this.postMessage({
                        type: PullRequestDetailsMessageType.UpdateTasks,
                        comments: tasksAndComments.pageComments,
                        tasks: tasksAndComments.tasks,
                    });
                    return tasksAndComments;
                });

            //This one is fire and forget because nothing depends on this
            this.api.getFileDiffs(this.pr, this.inlineComments).then((fileDiffs: FileDiff[]) => {
                this.postMessage({
                    type: PullRequestDetailsMessageType.UpdateFileDiffs,
                    fileDiffs: fileDiffs,
                });
            });

            //In order to get related issues, we need comments and commits. We already have comments,
            //so now we wait for commits. These two promises can be launched concurrently.
            this.commits = await commitPromise;
            const relatedJiraIssuesPromise = this.api
                .fetchRelatedJiraIssues(this.pr, this.commits, this.pageComments)
                .then((relatedJiraIssues: MinimalIssue<DetailedSiteInfo>[]) => {
                    this.postMessage({
                        type: PullRequestDetailsMessageType.UpdateRelatedJiraIssues,
                        relatedIssues: relatedJiraIssues,
                    });
                    return relatedJiraIssues;
                });

            const relatedBitbucketIssuesPromise = this.api
                .fetchRelatedBitbucketIssues(this.pr, this.commits, this.pageComments)
                .then((relatedBitbucketIssues: BitbucketIssue[]) => {
                    this.postMessage({
                        type: PullRequestDetailsMessageType.UpdateRelatedBitbucketIssues,
                        relatedIssues: relatedBitbucketIssues,
                    });
                    return relatedBitbucketIssues;
                });

            //Now we wait for all remaining promises in 2 batches. The reason for this is that some of
            //these promises are older than others, meaning they're more likely to have finished.
            await Promise.all([
                buildStatusPromise,
                mergeStrategiesPromise,
                relatedJiraIssuesPromise,
                relatedBitbucketIssuesPromise,
            ]);
            const tasksAndComments = await tasksPromise;
            this.pageComments = tasksAndComments.pageComments;
            this.inlineComments = tasksAndComments.inlineComments;
            this.tasks = tasksAndComments.tasks;
        } catch (e) {
            let err = new Error(`error updating pull request: ${e}`);
            this.logger.error(err);
            this.postMessage({ type: CommonMessageType.Error, reason: formatError(e) });
        } finally {
            this.isRefreshing = false;
        }
    }

    public async update() {
        this.invalidate();
    }

    public async onMessageReceived(msg: PullRequestDetailsAction | CommonAction) {
        switch (msg.type) {
            case CommonActionType.Refresh: {
                try {
                    await this.invalidate();
                } catch (e) {
                    this.logger.error(new Error(`error refreshing pull request: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error refreshing pull request'),
                    });
                }
                break;
            }

            case PullRequestDetailsActionType.FetchUsersRequest: {
                try {
                    const users = await this.api.fetchUsers(msg.site, msg.query, msg.abortKey);
                    this.postMessage({
                        type: PullRequestDetailsMessageType.FetchUsersResponse,
                        users: users,
                    });
                } catch (e) {
                    if (Axios.isCancel(e)) {
                        this.logger.warn(formatError(e));
                    } else {
                        this.logger.error(new Error(`error fetching users: ${e}`));
                        this.postMessage({
                            type: CommonMessageType.Error,
                            reason: formatError(e, 'Error fetching users'),
                        });
                    }
                }
                break;
            }

            case PullRequestDetailsActionType.UpdateReviewers: {
                try {
                    const reviewers = await this.api.updateReviewers(this.pr, msg.reviewers);
                    this.postMessage({
                        type: PullRequestDetailsMessageType.UpdateReviewers,
                        reviewers: reviewers,
                    });
                } catch (e) {
                    this.logger.error(new Error(`error updating reviewers: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error fetching users'),
                    });
                } finally {
                    this.postMessage({
                        type: PullRequestDetailsMessageType.UpdateReviewersResponse,
                    });
                }
                break;
            }

            case PullRequestDetailsActionType.UpdateSummaryRequest: {
                try {
                    const pr = await this.api.updateSummary(this.pr, msg.text);
                    this.postMessage({
                        type: PullRequestDetailsMessageType.UpdateSummary,
                        rawSummary: pr.data.rawSummary,
                        htmlSummary: pr.data.htmlSummary,
                    });
                } catch (e) {
                    this.logger.error(new Error(`error fetching users: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error fetching users'),
                    });
                }
                break;
            }

            case PullRequestDetailsActionType.UpdateTitleRequest: {
                try {
                    const pr = await this.api.updateTitle(this.pr, msg.text);
                    this.postMessage({
                        type: PullRequestDetailsMessageType.UpdateTitle,
                        title: pr.data.title,
                    });
                } catch (e) {
                    this.logger.error(new Error(`error fetching users: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error fetching users'),
                    });
                }
                break;
            }

            case PullRequestDetailsActionType.UpdateApprovalStatus: {
                try {
                    this.analytics.firePrApproveEvent(this.pr.site.details);
                    const status: ApprovalStatus = await this.api.updateApprovalStatus(this.pr, msg.status);
                    this.postMessage({
                        type: PullRequestDetailsMessageType.UpdateApprovalStatus,
                        status: status,
                    });
                } catch (e) {
                    this.logger.error(new Error(`error updating approval status: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error updating approval status'),
                    });
                }
                break;
            }

            case PullRequestDetailsActionType.CheckoutBranch: {
                try {
                    this.analytics.firePrCheckoutEvent(this.pr.site.details);
                    const newBranchName = await this.api.checkout(this.pr);
                    this.postMessage({
                        type: PullRequestDetailsMessageType.CheckoutBranch,
                        branchName: newBranchName,
                    });
                } catch (e) {
                    this.logger.error(new Error(`error checking out pull request branch: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error checking out pull request'),
                    });
                }
                break;
            }

            case PullRequestDetailsActionType.PostComment: {
                try {
                    this.analytics.firePrCommentEvent(this.pr.site.details);
                    this.pageComments = await this.api.postComment(
                        this.pageComments,
                        this.pr,
                        msg.rawText,
                        msg.parentId,
                    );
                    this.postMessage({
                        type: PullRequestDetailsMessageType.UpdateComments,
                        comments: this.pageComments,
                    });
                } catch (e) {
                    this.logger.error(new Error(`error adding comment: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error adding comment'),
                    });
                } finally {
                    this.postMessage({
                        type: PullRequestDetailsMessageType.PostCommentResponse,
                    });
                }
                break;
            }

            case PullRequestDetailsActionType.EditComment: {
                try {
                    this.pageComments = await this.api.editComment(
                        this.pageComments,
                        this.pr,
                        msg.rawContent,
                        msg.commentId,
                    );
                    this.postMessage({
                        type: PullRequestDetailsMessageType.UpdateComments,
                        comments: this.pageComments,
                    });
                } catch (e) {
                    this.logger.error(new Error(`error editing comment: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error editing comment'),
                    });
                } finally {
                    this.postMessage({
                        type: PullRequestDetailsMessageType.EditCommentResponse,
                    });
                }
                break;
            }

            case PullRequestDetailsActionType.DeleteComment: {
                try {
                    const allComments = await this.api.deleteComment(this.pr, msg.comment);
                    [this.pageComments, this.inlineComments] = this.splitComments(allComments);

                    this.postMessage({
                        type: PullRequestDetailsMessageType.UpdateComments,
                        comments: this.pageComments,
                    });
                } catch (e) {
                    this.logger.error(new Error(`error deleting comment: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error deleting comment'),
                    });
                } finally {
                    this.postMessage({
                        type: PullRequestDetailsMessageType.DeleteCommentResponse,
                    });
                }
                break;
            }
            case PullRequestDetailsActionType.AddTask: {
                try {
                    this.analytics.firePrTaskEvent(this.pr.site.details, msg.commentId);
                    const { tasks, comments } = await this.api.createTask(
                        this.tasks,
                        [...this.pageComments, ...this.inlineComments],
                        this.pr,
                        msg.content,
                        msg.commentId,
                    );
                    [this.pageComments, this.inlineComments] = this.splitComments(comments);
                    this.tasks = tasks;
                    this.postMessage({
                        type: PullRequestDetailsMessageType.UpdateTasks,
                        tasks: this.tasks,
                        comments: this.pageComments,
                    });
                } catch (e) {
                    this.logger.error(new Error(`error adding task: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error adding task'),
                    });
                } finally {
                    this.postMessage({
                        type: PullRequestDetailsMessageType.AddTaskResponse,
                    });
                }
                break;
            }
            case PullRequestDetailsActionType.EditTask: {
                try {
                    const { tasks, comments } = await this.api.editTask(
                        this.tasks,
                        [...this.pageComments, ...this.inlineComments],
                        this.pr,
                        msg.task,
                    );
                    [this.pageComments, this.inlineComments] = this.splitComments(comments);
                    this.tasks = tasks;
                    this.postMessage({
                        type: PullRequestDetailsMessageType.UpdateTasks,
                        tasks: this.tasks,
                        comments: this.pageComments,
                    });
                } catch (e) {
                    this.logger.error(new Error(`error editing task: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error editing task'),
                    });
                } finally {
                    this.postMessage({
                        type: PullRequestDetailsMessageType.EditTaskResponse,
                    });
                }
                break;
            }
            case PullRequestDetailsActionType.DeleteTask: {
                try {
                    const { tasks, comments } = await this.api.deleteTask(this.pr, msg.task);
                    [this.pageComments, this.inlineComments] = this.splitComments(comments);
                    this.tasks = tasks;
                    this.postMessage({
                        type: PullRequestDetailsMessageType.UpdateTasks,
                        tasks: this.tasks,
                        comments: this.pageComments,
                    });
                } catch (e) {
                    this.logger.error(new Error(`error deleting task: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error deleting task'),
                    });
                } finally {
                    this.postMessage({
                        type: PullRequestDetailsMessageType.DeleteTaskResponse,
                    });
                }
                break;
            }
            case PullRequestDetailsActionType.OpenDiffRequest:
                try {
                    //Inline comments are passed in to avoid refetching them.
                    await this.api.openDiffViewForFile(this.pr, msg.fileDiff, this.inlineComments);
                } catch (e) {
                    this.logger.error(new Error(`error opening diff: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error opening diff'),
                    });
                }
                break;

            case PullRequestDetailsActionType.Merge:
                try {
                    this.analytics.firePrMergeEvent(this.pr.site.details);
                    const updatedPullRequest = await this.api.merge(
                        this.pr,
                        msg.mergeStrategy,
                        msg.commitMessage,
                        msg.closeSourceBranch,
                        msg.issues,
                    );
                    this.pr = { ...this.pr, ...updatedPullRequest };
                    this.update();
                } catch (e) {
                    this.logger.error(new Error(`error merging pull request: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error merging pull request'),
                    });
                }
                break;
            case PullRequestDetailsActionType.OpenJiraIssue:
                try {
                    await this.api.openJiraIssue(msg.issue);
                } catch (e) {
                    this.logger.error(new Error(`error opening jira issue: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error opening jira issue'),
                    });
                }
                break;
            case PullRequestDetailsActionType.OpenBitbucketIssue:
                try {
                    await this.api.openBitbucketIssue(msg.issue);
                } catch (e) {
                    this.logger.error(new Error(`error opening jira issue: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error opening jira issue'),
                    });
                }
                break;

            case PullRequestDetailsActionType.OpenBuildStatus:
                try {
                    await this.api.openBuildStatus(this.pr, msg.buildStatus);
                } catch (e) {
                    this.logger.error(new Error(`error opening build status: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error opening build status'),
                    });
                }
                break;

            case CommonActionType.SendAnalytics:
            case CommonActionType.CopyLink:
            case CommonActionType.OpenJiraIssue:
            case CommonActionType.SubmitFeedback:
            case CommonActionType.ExternalLink:
            case CommonActionType.DismissPMFLater:
            case CommonActionType.DismissPMFNever:
            case CommonActionType.OpenPMFSurvey:
            case CommonActionType.Cancel:
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
