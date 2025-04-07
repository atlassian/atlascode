import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';

import { DetailedSiteInfo } from '../../../../atlclients/authInfo';
import {
    ApprovalStatus,
    BitbucketIssue,
    BitbucketSite,
    BuildStatus,
    Comment,
    Commit,
    FileDiff,
    MergeStrategy,
    PullRequest,
    Reviewer,
    Task,
    User,
} from '../../../../bitbucket/model';

export interface PullRequestDetailsActionApi {
    fetchUsers(site: BitbucketSite, query: string, abortKey?: string): Promise<User[]>;
    updateSummary(pr: PullRequest, text: string): Promise<PullRequest>;
    updateTitle(pr: PullRequest, text: string): Promise<PullRequest>;
    getCurrentUser(pr: PullRequest): Promise<User>;
    getPR(pr: PullRequest): Promise<PullRequest>;
    updateCommits(pr: PullRequest): Promise<Commit[]>;
    updateReviewers(pr: PullRequest, newReviewers: User[]): Promise<Reviewer[]>;
    updateApprovalStatus(pr: PullRequest, status: ApprovalStatus): Promise<ApprovalStatus>;
    checkout(pr: PullRequest): Promise<string>;
    getCurrentBranchName(pr: PullRequest): string;
    getComments(pr: PullRequest): Promise<Comment[]>;
    postComment(comments: Comment[], pr: PullRequest, rawText: string, parentId?: string): Promise<Comment[]>;
    editComment(comments: Comment[], pr: PullRequest, content: string, commentId: string): Promise<Comment[]>;
    deleteComment(pr: PullRequest, comment: Comment): Promise<Comment[]>;
    getFileDiffs(pr: PullRequest, inlineComments: Comment[]): Promise<FileDiff[]>;
    getConflictedFiles(pr: PullRequest): Promise<string[]>;
    openDiffViewForFile(pr: PullRequest, fileDiff: FileDiff, comments: Comment[]): Promise<void>;
    updateBuildStatuses(pr: PullRequest): Promise<BuildStatus[]>;
    updateMergeStrategies(pr: PullRequest): Promise<MergeStrategy[]>;
    fetchRelatedJiraIssues(
        pr: PullRequest,
        commits: Commit[],
        comments: Comment[],
    ): Promise<MinimalIssue<DetailedSiteInfo>[]>;
    fetchRelatedBitbucketIssues(pr: PullRequest, commits: Commit[], comments: Comment[]): Promise<BitbucketIssue[]>;
    merge(
        pr: PullRequest,
        mergeStrategy: MergeStrategy,
        commitMessage: string,
        closeSourceBranch: boolean,
        issues: (MinimalIssue<DetailedSiteInfo> | BitbucketIssue)[],
    ): Promise<PullRequest>;
    openJiraIssue(issue: MinimalIssue<DetailedSiteInfo>): Promise<void>;
    openBitbucketIssue(issue: BitbucketIssue): Promise<void>;

    openBuildStatus(pr: PullRequest, status: BuildStatus): Promise<void>;
    getTasks(
        pr: PullRequest,
        pageComments: Comment[],
        inlineComments: Comment[],
    ): Promise<{ tasks: Task[]; pageComments: Comment[]; inlineComments: Comment[] }>;

    createTask(
        tasks: Task[],
        comments: Comment[],
        pr: PullRequest,
        content: string,
        commentId?: string,
    ): Promise<{ tasks: Task[]; comments: Comment[] }>;

    editTask(
        tasks: Task[],
        comments: Comment[],
        pr: PullRequest,
        task: Task,
    ): Promise<{ tasks: Task[]; comments: Comment[] }>;
    deleteTask(pr: PullRequest, task: Task): Promise<{ tasks: Task[]; comments: Comment[] }>;
}
