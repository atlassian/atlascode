import { CancelToken } from 'axios';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { configuration } from '../../config/configuration';
import { Container } from '../../container';
import { CacheMap } from '../../util/cachemap';
import { Time } from '../../util/time';
import { getFileNameFromPaths } from '../../views/pullrequest/diffViewHelper';
import { clientForSite } from '../bbUtils';
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
import { ServerRepositoriesApi } from './repositories';

export class ServerPullRequestApi implements PullRequestApi {
    private defaultReviewersCache: CacheMap = new CacheMap();
    private fileContentCache: CacheMap = new CacheMap();

    constructor(private client: HTTPClient) {}

    async getList(workspaceRepo: WorkspaceRepo, queryParams?: any): Promise<PaginatedPullRequests> {
        const site = workspaceRepo.mainSiteRemote.site;
        if (!site) {
            return { workspaceRepo, site: site!, data: [] };
        }
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(`/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests`, {
            markup: true,
            avatarSize: 64,
            ...queryParams,
        });
        const prs: PullRequest[] = data.values!.map((pr: any) =>
            ServerPullRequestApi.toPullRequestModel(pr, 0, site, workspaceRepo),
        );
        const next =
            data.isLastPage === true
                ? undefined
                : this.client.generateUrl(`/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests`, {
                      markup: true,
                      avatarSize: 64,
                      ...queryParams,
                      start: data.nextPageStart,
                  });
        // Handling pull requests from multiple remotes is not implemented. We stop when we see the first remote with PRs.
        if (prs.length > 0) {
            return { workspaceRepo, site, data: prs, next: next };
        }

        return { workspaceRepo, site, data: [], next: undefined };
    }

    //Just in case some older version of BBServer doesn't support the 'name' property, this defaults to userId (which is actually the user slug)
    //The reason for needing to fetch the current user and take the userName property is documented in the User model.
    private async userName(workspaceRepo: WorkspaceRepo) {
        const { userName } = await Container.bitbucketContext.currentUser(workspaceRepo.mainSiteRemote.site!);
        return userName ?? workspaceRepo.mainSiteRemote.site!.details.userId; //userName should always be defined, but this is a little added safety
    }

    async getListCreatedByMe(workspaceRepo: WorkspaceRepo): Promise<PaginatedPullRequests> {
        return this.getList(workspaceRepo, {
            'username.1': await this.userName(workspaceRepo),
            'role.1': 'AUTHOR',
        });
    }

    async getListToReview(workspaceRepo: WorkspaceRepo): Promise<PaginatedPullRequests> {
        const query: Record<string, any> = {
            'username.1': await this.userName(workspaceRepo),
            'role.1': 'REVIEWER',
        };
        if (!configuration.get<boolean>('bitbucket.explorer.showReviewedPullRequests')) {
            query['approved.1'] = false;
        }
        return this.getList(workspaceRepo, query);
    }

    async getListMerged(workspaceRepo: WorkspaceRepo): Promise<PaginatedPullRequests> {
        return this.getList(workspaceRepo, {
            state: 'MERGED',
        });
    }

    async getListDeclined(workspaceRepo: WorkspaceRepo): Promise<PaginatedPullRequests> {
        return this.getList(workspaceRepo, {
            state: 'DECLINED',
        });
    }

    async nextPage(paginatedPullRequests: PaginatedPullRequests): Promise<PaginatedPullRequests> {
        if (!paginatedPullRequests.next) {
            return { ...paginatedPullRequests, next: undefined };
        }
        const { data } = await this.client.get(paginatedPullRequests.next);

        const prs: PullRequest[] = data.values!.map((pr: any) =>
            ServerPullRequestApi.toPullRequestModel(
                pr,
                0,
                paginatedPullRequests.site,
                paginatedPullRequests.workspaceRepo,
            ),
        );
        return { ...paginatedPullRequests, data: prs, next: undefined };
    }

    async getLatest(workspaceRepo: WorkspaceRepo): Promise<PaginatedPullRequests> {
        return this.getList(workspaceRepo, {
            'username.1': await this.userName(workspaceRepo),
        });
    }

    async getRecentAllStatus(workspaceRepo: WorkspaceRepo): Promise<PaginatedPullRequests> {
        return this.getList(workspaceRepo, {
            state: 'ALL',
        });
    }

    async get(site: BitbucketSite, prId: string, workspaceRepo?: WorkspaceRepo): Promise<PullRequest> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests/${prId}`,
            {
                markup: true,
                avatarSize: 64,
            },
        );

        const taskCount = await this.getTaskCount(site, prId);
        return ServerPullRequestApi.toPullRequestModel(data, taskCount, site, workspaceRepo);
    }

    async getById(site: BitbucketSite, prId: number): Promise<PullRequest> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.get(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests/${prId}`,
            {
                markup: true,
                avatarSize: 64,
            },
        );

        return ServerPullRequestApi.toPullRequestModel(data, 0, site, undefined);
    }

    async getMergeStrategies(pr: PullRequest): Promise<MergeStrategy[]> {
        const { ownerSlug, repoSlug } = pr.site;

        const { data } = await this.client.get(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/settings/pull-requests`,
            {
                markup: true,
                avatarSize: 64,
            },
        );

        return data.mergeConfig.strategies.map((strategy: any) => ({
            label: strategy.name,
            value: strategy.id,
            isDefault: strategy.id === data.mergeConfig.defaultStrategy.id,
        }));
    }

    async getTasks(pr: PullRequest): Promise<Task[]> {
        try {
            return this.getTasks_v8(pr);
        } catch (error) {
            if (error.message && error.message['status-code'] === 404) {
                return this.getTasks_v0(pr);
            } else {
                throw error;
            }
        }
    }

    private async getTasks_v8(pr: PullRequest) {
        const { ownerSlug, repoSlug } = pr.site;
        let { data } = await this.client.get(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests/${pr.data.id}/blocker-comments`,
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

        return accumulatedTasks.map((task: any) => this.convertDataToTask_v8(task, pr.site));
    }

    private async getTasks_v0(pr: PullRequest) {
        const { ownerSlug, repoSlug } = pr.site;
        let { data } = await this.client.get(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests/${pr.data.id}/tasks`,
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
    }

    async postTask(site: BitbucketSite, prId: string, content: string, commentId?: string): Promise<Task> {
        try {
            return this.postTask_v8(site, prId, content, commentId);
        } catch (error) {
            if (error.message && error.message['status-code'] === 404) {
                // Retry with the legacy endpoint
                return this.postTask_v0(site, prId, content, commentId);
            } else {
                throw error;
            }
        }
    }

    private async postTask_v0(site: BitbucketSite, prId: string, content: string, commentId?: string) {
        const bbApi = await clientForSite(site);
        const repo = await bbApi.repositories.get(site);
        const { data } = await this.client.post(`/rest/api/latest/tasks`, {
            anchor: {
                id: commentId,
                type: 'COMMENT',
            },
            pendingSync: true,
            permittedOperations: {},
            pullRequestId: prId,
            repositoryId: repo.id,
            state: 'OPEN',
            text: content,
        });

        return this.convertDataToTask(data, site);
    }

    private async postTask_v8(site: BitbucketSite, prId: string, content: string, commentId?: string) {
        const bbApi = await clientForSite(site);
        const repo = await bbApi.repositories.get(site);
        const ownerSlug = site.ownerSlug;
        const data = await this.client.post(
            `/rest/api/latest/projects/${ownerSlug}/repos/${repo.name}/pull-requests/${prId}/comments`,
            {
                id: commentId,
                state: 'OPEN',
                version: 1,
                severity: 'BLOCKER',
                text: content,
                properties: {},
            },
        );
        return this.convertDataToTask_v8(data.data, site);
    }

    async editTask(site: BitbucketSite, prId: string, task: Task): Promise<Task> {
        try {
            return this.editTask_v8(site, prId, task);
        } catch (error) {
            if (error.message && error.message['status-code'] === 404) {
                return this.editTask_v0(site, prId, task);
            } else {
                throw error;
            }
        }
    }

    private async editTask_v8(site: BitbucketSite, pullRequestId: string, task: Task) {
        const projectKey = site.ownerSlug;
        const repositorySlug = site.repoSlug;
        const commentId = task.commentId;
        const { data } = await this.client.put(
            `/rest/api/1.0/projects/${projectKey}/repos/${repositorySlug}/pull-requests/${pullRequestId}/comments/${commentId}`,
            {
                id: task.id,
                state: task.isComplete ? 'RESOLVED' : 'OPEN',
                version: task.version,
                severity: 'BLOCKER',
                text: task.content,
                properties: {},
            },
        );

        return this.convertDataToTask_v8(data, site);
    }

    private async editTask_v0(site: BitbucketSite, prId: string, task: Task) {
        const { data } = await this.client.put(`/rest/api/1.0/tasks/${task.id}`, {
            id: task.id,
            text: task.content,
            state: task.isComplete ? 'RESOLVED' : 'OPEN',
        });

        return this.convertDataToTask(data, site);
    }

    async deleteTask(site: BitbucketSite, prId: string, task: Task): Promise<void> {
        try {
            return this.deleteTask_v8(site, prId, task);
        } catch (error) {
            if (error.message && error.message['status-code'] === 404) {
                return this.deleteTask_v0(site, prId, task);
            } else {
                throw error;
            }
        }
    }

    private async deleteTask_v8(site: BitbucketSite, pullRequestId: string, task: Task) {
        const projectKey = site.ownerSlug;
        const repositorySlug = site.repoSlug;
        const commentId = task.commentId;

        await this.client.delete(
            `/rest/api/1.0/projects/${projectKey}/repos/${repositorySlug}/pull-requests/${pullRequestId}/comments/${commentId}`,
            {},
            { version: task.version },
        );
    }

    private async deleteTask_v0(site: BitbucketSite, prId: string, task: Task) {
        await this.client.delete(`/rest/api/1.0/tasks/${task.id}`, {});
    }

    convertDataToTask_v8(taskData: any, site: BitbucketSite): Task {
        const user = taskData.author ? ServerPullRequestApi.toUser(site.details, taskData.author) : UnknownUser;
        const taskBelongsToUser: boolean = user.accountId === site.details.userId;
        return {
            commentId: taskData.id,
            creator: ServerPullRequestApi.toUser(site.details, taskData.author),
            created: taskData.createdDate,
            updated: taskData.updatedDate,
            isComplete: taskData.state !== 'OPEN',
            editable: taskBelongsToUser && taskData.permittedOperations.editable,
            deletable: taskBelongsToUser && taskData.permittedOperations.deletable,
            id: taskData.id,
            content: taskData.text,
            version: taskData.version,
        };
    }

    convertDataToTask(taskData: any, site: BitbucketSite): Task {
        const user = taskData.author ? ServerPullRequestApi.toUser(site.details, taskData.author) : UnknownUser;
        const taskBelongsToUser: boolean = user.accountId === site.details.userId;
        return {
            commentId: taskData.anchor.id,
            creator: ServerPullRequestApi.toUser(site.details, taskData.author),
            created: taskData.createdDate,
            updated: taskData.createdDate, //This field doesn't exist in the BBServer API response
            isComplete: taskData.state !== 'OPEN',
            editable: taskBelongsToUser && taskData.permittedOperations.editable,
            deletable: taskBelongsToUser && taskData.permittedOperations.deletable,
            id: taskData.id,
            content: taskData.text,
        };
    }

    async getChangedFiles(pr: PullRequest): Promise<FileDiff[]> {
        const { ownerSlug, repoSlug } = pr.site;

        let { data } = await this.client.get(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests/${pr.data.id}/diff`,
            {
                markup: true,
                avatarSize: 64,
            },
        );

        if (!data.diffs) {
            return [];
        }

        const accumulatedDiffStats = data.diffs as any[];
        while (data.isLastPage === false) {
            const nextPage = await this.client.get(
                this.client.generateUrl(
                    `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests/${pr.data.id}/diff`,
                    {
                        markup: true,
                        avatarSize: 64,
                        start: data.nextPageStart,
                    },
                ),
            );
            data = nextPage.data;
            accumulatedDiffStats.push(...(data.diffs || []));
        }

        const result: FileDiff[] = accumulatedDiffStats.map((diffStat) => {
            let status: FileStatus = FileStatus.MODIFIED;
            if (!diffStat.source) {
                status = FileStatus.ADDED;
            } else if (!diffStat.destination) {
                status = FileStatus.DELETED;
            } else if (diffStat.source.toString !== diffStat.destination.toString) {
                status = FileStatus.RENAMED;
            }

            const sourceAdditions = new Set<number>();
            const sourceDeletions = new Set<number>();
            const destinationAdditions = new Set<number>();
            const destinationDeletions = new Set<number>();
            const contextMap: { [k: number]: number } = {};

            if (Array.isArray(diffStat.hunks)) {
                diffStat.hunks.forEach((hunk: any) => {
                    if (Array.isArray(hunk.segments)) {
                        hunk.segments.forEach((segment: any) => {
                            if (Array.isArray(segment.lines)) {
                                segment.lines.forEach((line: any) => {
                                    if (segment.type === 'REMOVED') {
                                        if (hunk.sourceSpan > 0) {
                                            sourceDeletions.add(line.source);
                                        }
                                        if (hunk.destinationSpan > 0) {
                                            destinationDeletions.add(line.destination);
                                        }
                                    } else if (segment.type === 'ADDED') {
                                        if (hunk.sourceSpan > 0) {
                                            sourceAdditions.add(line.source);
                                        }
                                        if (hunk.destinationSpan > 0) {
                                            destinationAdditions.add(line.destination);
                                        }
                                    } else if (segment.type === 'CONTEXT') {
                                        contextMap[line.destination] = line.source;
                                    }
                                });
                            }
                        });
                    }
                });
            }

            Object.entries(contextMap).forEach(([key, val]) => {
                const destKey = parseInt(key);
                destinationAdditions.delete(destKey);
                destinationDeletions.delete(destKey);

                sourceAdditions.delete(val);
                sourceDeletions.delete(val);
            });

            return {
                file: getFileNameFromPaths(diffStat.source?.toString, diffStat.destination?.toString),
                status: status,
                linesAdded: sourceAdditions.size + destinationAdditions.size,
                linesRemoved: sourceDeletions.size + destinationDeletions.size,
                oldPath: diffStat.source?.toString,
                newPath: diffStat.destination?.toString,
                hunkMeta: {
                    oldPathAdditions: Array.from(sourceAdditions),
                    oldPathDeletions: Array.from(sourceDeletions),
                    newPathAdditions: Array.from(destinationAdditions),
                    newPathDeletions: Array.from(destinationDeletions),
                    newPathContextMap: contextMap,
                },
            };
        });

        return result;
    }
    /**
     *
     * @param pr The Pull request for which conflict data is to be calculated
     * @returns [''] -> Empty String Array
     * We don't seem to have the concept of conflicted Files in Server from the getChangedFiles method above
     * but this has been implemented here because Server extends the common interface PullRequestApi which has this method
     */
    async getConflictedFiles(pr: PullRequest): Promise<string[]> {
        return [];
    }

    async getCurrentUser(site: DetailedSiteInfo): Promise<User> {
        const userSlug = site.userId;
        const { data } = await this.client.get(`/rest/api/1.0/users/${userSlug}`, {
            markup: true,
            avatarSize: 64,
        });

        return ServerPullRequestApi.toUser(site, data);
    }

    async getCommits(pr: PullRequest): Promise<Commit[]> {
        const { ownerSlug, repoSlug } = pr.site;

        let { data } = await this.client.get(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests/${pr.data.id}/commits`,
            {
                markup: true,
                avatarSize: 64,
            },
        );

        if (!data.values) {
            return [];
        }

        const accumulatedCommits = data.values as any[];
        while (data.isLastPage === false) {
            const nextPage = await this.client.get(
                this.client.generateUrl(
                    `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests/${pr.data.id}/commits`,
                    {
                        markup: true,
                        avatarSize: 64,
                        start: data.nextPageStart,
                    },
                ),
            );
            data = nextPage.data;
            accumulatedCommits.push(...(data.values || []));
        }

        return accumulatedCommits.map((commit: any) => ({
            author: ServerPullRequestApi.toUser(pr.site.details, commit.author),
            ts: commit.authorTimestamp,
            hash: commit.id,
            message: commit.message,
            url: '',
            htmlSummary: '',
            rawSummary: '',
        }));
    }

    async deleteComment(site: BitbucketSite, prId: string, commentId: string): Promise<void> {
        const { ownerSlug, repoSlug } = site;
        /*
        The Bitbucket Server API can not delete a comment unless the comment's version is provided as a query parameter.
        In order to get the comment's version, a call must be made to the Bitbucket Server API.
        */
        const { data } = await this.client.get(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests/${prId}/comments/${commentId}`,
        );

        await this.client.delete(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests/${prId}/comments/${commentId}`,
            {},
            { version: data.version },
        );
    }

    async editComment(site: BitbucketSite, prId: string, content: string, commentId: string): Promise<Comment> {
        const { ownerSlug, repoSlug } = site;
        /*
        The Bitbucket Server API can not edit a comment unless the comment's version is provided as a query parameter.
        In order to get the comment's version, a call must be made to the Bitbucket Server API.
        */
        const { data } = await this.client.get(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests/${prId}/comments/${commentId}`,
        );

        const res = await this.client.put(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests/${prId}/comments/${commentId}`,
            {
                text: content,
                version: data.version,
            },
            {
                markup: true,
                avatarSize: 64,
            },
        );
        return this.convertDataToComment(site, res.data);
    }

    async getComments(pr: PullRequest): Promise<PaginatedComments> {
        const { ownerSlug, repoSlug } = pr.site;
        let { data } = await this.client.get(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests/${pr.data.id}/activities`,
            {
                markup: true,
                avatarSize: 64,
            },
        );

        if (!data.values) {
            return { data: [], next: undefined };
        }

        const accumulatedActivities = data.values as any[];
        while (data.isLastPage === false) {
            const nextPage = await this.client.get(
                this.client.generateUrl(
                    `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests/${pr.data.id}/activities`,
                    {
                        markup: true,
                        avatarSize: 64,
                        start: data.nextPageStart,
                    },
                ),
            );
            data = nextPage.data;
            accumulatedActivities.push(...(data.values || []));
        }

        const activities = accumulatedActivities
            .filter((activity) => activity.action === 'COMMENTED')
            .filter((activity) =>
                activity.commentAnchor
                    ? activity.commentAnchor.diffType === 'EFFECTIVE' && activity.commentAnchor.orphaned === false
                    : true,
            );

        return {
            data: (
                await Promise.all(
                    activities.map((activity) =>
                        this.toNestedCommentModel(pr.site, activity.comment, activity.commentAnchor),
                    ),
                )
            )
                .filter((comment) => this.shouldDisplayComment(comment))
                .sort((a, b) => {
                    //Comment threads are not retrieved from the API by posting order, so that must be restored to display them properly

                    try {
                        if (a.ts < b.ts) {
                            return -1;
                        } else if (a.ts === b.ts) {
                            return 0;
                        } else {
                            return 1;
                        }
                    } catch {
                        return a.ts!! ? 1 : -1;
                    }
                }),
            next: undefined,
        };
    }

    private shouldDisplayComment(comment: Comment): boolean {
        let hasUndeletedChild: boolean = false;
        const filteredChildren = [];
        for (const child of comment.children) {
            if (this.shouldDisplayComment(child)) {
                filteredChildren.push(child);
                hasUndeletedChild = true;
                comment.deletable = false;
            }
        }
        comment.children = filteredChildren;
        return hasUndeletedChild || !comment.deleted || comment.tasks.some((task) => !task.isComplete);
    }

    private async toNestedCommentModel(site: BitbucketSite, comment: any, commentAnchor: any): Promise<Comment> {
        const commentModel: Comment = await this.convertDataToComment(site, comment, commentAnchor);
        commentModel.children = await Promise.all(
            (comment.comments || []).map((c: any) => this.toNestedCommentModel(site, c, commentAnchor)),
        );
        return commentModel;
    }

    private async convertDataToComment(site: BitbucketSite, data: any, commentAnchor?: any): Promise<Comment> {
        const user = data.author ? ServerPullRequestApi.toUser(site.details, data.author) : UnknownUser;
        const commentBelongsToUser: boolean = user.accountId === site.details.userId;
        return {
            id: data.id,
            parentId: data.parentId,
            htmlContent: data.html ? data.html : data.text,
            rawContent: data.text,
            ts: data.createdDate,
            updatedTs: data.updatedDate,
            deleted: !!data.deleted,
            deletable: data.permittedOperations.deletable && commentBelongsToUser && !data.deleted,
            editable: data.permittedOperations.editable && commentBelongsToUser && !data.deleted,
            inline: commentAnchor
                ? {
                      path: commentAnchor.path,
                      from: commentAnchor.fileType === 'TO' ? undefined : commentAnchor.line,
                      to: commentAnchor.fileType === 'TO' ? commentAnchor.line : undefined,
                  }
                : undefined,
            user: user,
            children: [],
            tasks: [],
        };
    }

    async getBuildStatuses(pr: PullRequest): Promise<BuildStatus[]> {
        const { data } = await this.client.get(`/rest/build-status/1.0/commits/${pr.data.source.commitHash}`, {
            markup: true,
            avatarSize: 64,
        });

        return (data.values || []).map((val: any) => ({
            name: val.name,
            state: val.state,
            url: val.url,
            ts: val.dateAdded,
        }));
    }

    async getReviewers(site: BitbucketSite, query?: string, cancelToken?: CancelToken): Promise<User[]> {
        const { ownerSlug, repoSlug } = site;

        if (query && query.length > 0) {
            const { data } = await this.client.get(
                `/rest/api/1.0/users`,
                {
                    markup: true,
                    avatarSize: 64,
                    'permission.1': 'REPO_READ',
                    'permission.1.projectKey': ownerSlug,
                    'permission.1.repositorySlug': repoSlug,
                    filter: query,
                    limit: 10,
                },
                cancelToken,
            );

            return (data.values || []).map((val: any) => ServerPullRequestApi.toUser(site.details, val));
        }

        const cacheKey = `${ownerSlug}::${repoSlug}`;
        const cacheItem = this.defaultReviewersCache.getItem<User[]>(cacheKey);
        if (cacheItem !== undefined) {
            return cacheItem;
        }

        const bbApi = await clientForSite(site);
        const repo = await bbApi.repositories.get(site);

        const { data } = await this.client.get(
            `/rest/default-reviewers/1.0/projects/${ownerSlug}/repos/${repoSlug}/reviewers`,
            {
                markup: true,
                avatarSize: 64,
                sourceRepoId: Number(repo.id),
                targetRepoId: Number(repo.id),
                sourceRefId: repo.mainbranch!,
                targetRefId: repo.mainbranch!,
            },
            cancelToken,
        );

        const result = (Array.isArray(data) ? data : []).map((val: any) =>
            ServerPullRequestApi.toUser(site.details, val),
        );
        this.defaultReviewersCache.setItem(cacheKey, result);

        return result;
    }

    async create(
        site: BitbucketSite,
        workspaceRepo: WorkspaceRepo,
        createPrData: CreatePullRequestData,
    ): Promise<PullRequest> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.post(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests`,
            {
                title: createPrData.title,
                description: createPrData.summary,
                fromRef: {
                    id: createPrData.sourceBranchName,
                    repository: {
                        slug: createPrData.sourceSite.repoSlug,
                        project: {
                            key: createPrData.sourceSite.ownerSlug,
                        },
                    },
                },
                toRef: {
                    id: createPrData.destinationBranchName,
                },
                reviewers: createPrData.reviewerAccountIds.map((accountId) => ({
                    user: {
                        name: accountId,
                    },
                })),
            },
            {
                markup: true,
                avatarSize: 64,
            },
        );

        return ServerPullRequestApi.toPullRequestModel(data, 0, site, workspaceRepo);
    }

    async update(pr: PullRequest, title: string, summary: string, reviewerAccountIds: string[]): Promise<PullRequest> {
        const { ownerSlug, repoSlug } = pr.site;

        const prBody = {
            version: pr.data.version,
            title: title,
            description: summary,
            reviewers: reviewerAccountIds.map((accountId) => ({
                user: {
                    name: accountId,
                },
            })),
        };

        const { data } = await this.client.put(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests/${pr.data.id}`,
            prBody,
            {
                markup: true,
                avatarSize: 64,
            },
        );

        return ServerPullRequestApi.toPullRequestModel(data, 0, pr.site, pr.workspaceRepo);
    }

    async updateApproval(pr: PullRequest, status: string): Promise<ApprovalStatus> {
        const { ownerSlug, repoSlug } = pr.site;

        const userSlug = pr.site.details.userId;

        // The API uses different status values than the model
        // CHANGES_REQUESTED -> NEEDS_WORK
        const { data } = await this.client.put(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests/${pr.data.id}/participants/${userSlug}`,
            {
                status:
                    status === 'CHANGES_REQUESTED'
                        ? 'NEEDS_WORK'
                        : status === 'NO_CHANGES_REQUESTED'
                          ? 'UNAPPROVED'
                          : status,
            },
        );

        // The API returns the new status of the user,So this api call will return NEEDS_WORK
        // which is the status stored as CHANGES_REQUESTED in the model
        if (data.status === 'NEEDS_WORK') {
            return 'CHANGES_REQUESTED';
        }
        return data.status;
    }

    async merge(
        pr: PullRequest,
        closeSourceBranch?: boolean,
        mergeStrategy?: string,
        commitMessage?: string,
    ): Promise<PullRequest> {
        const { ownerSlug, repoSlug } = pr.site;

        const body =
            mergeStrategy === undefined
                ? {}
                : { autoSubject: false, strategyId: mergeStrategy, message: commitMessage };

        const { data } = await this.client.post(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests/${pr.data.id}/merge`,
            body,
            {
                version: pr.data.version,
                markup: true,
                avatarSize: 64,
            },
        );

        const taskCount = await this.getTaskCount(pr.site, pr.data.id);
        return ServerPullRequestApi.toPullRequestModel(data, taskCount, pr.site, pr.workspaceRepo);
    }

    async postComment(
        site: BitbucketSite,
        prId: string,
        text: string,
        parentCommentId: string,
        inline?: { from?: number; to?: number; path: string },
        commentHash?: string,
        lineMeta?: 'ADDED' | 'REMOVED',
    ): Promise<Comment> {
        const { ownerSlug, repoSlug } = site;

        const { data } = await this.client.post(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests/${prId}/comments`,
            {
                parent: parentCommentId !== '' ? { id: parentCommentId } : undefined,
                text: text,
                anchor: inline
                    ? {
                          line: inline!.to || inline!.from,
                          lineType: lineMeta || 'CONTEXT',
                          fileType: inline!.to ? 'TO' : 'FROM',
                          path: inline!.path,
                      }
                    : undefined,
            },
            {
                markup: true,
                avatarSize: 64,
            },
        );
        return this.convertDataToComment(site, data);
    }

    async getFileContent(site: BitbucketSite, commitHash: string, path: string): Promise<string> {
        const { ownerSlug, repoSlug } = site;

        const cacheKey = `${site.ownerSlug}::${site.repoSlug}::${commitHash}::${path}`;
        const cachedValue = this.fileContentCache.getItem<string>(cacheKey);
        if (cachedValue) {
            return cachedValue;
        }

        const { data } = await this.client.getRaw(`/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/raw/${path}`, {
            at: commitHash,
        });

        this.fileContentCache.setItem(cacheKey, data, 5 * Time.MINUTES);

        return data;
    }

    private async getTaskCount(site: BitbucketSite, prId: string): Promise<number> {
        try {
            return this.getTaskCount_v8(site, prId);
        } catch (error) {
            if (error.message && error.message['status-code'] === 404) {
                // Retry with the legacy endpoint
                return this.getTaskCount_v0(site, prId);
            } else {
                throw error;
            }
        }
    }

    private async getTaskCount_v0(site: BitbucketSite, prId: string): Promise<number> {
        const { ownerSlug, repoSlug } = site;
        const { data } = await this.client.get(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests/${prId}/tasks/count`,
        );

        return data;
    }

    private getTaskCount_v8(site: BitbucketSite, prId: string): number | PromiseLike<number> {
        const { ownerSlug, repoSlug } = site;
        return this.client.get(
            `/rest/api/1.0/projects/${ownerSlug}/repos/${repoSlug}/pull-requests/${prId}/blocker-comments?count=true`,
        );
    }

    static toUser(site: DetailedSiteInfo, input: any): User {
        return {
            accountId: input.slug!,
            displayName: input.displayName!,
            emailAddress: input.emailAddress,
            //Try to get the name property, but if it doesn't exist for some reason, slug should work identically in 90% of cases
            //the reason for this is documented in the User model definition.
            userName: input.name ?? input.slug!,
            url: input.links && input.links.self ? input.links.self[0].href : undefined,
            avatarUrl: ServerPullRequestApi.patchAvatarUrl(site.baseLinkUrl, input.avatarUrl),
            mention: `@${input.slug}`,
        };
    }

    static toPullRequestModel(
        data: any,
        taskCount: number,
        site: BitbucketSite,
        workspaceRepo?: WorkspaceRepo,
    ): PullRequest {
        const source = ServerPullRequestApi.toPullRequestRepo(site, data.fromRef, undefined!);
        const destination = ServerPullRequestApi.toPullRequestRepo(site, data.toRef, undefined!);

        return {
            site: site,
            workspaceRepo: workspaceRepo,
            data: {
                siteDetails: site.details,
                id: data.id,
                version: data.version,
                url: data.links.self[0].href,
                author: this.toUser(site.details, data.author.user),
                participants: data.reviewers.map((reviewer: any) => ({
                    ...this.toUser(site.details, reviewer.user),
                    role: reviewer.role,
                    status: reviewer.status === 'NEEDS_WORK' ? 'CHANGES_REQUESTED' : reviewer.status,
                })),
                source: source,
                destination: destination,
                title: data.title,
                htmlSummary: data.descriptionAsHtml ? data.descriptionAsHtml : '',
                rawSummary: data.description ? data.description : '',
                ts: data.createdDate,
                updatedTs: data.updatedDate,
                state: data.state,
                closeSourceBranch: false,
                taskCount: taskCount,
                buildStatuses: [],
                draft: data.draft,
            },
        };
    }

    static patchAvatarUrl(baseUrl: string, avatarUrl: string): string {
        if (avatarUrl && !/^http/.test(avatarUrl)) {
            return `${baseUrl}${avatarUrl}`;
        }
        return avatarUrl;
    }

    static toPullRequestRepo(site: BitbucketSite, prRepo: any, defaultBranch: string) {
        const repo = ServerRepositoriesApi.toRepo(site, prRepo.repository, defaultBranch);
        const branchName = prRepo && prRepo.displayId ? prRepo.displayId : 'BRANCH_NOT_FOUND';
        const commitHash = prRepo && prRepo.latestCommit ? prRepo.latestCommit : 'COMMIT_HASH_NOT_FOUND';

        return {
            repo: repo,
            branchName: branchName,
            commitHash: commitHash,
        };
    }
}
