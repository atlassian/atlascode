import axios, { CancelToken, CancelTokenSource } from 'axios';
import { commands } from 'vscode';
import { clientForSite } from '../../bitbucket/bbUtils';
import { BitbucketIssue, Comment, User } from '../../bitbucket/model';
import { Commands } from '../../commands';
import { Container } from '../../container';
import { CancellationManager } from '../../lib/cancellation';
import { BitbucketIssueActionApi } from '../../lib/webview/controller/bbIssue/bitbucketIssueActionApi';

export class VSCBitbucketIssueActionApi implements BitbucketIssueActionApi {
    constructor(private cancellationManager: CancellationManager) {}

    async currentUser(issue: BitbucketIssue): Promise<User> {
        return await Container.bitbucketContext.currentUser(issue.site);
    }

    async getIssue(issue: BitbucketIssue): Promise<BitbucketIssue> {
        const bbApi = await clientForSite(issue.site);

        return bbApi.issues!.refetch(issue);
    }

    async getComments(issue: BitbucketIssue): Promise<Comment[]> {
        const bbApi = await clientForSite(issue.site);
        const [comments, changes] = await Promise.all([
            bbApi.issues!.getComments(issue),
            bbApi.issues!.getChanges(issue),
        ]);

        // replace comment with change data which contains additional details
        const updatedComments = comments.data.map(
            (comment) => changes.data.find((change) => change.id! === comment.id!) || comment,
        );

        return updatedComments;
    }

    async postComment(issue: BitbucketIssue, content: string): Promise<Comment> {
        const bbApi = await clientForSite(issue.site);
        return await bbApi.issues!.postComment(issue, content);
    }

    async updateStatus(issue: BitbucketIssue, status: string): Promise<[string, Comment]> {
        const bbApi = await clientForSite(issue.site);
        return await bbApi.issues!.postChange(issue, status);
    }

    async fetchUsers(issue: BitbucketIssue, query: string, abortKey?: string): Promise<User[]> {
        const bbApi = await clientForSite(issue.site);

        let cancelToken: CancelToken | undefined = undefined;

        if (abortKey) {
            const signal: CancelTokenSource = axios.CancelToken.source();
            cancelToken = signal.token;
            this.cancellationManager.set(abortKey, signal);
        }

        return await bbApi.pullrequests.getReviewers(issue.site, query, cancelToken);
    }

    async assign(issue: BitbucketIssue, accountId?: string): Promise<[User, Comment]> {
        const bbApi = await clientForSite(issue.site);
        return await bbApi.issues!.assign(issue, accountId);
    }

    async openStartWorkPage(issue: BitbucketIssue): Promise<void> {
        await commands.executeCommand(Commands.StartWorkOnBitbucketIssue, issue);
    }

    async createJiraIssue(issue: BitbucketIssue): Promise<void> {
        await commands.executeCommand(Commands.CreateIssue, issue);
    }

    getShowJiraButtonConfig(): boolean {
        return Container.config.bitbucket.issues.createJiraEnabled;
    }
}
