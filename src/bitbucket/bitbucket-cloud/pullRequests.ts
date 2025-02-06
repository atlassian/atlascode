import { CancelToken } from 'axios';
import PQueue from 'p-queue/dist';
import { configuration } from '../../config/configuration';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { Logger } from '../../logger';
import { CacheMap } from '../../util/cachemap';
import { Time } from '../../util/time';
import { getFileNameFromPaths } from '../../views/pullrequest/diffViewHelper';
import { HTTPClient } from '../httpClient';
import {
    ApprovalStatus,
    BitbucketSite,
    BuildStatus,
    Comment,
    Commit,
    CreatePullRequestData,
    FileDiff,
    FileStatus,
    MergeStrategy,
    PaginatedComments,
    PaginatedPullRequests,
    PullRequest,
    PullRequestApi,
    Task,
    UnknownUser,
    User,
    WorkspaceRepo,
} from '../model';
import { CloudRepositoriesApi } from './repositories';
import * as vscode from 'vscode';

export const maxItemsSupported = {
    commits: 100,
    comments: 100,
    reviewers: 100,
    buildStatuses: 100,
};
export const defaultPagelen = 25;

const mergeStrategyLabels = {
    merge_commit: vscode.l10n.t('Merge commit'),
    squash: vscode.l10n.t('Squash'),
    fast_forward: vscode.l10n.t('Fast forward'),
};

const TEAM_MEMBERS_CACHE_LIMIT = 1000;

export class CloudPullRequestApi implements PullRequestApi {
    private defaultReviewersCache: CacheMap = new CacheMap();
    private teamMembersCache: CacheMap = new CacheMap();
    private fileContentCache: CacheMap = new CacheMap();
    private queue = new PQueue({ concurrency: 1 });

    constructor(private client: HTTPClient) {}

    async getCurrentUser(site: DetailedSiteInfo): Promise<User> {
        const { data } = await this.client.get('/user');

        return CloudPullRequestApi.toUserModel(data);
    }

    static toUserModel(input: any): User {
        const accountId = input?.account_id ?? 'unknown';
        const avatarUrl = input?.links?.avatar?.href ?? '';
        const displayName = input?.display_name ?? vscode.l10n.t('Unknown User');
        const url = input?.links?.html?.href ?? '';
        const mention = `@[${displayName}](account_id:${accountId})`;

        return {
            accountId: accountId,
            avatarUrl: avatarUrl,
            emailAddress: undefined,
            userName: undefined,
            displayName: displayName,
            url: url,
            mention: mention,
        };
    }

    async getList(
        workspaceRepo: WorkspaceRepo,
        queryParams?: { pagelen?: number; sort?: string; q?: string },
    ): Promise<PaginatedPullRequests> {
        const site = workspaceRepo.mainSiteRemote.site;
        if (!site) {
            return { workspaceRepo, site: site!, data: [] };
        }
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(`/repositories/${ownerSlug}/${repoSlug}/pullrequests`, {
            pagelen: defaultPagelen,
            fields: '+values.participants,+values.rendered.*',
            ...queryParams,
        });

        const prs: PullRequest[] = data.values!.map((pr: any) =>
            CloudPullRequestApi.toPullRequestData(pr, site, workspaceRepo),
        );
        const next = data.next;
        // Handling pull requests from multiple remotes is not implemented. We stop when we see the first remote with PRs.
        if (prs.length > 0) {
            return { workspaceRepo, site, data: prs, next: next };
        }

        return { workspaceRepo, site, data: [], next: undefined };
    }

    async getListCreatedByMe(workspaceRepo: WorkspaceRepo): Promise<PaginatedPullRequests> {
        return this.getList(workspaceRepo, {
            q: `state="OPEN" and author.account_id="${workspaceRepo.mainSiteRemote.site!.details.userId}"`,
        });
    }

    async getListToReview(workspaceRepo: WorkspaceRepo): Promise<PaginatedPullRequests> {
        const accountID = workspaceRepo.mainSiteRemote.site!.details.userId;

        return this.getList(workspaceRepo, {
            q: `state="OPEN" and reviewers.account_id="${accountID}"`,
        }).then((allPRs) => {
            if (configuration.get<boolean>('bitbucket.explorer.showReviewedPullRequests')) {
                return allPRs;
            }

            allPRs.data = allPRs.data.filter((pr) => {
                for (const reviewer of pr.data.participants) {
                    if (reviewer.accountId === accountID && reviewer.status !== 'UNAPPROVED') {
                        return false;
                    }
                }
                return true;
            });

            return allPRs;
        });
    }

    async getListMerged(workspaceRepo: WorkspaceRepo): Promise<PaginatedPullRequests> {
        return this.getList(workspaceRepo, {
            q: 'state="MERGED"',
        });
    }

    async getListDeclined(workspaceRepo: WorkspaceRepo): Promise<PaginatedPullRequests> {
        return this.getList(workspaceRepo, {
            q: 'state="DECLINED"',
        });
    }

    async nextPage(paginatedPullRequests: PaginatedPullRequests): Promise<PaginatedPullRequests> {
        if (!paginatedPullRequests.next) {
            return { ...paginatedPullRequests, next: undefined };
        }
        const { data } = await this.client.get(paginatedPullRequests.next);

        const prs = data.values!.map((pr: any) =>
            CloudPullRequestApi.toPullRequestData(pr, paginatedPullRequests.site, paginatedPullRequests.workspaceRepo),
        );
        return { ...paginatedPullRequests, data: prs, next: data.next };
    }

    async getLatest(workspaceRepo: WorkspaceRepo): Promise<PaginatedPullRequests> {
        return this.getList(workspaceRepo, {
            pagelen: 2,
            sort: '-created_on',
            q: `state="OPEN" and reviewers.account_id="${workspaceRepo.mainSiteRemote.site!.details.userId}"`,
        });
    }

    async getRecentAllStatus(workspaceRepo: WorkspaceRepo): Promise<PaginatedPullRequests> {
        return this.getList(workspaceRepo, {
            sort: '-created_on',
            q: 'state="OPEN" OR state="MERGED" OR state="SUPERSEDED" OR state="DECLINED"',
        });
    }

    async get(site: BitbucketSite, prId: string, workspaceRepo?: WorkspaceRepo): Promise<PullRequest> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(`/repositories/${ownerSlug}/${repoSlug}/pullrequests/${prId}`);

        return CloudPullRequestApi.toPullRequestData(data, site, workspaceRepo);
    }

    async getById(site: BitbucketSite, prId: number): Promise<PullRequest> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(`/repositories/${ownerSlug}/${repoSlug}/pullrequests/${prId}`);

        return CloudPullRequestApi.toPullRequestData(data, site, undefined);
    }

    async getMergeStrategies(pr: PullRequest): Promise<MergeStrategy[]> {
        const { ownerSlug, repoSlug } = pr.site;

        const { data } = await this.client.get(`/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}`, {
            fields: 'destination.branch.merge_strategies,destination.branch.default_merge_strategy',
        });

        return data.destination.branch.merge_strategies.map((strategy: string) => ({
            label: mergeStrategyLabels[strategy],
            value: strategy,
            isDefault: strategy === data.destination.branch.default_merge_strategy,
        }));
    }

    async getChangedFiles(pr: PullRequest, spec?: string): Promise<FileDiff[]> {
        const { ownerSlug, repoSlug } = pr.site;

        const diffUrl = spec
            ? `/repositories/${ownerSlug}/${repoSlug}/diffstat/${spec}`
            : `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}/diffstat`;
        let { data } = await this.client.get(diffUrl);

        const conflictUrl = `https://api.bitbucket.org/internal/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}/conflicts`;
        let resp = await this.client.get(conflictUrl);
        const conflictData = resp.data;

        const prTypeUrl = `https://api.bitbucket.org/internal/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}`;
        resp = await this.client.get(prTypeUrl);
        const diffType = resp.data.diff_type;

        if (!data.values) {
            return [];
        }

        const accumulatedDiffStats = data.values as any[];
        while (data.next) {
            const nextPage = await this.client.get(data.next);
            data = nextPage.data;
            accumulatedDiffStats.push(...(data.values || []));
        }

        return accumulatedDiffStats.map((diffStat) => ({
            file: getFileNameFromPaths(diffStat.old?.path, diffStat.new?.path),
            linesAdded: diffStat.lines_added ? diffStat.lines_added : 0,
            linesRemoved: diffStat.lines_removed ? diffStat.lines_removed : 0,
            status: this.mapStatusWordsToFileStatus(diffStat.status!),
            oldPath: diffStat.old?.path,
            newPath: diffStat.new?.path,
            hunkMeta: {
                oldPathAdditions: [],
                oldPathDeletions: [],
                newPathAdditions: [],
                newPathDeletions: [],
                newPathContextMap: {},
            },
            isConflicted: this.isFileConflicted(diffType, diffStat, conflictData),
        }));
    }

    // Topic diffs no longer indicate a conflict in the status field so we have to check the results of the conflict endpoint.
    private isFileConflicted(diffType: string, diffStat: any, conflictData: any[]): boolean | undefined {
        const oldPath = diffStat.old?.path;
        const newPath = diffStat.new?.path;
        return diffType === 'TOPIC' && conflictData.some((c) => c.path === newPath ?? oldPath);
    }

    private mapStatusWordsToFileStatus(status: string): FileStatus {
        if (status === 'added') {
            return FileStatus.ADDED;
        } else if (status === 'removed') {
            return FileStatus.DELETED;
        } else if (status === 'modified') {
            return FileStatus.MODIFIED;
        } else if (status === 'renamed') {
            return FileStatus.RENAMED;
        } else if (status === 'merge conflict') {
            return FileStatus.CONFLICT;
        } else {
            return FileStatus.UNKNOWN;
        }
    }

    async getCommits(pr: PullRequest): Promise<Commit[]> {
        const { ownerSlug, repoSlug } = pr.site;

        let { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}/commits`,
            {
                pagelen: maxItemsSupported.commits,
            },
        );

        if (!data.values) {
            return [];
        }

        const accumulatedCommits = data.values as any[];
        while (data.next) {
            const nextPage = await this.client.get(data.next);
            data = nextPage.data;
            accumulatedCommits.push(...(data.values || []));
        }

        return accumulatedCommits.map((commit) => ({
            hash: commit.hash!,
            message: commit.message!,
            ts: commit.date!,
            url: commit.links!.html!.href!,
            htmlSummary: commit.summary ? commit.summary.html! : undefined,
            rawSummary: commit.summary ? commit.summary.raw! : undefined,
            author: CloudPullRequestApi.toUserModel(commit.author!.user!),
            parentHashes: commit.parents.map((parent: any) => parent.hash),
        }));
    }

    async deleteComment(site: BitbucketSite, prId: string, commentId: string, commitHash?: string): Promise<void> {
        const { ownerSlug, repoSlug } = site;

        const urlString = commitHash
            ? `/repositories/${ownerSlug}/${repoSlug}/commit/${commitHash}/comments/${commentId}`
            : `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${prId}/comments/${commentId}`;
        await this.client.delete(urlString, {});
    }

    async editComment(
        site: BitbucketSite,
        prId: string,
        content: string,
        commentId: string,
        commitHash?: string,
    ): Promise<Comment> {
        const { ownerSlug, repoSlug } = site;

        const urlString = commitHash
            ? `/repositories/${ownerSlug}/${repoSlug}/commit/${commitHash}/comments/${commentId}`
            : `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${prId}/comments/${commentId}`;
        const { data } = await this.client.put(urlString, {
            content: {
                raw: content,
            },
        });

        return this.convertDataToComment(data, site, commitHash);
    }

    async getTasks(pr: PullRequest): Promise<Task[]> {
        const { ownerSlug, repoSlug } = pr.site;

        try {
            let { data } = await this.client.get(
                `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}/tasks`,
            );

            if (!data.values) {
                return [];
            }

            const accumulatedTasks = data.values as any[];
            while (data.next) {
                const nextPage = await this.client.get(data.next);
                data = nextPage.data;
                accumulatedTasks.push(...(data.values || []));
            }

            return accumulatedTasks.map((task: any) => this.convertDataToTask(task, pr.site));
        } catch (e) {
            return [];
        }
    }

    async postTask(site: BitbucketSite, prId: string, content: string, commentId?: string): Promise<Task> {
        const { ownerSlug, repoSlug } = site;

        const commentData = commentId ? { comment: { id: commentId } } : {};
        try {
            const { data } = await this.client.post(
                `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${prId}/tasks/`,
                {
                    ...commentData,
                    completed: false,
                    content: {
                        raw: content,
                    },
                },
            );

            return this.convertDataToTask(data, site);
        } catch (e) {
            const error = new Error(`Error creating new task using API: ${e}`);
            Logger.error(error);
            throw error;
        }
    }

    async editTask(site: BitbucketSite, prId: string, task: Task): Promise<Task> {
        const { ownerSlug, repoSlug } = site;

        try {
            const { data } = await this.client.put(
                `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${prId}/tasks/${task.id}`,
                {
                    comment: {
                        comment: task.commentId,
                    },
                    completed: task.isComplete,
                    content: {
                        raw: task.content,
                    },
                    id: task.id,
                    state: task.isComplete ? 'RESOLVED' : 'UNRESOLVED',
                },
            );

            return this.convertDataToTask(data, site);
        } catch (e) {
            const error = new Error(`Error editing task using API: ${e}`);
            Logger.error(error);
            throw error;
        }
    }

    async deleteTask(site: BitbucketSite, prId: string, task: Task): Promise<void> {
        const { ownerSlug, repoSlug } = site;

        try {
            await this.client.delete(
                `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${prId}/tasks/${task.id}`,
                {},
            );
        } catch (e) {
            const error = new Error(`Error deleting task using API: ${e}`);
            Logger.error(error);
            throw error;
        }
    }

    convertDataToTask(taskData: any, site: BitbucketSite): Task {
        const taskBelongsToUser: boolean =
            taskData && taskData.creator && taskData.creator.account_id === site.details.userId;
        return {
            commentId: taskData.comment?.id,
            creator: CloudPullRequestApi.toUserModel(taskData.creator),
            created: taskData.created_on,
            updated: taskData.updated_on,
            isComplete: taskData.state !== 'UNRESOLVED',
            editable: taskBelongsToUser,
            deletable: taskBelongsToUser,
            id: taskData.id,
            content: taskData.content.raw,
        };
    }

    async getComments(pr: PullRequest, commitHash?: string): Promise<PaginatedComments> {
        const { ownerSlug, repoSlug } = pr.site;

        const urlString = commitHash
            ? `/repositories/${ownerSlug}/${repoSlug}/commit/${commitHash}/comments`
            : `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}/comments`;
        let { data } = await this.client.get(urlString, {
            pagelen: maxItemsSupported.comments,
        });

        if (!data.values) {
            return { data: [], next: undefined };
        }

        const accumulatedComments = data.values as any[];
        while (data.next) {
            const nextPage = await this.client.get(data.next);
            data = nextPage.data;
            accumulatedComments.push(...(data.values || []));
        }

        const comments = accumulatedComments.map((c) => {
            if (!c.deleted && c.content && c.content.raw && c.content.raw.trim().length > 0) {
                return c;
            }
            const label = vscode.l10n.t('Comment deleted');
            return {
                ...c,
                content: {
                    markup: 'markdown',
                    raw: `*${label}*`,
                    html: `<p><em>${label}</em></p>`,
                },
                deleted: true,
            } as any;
        });

        const convertedComments = await Promise.all(
            comments.map((commentData) => this.convertDataToComment(commentData, pr.site, commitHash)),
        );

        const nestedComments = this.toNestedList(convertedComments);
        const visibleComments = nestedComments.filter((comment) => this.shouldDisplayComment(comment));
        return {
            data: visibleComments,
            next: undefined,
        };
    }

    private shouldDisplayComment(comment: Comment): boolean {
        let hasUndeletedChild: boolean = false;
        let filteredChildren = [];
        for (let child of comment.children) {
            if (this.shouldDisplayComment(child)) {
                filteredChildren.push(child);
                hasUndeletedChild = true;
            }
        }
        comment.children = filteredChildren;
        return hasUndeletedChild || !comment.deleted || comment.tasks.some((task) => !task.isComplete);
    }

    private toNestedList(comments: Comment[]): Comment[] {
        const commentsTreeMap = new Map<string, Comment>();
        comments.forEach((c) => commentsTreeMap.set(c.id!, c));
        comments.forEach((c) => {
            const n = commentsTreeMap.get(c.id!);
            const pid = c.parentId;
            if (pid && commentsTreeMap.get(pid)) {
                commentsTreeMap.get(pid)!.children.push(n!);
            }
        });

        const result: Comment[] = [];
        commentsTreeMap.forEach((val) => {
            if (!val.parentId) {
                result.push(val);
            }
        });

        return result;
    }

    async getBuildStatuses(pr: PullRequest): Promise<BuildStatus[]> {
        const { ownerSlug, repoSlug } = pr.site;

        const { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}/statuses`,
            {
                pagelen: maxItemsSupported.buildStatuses,
            },
        );

        const statuses = data.values || [];
        return statuses
            .filter((status: any) => status.type === 'build')
            .map((status: any) => ({
                name: status.name!,
                state: status.state!,
                url: status.url!,
                ts: status.created_on!,
            }));
    }

    async getReviewers(site: BitbucketSite, query?: string, cancelToken?: CancelToken): Promise<User[]> {
        const { ownerSlug, repoSlug } = site;

        const cacheKey = `${ownerSlug}::${repoSlug}`;

        // fetch all members asynchronously first time and cache it
        this.queue.add(async () => {
            // ensure we don't do duplicate work if this function is called multiple times before cache is populated
            const cacheItem = this.teamMembersCache.getItem<User[]>(cacheKey);
            if (cacheItem !== undefined) {
                return;
            }

            const [teamMembers, recentPrParticipants] = await Promise.all([
                this.getTeamMembers(site),
                this.getRecentPullRequestsParticipants(site),
            ]);

            this.teamMembersCache.setItem(cacheKey, this.dedupUsers([...teamMembers, ...recentPrParticipants]));
        });

        if (query && query.length > 0) {
            const cacheItem = this.teamMembersCache.getItem<User[]>(cacheKey);
            if (cacheItem !== undefined && cacheItem.length > 0) {
                const matchingUsers = cacheItem
                    .filter((user) => user.displayName.toLowerCase().includes(query.toLowerCase()))
                    .slice(0, 20);
                if (matchingUsers.length > 0) {
                    return matchingUsers;
                }
            }

            // if no cache hit, fall back to calling API using nickname query param
            return this.getTeamMembers(site, query);
        }

        const cacheItem = this.defaultReviewersCache.getItem<User[]>(cacheKey);
        if (cacheItem !== undefined) {
            return cacheItem;
        }

        const { data } = await this.client.get(
            `/repositories/${ownerSlug}/${repoSlug}/default-reviewers`,
            {
                pagelen: maxItemsSupported.reviewers,
            },
            cancelToken,
        );

        const result = (data.values || []).map((reviewer: any) => CloudPullRequestApi.toUserModel(reviewer));
        this.defaultReviewersCache.setItem(cacheKey, result);

        return result;
    }

    private async getRecentPullRequestsParticipants(site: BitbucketSite): Promise<User[]> {
        const { ownerSlug, repoSlug } = site;
        const { data } = await this.client.get(`/repositories/${ownerSlug}/${repoSlug}/pullrequests`, {
            pagelen: 50,
            fields: 'values.participants',
            q: 'state="OPEN" OR state="MERGED" OR state="SUPERSEDED" OR state="DECLINED"',
        });

        const participants = data.values.flatMap((val: any) =>
            val.participants.map((p: any) => CloudPullRequestApi.toUserModel(p.user)),
        );

        return this.dedupUsers(participants);
    }

    private async getTeamMembers(site: BitbucketSite, query?: string): Promise<User[]> {
        const { ownerSlug } = site;

        if (query && query.length > 0) {
            // wrapping in try-catch as some users may not have permission to access to the API
            try {
                const { data } = await this.client.get(`/workspaces/${ownerSlug}/members`, {
                    q: `user.nickname="${query}"`,
                });

                return (data.values || []).map((reviewer: any) => CloudPullRequestApi.toUserModel(reviewer.user));
            } catch (e) {
                return [];
            }
        }

        try {
            let { data } = await this.client.get(`/workspaces/${ownerSlug}/members`, {
                pagelen: 100,
                fields: 'size,next,values.user.account_id,values.user.display_name,values.user.links.html.href,values.user.links.avatar.href',
            });
            const teamMembers = data.values || [];

            // DO NOT fetch data for very large teams
            if (data.size > TEAM_MEMBERS_CACHE_LIMIT) {
                return [];
            }

            while (data.next) {
                const nextPage = await this.client.get(data.next, undefined);
                data = nextPage.data;
                teamMembers.push(...(data.values || []));
            }

            return teamMembers.map((m: any) => CloudPullRequestApi.toUserModel(m.user));
        } catch (e) {
            return [];
        }
    }

    private dedupUsers(users: User[]): User[] {
        const userMap = new Map<string, User>();
        users.forEach((user: User) => {
            userMap.set(user.accountId, user);
        });

        return Array.from(userMap.values());
    }

    async create(
        site: BitbucketSite,
        workspaceRepo: WorkspaceRepo,
        createPrData: CreatePullRequestData,
    ): Promise<PullRequest> {
        let prBody = {
            type: 'pullrequest',
            title: createPrData.title,
            summary: {
                raw: createPrData.summary,
            },
            source: {
                repository: {
                    full_name: `${createPrData.sourceSite.ownerSlug}/${createPrData.sourceSite.repoSlug}`,
                },
                branch: {
                    name: createPrData.sourceBranchName,
                },
            },
            destination: {
                branch: {
                    name: createPrData.destinationBranchName,
                },
            },
            reviewers: createPrData.reviewerAccountIds.map((accountId) => ({
                type: 'user',
                account_id: accountId,
            })),
            close_source_branch: createPrData.closeSourceBranch,
        };

        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.post(`/repositories/${ownerSlug}/${repoSlug}/pullrequests`, prBody);

        return CloudPullRequestApi.toPullRequestData(data, site, workspaceRepo);
    }

    async update(pr: PullRequest, title: string, summary: string, reviewerAccountIds: string[]): Promise<PullRequest> {
        const { ownerSlug, repoSlug } = pr.site;

        let prBody = {
            title: title,
            summary: {
                raw: summary,
            },
            reviewers: reviewerAccountIds.map((accountId) => ({
                type: 'user',
                account_id: accountId,
            })),
        };

        const { data } = await this.client.put(
            `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}`,
            prBody,
        );
        return CloudPullRequestApi.toPullRequestData(data, pr.site, pr.workspaceRepo);
    }

    async updateApproval(pr: PullRequest, status: string): Promise<ApprovalStatus> {
        const { ownerSlug, repoSlug } = pr.site;
        const { data } =
            status === 'APPROVED'
                ? await this.client.post(
                      `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}/approve`,
                      {},
                  )
                : await this.client.delete(
                      `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}/approve`,
                      {},
                  );
        return data.approved ? 'APPROVED' : 'UNAPPROVED';
    }

    async merge(
        pr: PullRequest,
        closeSourceBranch?: boolean,
        mergeStrategy?: string,
        commitMessage?: string,
    ): Promise<PullRequest> {
        const { ownerSlug, repoSlug } = pr.site;

        let body = Object.create({});
        body = closeSourceBranch ? { ...body, close_source_branch: closeSourceBranch } : body;
        if (mergeStrategy !== undefined) {
            body = {
                ...body,
                merge_strategy: mergeStrategy,
                message: commitMessage,
            };
        }

        const { data } = await this.client.post(
            `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${pr.data.id}/merge`,
            body,
        );
        return CloudPullRequestApi.toPullRequestData(data, pr.site, pr.workspaceRepo);
    }

    async postComment(
        site: BitbucketSite,
        prId: string,
        text: string,
        parentCommentId: string,
        inline?: { from?: number; to?: number; path: string },
        commitHash?: string,
    ): Promise<Comment> {
        const { ownerSlug, repoSlug } = site;

        const urlString = commitHash
            ? `/repositories/${ownerSlug}/${repoSlug}/commit/${commitHash}/comments`
            : `/repositories/${ownerSlug}/${repoSlug}/pullrequests/${prId}/comments`;
        const { data } = await this.client.post(urlString, {
            parent: parentCommentId !== '' ? { id: parentCommentId } : undefined,
            content: {
                raw: text,
            },
            inline: inline,
        });

        return this.convertDataToComment(data, site, commitHash);
    }

    async getFileContent(site: BitbucketSite, commitHash: string, path: string): Promise<string> {
        const { ownerSlug, repoSlug } = site;

        const cacheKey = `${site.ownerSlug}::${site.repoSlug}::${commitHash}::${path}`;
        const cachedValue = this.fileContentCache.getItem<string>(cacheKey);
        if (cachedValue) {
            return cachedValue;
        }

        const { data } = await this.client.getRaw(`/repositories/${ownerSlug}/${repoSlug}/src/${commitHash}/${path}`);

        this.fileContentCache.setItem(cacheKey, data, 5 * Time.MINUTES);

        return data;
    }

    private convertDataToComment(data: any, site: BitbucketSite, commitHash?: string): Comment {
        const commentBelongsToUser: boolean = data && data.user && data.user.account_id === site.details.userId;

        return {
            id: data.id!,
            parentId: data.parent ? data.parent.id! : undefined,
            htmlContent: data.content!.html!,
            rawContent: data.content!.raw!,
            ts: data.created_on!,
            updatedTs: data.updated_on!,
            deleted: !!data.deleted,
            deletable: commentBelongsToUser && !data.deleted,
            editable: commentBelongsToUser && !data.deleted,
            inline: data.inline,
            user: data.user ? CloudPullRequestApi.toUserModel(data.user) : UnknownUser,
            children: [],
            tasks: [],
            commitHash: commitHash,
        };
    }

    static toPullRequestData(pr: any, site: BitbucketSite, workspaceRepo?: WorkspaceRepo): PullRequest {
        const source = CloudPullRequestApi.toPullRequestRepo(pr.source);
        const destination = CloudPullRequestApi.toPullRequestRepo(pr.destination);

        return {
            site: site,
            workspaceRepo: workspaceRepo,
            data: {
                siteDetails: site.details,
                id: pr.id!,
                version: -1,
                url: pr.links!.html!.href!,
                author: CloudPullRequestApi.toUserModel(pr.author),
                participants: (pr.participants || [])!.map((participant: any) => ({
                    ...CloudPullRequestApi.toUserModel(participant.user!),
                    role: participant.role!,
                    status: !!participant.approved ? 'APPROVED' : 'UNAPPROVED',
                })),
                source: source,
                destination: destination,
                title: pr.title!,
                htmlSummary: pr.summary ? pr.summary.html! : '',
                rawSummary: pr.summary ? pr.summary!.raw! : '',
                ts: pr.created_on!,
                updatedTs: pr.updated_on!,
                state: pr.state!,
                closeSourceBranch: !!pr.close_source_branch,
                taskCount: pr.task_count || 0,
            },
        };
    }

    static toPullRequestRepo(prRepo: any) {
        const repo = CloudRepositoriesApi.toRepo(prRepo.repository);
        const branchName = prRepo && prRepo.branch && prRepo.branch.name ? prRepo.branch.name : 'BRANCH_NOT_FOUND';
        const commitHash = prRepo && prRepo.commit && prRepo.commit.hash ? prRepo.commit.hash : 'COMMIT_HASH_NOT_FOUND';

        return {
            repo: repo,
            branchName: branchName,
            commitHash: commitHash,
        };
    }
}
