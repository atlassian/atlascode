import { isMinimalIssue, MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import axios, { CancelToken, CancelTokenSource } from 'axios';
import pSettle, { PromiseFulfilledResult } from 'p-settle';
import * as vscode from 'vscode';

import { DetailedSiteInfo, ProductJira } from '../../atlclients/authInfo';
import { clientForSite } from '../../bitbucket/bbUtils';
import { extractBitbucketIssueKeys, extractIssueKeys } from '../../bitbucket/issueKeysExtractor';
import {
    ApprovalStatus,
    BitbucketIssue,
    BitbucketSite,
    BuildStatus,
    Comment,
    Commit,
    FileDiff,
    isBitbucketIssue,
    MergeStrategy,
    PullRequest,
    Reviewer,
    Task,
    User,
} from '../../bitbucket/model';
import { Commands } from '../../commands';
import { showIssue } from '../../commands/jira/showIssue';
import { Container } from '../../container';
import { issueForKey } from '../../jira/issueForKey';
import { transitionIssue } from '../../jira/transitionIssue';
import { CancellationManager } from '../../lib/cancellation';
import { PullRequestDetailsActionApi } from '../../lib/webview/controller/pullrequest/pullRequestDetailsActionApi';
import { Logger } from '../../logger';
import { getArgsForDiffView } from '../../views/pullrequest/diffViewHelper';
import { addSourceRemoteIfNeededForPR } from '../../views/pullrequest/gitActions';
import {
    addTasksToCommentHierarchy,
    addTaskToCommentHierarchy,
    addToCommentHierarchy,
    fileDiffContainsComments,
    replaceCommentInHierarchy,
    replaceTaskInCommentHierarchy,
    replaceTaskInTaskList,
} from '../common/pullRequestHelperActions';

export class VSCPullRequestDetailsActionApi implements PullRequestDetailsActionApi {
    constructor(private cancellationManager: CancellationManager) {}

    async getCurrentUser(pr: PullRequest): Promise<User> {
        return await Container.bitbucketContext.currentUser(pr.site);
    }

    async getPR(pr: PullRequest): Promise<PullRequest> {
        const bbApi = await clientForSite(pr.site);

        return bbApi.pullrequests.get(pr.site, pr.data.id, pr.workspaceRepo);
    }

    async fetchUsers(site: BitbucketSite, query: string, abortKey?: string | undefined): Promise<User[]> {
        const client = await Container.clientManager.bbClient(site.details);

        let cancelToken: CancelToken | undefined = undefined;

        if (abortKey) {
            const signal: CancelTokenSource = axios.CancelToken.source();
            cancelToken = signal.token;
            this.cancellationManager.set(abortKey, signal);
        }

        return await client.pullrequests.getReviewers(site, query, cancelToken);
    }

    async updateSummary(pr: PullRequest, text: string): Promise<PullRequest> {
        const bbApi = await clientForSite(pr.site);
        return await bbApi.pullrequests.update(
            pr,
            pr.data.title,
            text,
            pr.data.participants.filter((p) => p.role === 'REVIEWER').map((p) => p.accountId),
        );
    }

    async updateTitle(pr: PullRequest, text: string): Promise<PullRequest> {
        const bbApi = await clientForSite(pr.site);
        const newPr = await bbApi.pullrequests.update(
            pr,
            text,
            pr.data.rawSummary,
            pr.data.participants.filter((p) => p.role === 'REVIEWER').map((p) => p.accountId),
        );

        vscode.commands.executeCommand(Commands.BitbucketRefreshPullRequests);
        return newPr;
    }

    async updateCommits(pr: PullRequest): Promise<Commit[]> {
        const bbApi = await clientForSite(pr.site);
        return await bbApi.pullrequests.getCommits(pr);
    }

    async updateReviewers(pr: PullRequest, newReviewers: User[]): Promise<Reviewer[]> {
        const bbApi = await clientForSite(pr.site);
        //On BBServer, accountId is actually the userslug which replaces all special characters with underscore. This can break for user names that
        //contain special characters (especially user names which are email addresses), so a separate unescaped userName property is stored
        const { data } = await bbApi.pullrequests.update(
            pr,
            pr.data.title,
            pr.data.rawSummary,
            newReviewers.map((user) => (pr.site.details.isCloud ? user.accountId : (user.userName ?? user.accountId))),
        );
        return data.participants;
    }

    async updateApprovalStatus(pr: PullRequest, status: ApprovalStatus): Promise<ApprovalStatus> {
        const bbApi = await clientForSite(pr.site);
        const newStatus = await bbApi.pullrequests.updateApproval(pr, status);
        return newStatus;
    }

    getCurrentBranchName(pr: PullRequest): string {
        let currentBranchName = '';
        if (pr.workspaceRepo) {
            const scm = Container.bitbucketContext.getRepositoryScm(pr.workspaceRepo!.rootUri)!;
            currentBranchName = scm.state.HEAD ? scm.state.HEAD.name! : '';
        }

        return currentBranchName;
    }

    async checkout(pr: PullRequest): Promise<string> {
        if (!pr.workspaceRepo) {
            throw new Error('no workspace repo');
        }

        await addSourceRemoteIfNeededForPR(pr);

        const scm = Container.bitbucketContext.getRepositoryScm(pr.workspaceRepo.rootUri)!;
        await scm.fetch();
        await scm.checkout(pr.data.source.branchName);
        if (scm.state.HEAD?.behind) {
            scm.pull();
        }

        //New current branch name
        return scm.state.HEAD?.name ?? '';
    }

    async getComments(pr: PullRequest): Promise<Comment[]> {
        const bbApi = await clientForSite(pr.site);
        const paginatedComments = await bbApi.pullrequests.getComments(pr);
        return paginatedComments.data;
    }

    async postComment(comments: Comment[], pr: PullRequest, rawText: string, parentId?: string): Promise<Comment[]> {
        const bbApi = await clientForSite(pr.site);
        const newComment: Comment = await bbApi.pullrequests.postComment(pr.site, pr.data.id, rawText, parentId ?? '');
        if (parentId) {
            const [updatedComments, success] = addToCommentHierarchy(comments, newComment);
            return success ? updatedComments : await this.getComments(pr);
        }

        return [...comments, newComment];
    }

    async editComment(comments: Comment[], pr: PullRequest, content: string, commentId: string): Promise<Comment[]> {
        const bbApi = await clientForSite(pr.site);
        const newComment: Comment = await bbApi.pullrequests.editComment(pr.site, pr.data.id, content, commentId);
        const [updatedComments, success] = replaceCommentInHierarchy(comments, newComment);
        return success ? updatedComments : await this.getComments(pr);
    }

    async deleteComment(pr: PullRequest, comment: Comment): Promise<Comment[]> {
        const bbApi = await clientForSite(pr.site);
        await bbApi.pullrequests.deleteComment(pr.site, pr.data.id, comment.id);
        return await this.getComments(pr);
    }

    async getFileDiffs(pr: PullRequest, inlineComments: Comment[]): Promise<FileDiff[]> {
        const bbApi = await clientForSite(pr.site);
        const fileDiffs: FileDiff[] = await bbApi.pullrequests.getChangedFiles(pr);
        fileDiffs.forEach((fileDiff) => {
            if (fileDiffContainsComments(fileDiff, inlineComments)) {
                fileDiff.hasComments = true;
            }
        });
        return fileDiffs;
    }

    async getConflictedFiles(pr: PullRequest): Promise<string[]> {
        const bbApi = await clientForSite(pr.site);
        const conflictedFiles = await bbApi.pullrequests.getConflictedFiles(pr);
        return conflictedFiles;
    }

    async openDiffViewForFile(pr: PullRequest, fileDiff: FileDiff, comments: Comment[]): Promise<void> {
        const conflictedFiles = await this.getConflictedFiles(pr);
        const diffViewArgs = await getArgsForDiffView(
            { data: comments },
            fileDiff,
            conflictedFiles,
            pr,
            Container.bitbucketContext.prCommentController,
        );
        vscode.commands.executeCommand(Commands.ViewDiff, ...diffViewArgs.diffArgs);
    }

    async updateBuildStatuses(pr: PullRequest): Promise<BuildStatus[]> {
        const bbApi = await clientForSite(pr.site);
        return await bbApi.pullrequests.getBuildStatuses(pr);
    }

    async updateMergeStrategies(pr: PullRequest): Promise<MergeStrategy[]> {
        const bbApi = await clientForSite(pr.site);
        return await bbApi.pullrequests.getMergeStrategies(pr);
    }

    async fetchRelatedJiraIssues(
        pr: PullRequest,
        commits: Commit[],
        comments: Comment[],
    ): Promise<MinimalIssue<DetailedSiteInfo>[]> {
        let foundIssues: MinimalIssue<DetailedSiteInfo>[] = [];
        try {
            if (Container.siteManager.productHasAtLeastOneSite(ProductJira)) {
                const issueKeys = await extractIssueKeys(pr, commits, comments);
                const issueResults = await pSettle<MinimalIssue<DetailedSiteInfo>>(issueKeys.map(issueForKey));
                foundIssues = issueResults
                    .filter((result) => result.isFulfilled)
                    .map((result: PromiseFulfilledResult<MinimalIssue<DetailedSiteInfo>>) => result.value);
            }
        } catch (e) {
            foundIssues = [];
            Logger.debug('error fetching related jira issues: ', e);
        } finally {
            return foundIssues;
        }
    }

    async fetchRelatedBitbucketIssues(
        pr: PullRequest,
        commits: Commit[],
        comments: Comment[],
    ): Promise<BitbucketIssue[]> {
        let result: BitbucketIssue[] = [];
        try {
            const issueKeys = await extractBitbucketIssueKeys(pr, commits, comments);
            const bbApi = await clientForSite(pr.site);
            if (bbApi.issues) {
                result = await bbApi.issues.getIssuesForKeys(pr.site, issueKeys);
            }
        } catch (e) {
            result = [];
            Logger.debug('error fetching related bitbucket issues: ', e);
        }
        return result;
    }

    async merge(
        pr: PullRequest,
        mergeStrategy: MergeStrategy,
        commitMessage: string,
        closeSourceBranch: boolean,
        issues: (MinimalIssue<DetailedSiteInfo> | BitbucketIssue)[],
    ): Promise<PullRequest> {
        const bbApi = await clientForSite(pr.site);
        const updatedPullRequest = await bbApi.pullrequests.merge(
            pr,
            closeSourceBranch,
            mergeStrategy.value,
            commitMessage,
        );

        await this.updateIssues(issues);
        vscode.commands.executeCommand(Commands.BitbucketRefreshPullRequests);
        vscode.commands.executeCommand(Commands.RefreshPipelines);
        return updatedPullRequest;
    }

    private async updateIssues(issues?: (MinimalIssue<DetailedSiteInfo> | BitbucketIssue)[]) {
        if (!issues) {
            return;
        }
        issues.forEach(async (issue) => {
            if (isMinimalIssue(issue)) {
                const transition = issue.transitions.find((t) => t.to.id === issue.status.id);
                if (transition) {
                    await transitionIssue(issue, transition);
                }
            } else if (isBitbucketIssue(issue)) {
                const bbApi = await clientForSite(issue.site);
                await bbApi.issues!.postChange(issue, issue.data.state!);
            }
        });
    }

    async openJiraIssue(issue: MinimalIssue<DetailedSiteInfo>) {
        await showIssue(issue);
    }
    async openBitbucketIssue(issue: BitbucketIssue) {
        await vscode.commands.executeCommand(Commands.ShowBitbucketIssue, issue);
    }

    async openBuildStatus(pr: PullRequest, status: BuildStatus) {
        if (status.url.includes('bitbucket.org') || status.url.includes('bb-inf.net')) {
            const pipelineUUID = status.url.substring(status.url.lastIndexOf('/') + 1);
            const bbApi = await clientForSite(pr.site);
            const pipeline = await bbApi.pipelines?.getPipeline(pr.site, pipelineUUID);

            if (pipeline) {
                vscode.commands.executeCommand(Commands.ShowPipeline, pipeline);
            } else {
                vscode.env.openExternal(vscode.Uri.parse(status.url));
            }
        } else {
            vscode.env.openExternal(vscode.Uri.parse(status.url));
        }
    }

    async getTasks(
        pr: PullRequest,
        pageComments: Comment[],
        inlineComments: Comment[],
    ): Promise<{ tasks: Task[]; pageComments: Comment[]; inlineComments: Comment[] }> {
        const bbApi = await clientForSite(pr.site);
        const tasks = await bbApi.pullrequests.getTasks(pr);
        return {
            tasks: tasks,
            pageComments: addTasksToCommentHierarchy(pageComments, tasks),
            inlineComments: addTasksToCommentHierarchy(inlineComments, tasks),
        };
    }

    async createTask(
        tasks: Task[],
        comments: Comment[],
        pr: PullRequest,
        content: string,
        commentId?: string,
    ): Promise<{ tasks: Task[]; comments: Comment[] }> {
        const bbApi = await clientForSite(pr.site);
        const newTask = await bbApi.pullrequests.postTask(pr.site, pr.data.id, content, commentId);
        const newTasks = [...tasks.slice(), newTask];

        //If the task belongs to a comment, add the task to the comment list
        if (commentId) {
            const [updatedComments] = addTaskToCommentHierarchy(comments, newTask);
            return { tasks: newTasks, comments: updatedComments };
        }
        return { tasks: newTasks, comments: comments };
    }

    async editTask(tasks: Task[], comments: Comment[], pr: PullRequest, task: Task) {
        const bbApi = await clientForSite(pr.site);
        const newTask = await bbApi.pullrequests.editTask(pr.site, pr.data.id, task);
        const newTasks = replaceTaskInTaskList(tasks, newTask);
        if (newTask.commentId) {
            const [updatedComments] = replaceTaskInCommentHierarchy(comments, task);
            return { tasks: newTasks, comments: updatedComments };
        }
        return { tasks: newTasks, comments: comments };
    }

    async deleteTask(pr: PullRequest, task: Task): Promise<{ tasks: Task[]; comments: Comment[] }> {
        const bbApi = await clientForSite(pr.site);
        await bbApi.pullrequests.deleteTask(pr.site, pr.data.id, task);

        //TODO: This can almost certainly be converted to local deletion rather than refetching comments.
        //However it's kind of complicated because of the logic associated with hiding deleted comments, so I'll leave this alone for now.
        const comments = await this.getComments(pr);
        const commentsAndTasks = await this.getTasks(pr, comments, []);
        return { tasks: commentsAndTasks.tasks, comments: commentsAndTasks.pageComments };
    }
}
