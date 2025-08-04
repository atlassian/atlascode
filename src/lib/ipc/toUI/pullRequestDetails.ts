import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';

import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import {
    ApprovalStatus,
    BuildStatus,
    Comment,
    Commit,
    emptyPullRequest,
    emptyUser,
    FileDiff,
    MergeStrategy,
    PullRequest,
    Reviewer,
    Task,
    User,
} from '../../../bitbucket/model';

export enum PullRequestDetailsMessageType {
    Init = 'init',
    FetchUsersResponse = 'fetchUsersResponse',
    PostCommentResponse = 'postCommentResponse',
    EditCommentResponse = 'editCommentResponse',
    DeleteCommentResponse = 'deleteCommentResponse',
    AddTaskResponse = 'addTaskResponse',
    EditTaskResponse = 'editTaskResponse',
    DeleteTaskResponse = 'deleteTaskResponse',
    UpdateReviewersResponse = 'updateReviewersResponse',
    UpdateSummary = 'updateSummary',
    UpdateTitle = 'updateTitle',
    UpdateCommits = 'updateCommits',
    UpdateReviewers = 'updateReviewers',
    UpdateApprovalStatus = 'updateApprovalStatus',
    CheckoutBranch = 'checkoutBranch',
    UpdateComments = 'updateComments',
    UpdateFileDiffs = 'updateFileDiffs',
    UpdateBuildStatuses = 'updateBuildStatuses',
    UpdateMergeStrategies = 'updateMergeStrategies',
    UpdateRelatedJiraIssues = 'updateRelatedJiraIssues',
    UpdateTasks = 'updateTasks',
    UpdateConflictedFiles = 'updateConflictedFiles',
}

export type PullRequestDetailsMessage =
    | ReducerAction<PullRequestDetailsMessageType.Init, PullRequestDetailsInitMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateSummary, PullRequestDetailsSummaryMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateTitle, PullRequestDetailsTitleMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateCommits, PullRequestDetailsCommitsMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateReviewers, PullRequestDetailsReviewersMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateApprovalStatus, PullRequestDetailsApprovalMessage>
    | ReducerAction<PullRequestDetailsMessageType.CheckoutBranch, PullRequestDetailsCheckoutBranchMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateComments, PullRequestDetailsCommentsMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateFileDiffs, PullRequestDetailsFileDiffsMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateConflictedFiles, PullRequestDetailsConflictedFilesMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateBuildStatuses, PullRequestDetailsBuildStatusesMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateMergeStrategies, PullRequestDetailsMergeStrategiesMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateRelatedJiraIssues, PullRequestDetailsRelatedJiraIssuesMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateTasks, PullRequestDetailsTasksMessage>;
export type PullRequestDetailsResponse =
    | ReducerAction<PullRequestDetailsMessageType.CheckoutBranch, PullRequestDetailsCheckoutBranchMessage>
    | ReducerAction<PullRequestDetailsMessageType.FetchUsersResponse, FetchUsersResponseMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateFileDiffs, PullRequestDetailsFileDiffsMessage>
    | ReducerAction<PullRequestDetailsMessageType.PostCommentResponse, VoidResponseMessage>
    | ReducerAction<PullRequestDetailsMessageType.EditCommentResponse, VoidResponseMessage>
    | ReducerAction<PullRequestDetailsMessageType.DeleteCommentResponse, VoidResponseMessage>
    | ReducerAction<PullRequestDetailsMessageType.AddTaskResponse, VoidResponseMessage>
    | ReducerAction<PullRequestDetailsMessageType.EditTaskResponse, VoidResponseMessage>
    | ReducerAction<PullRequestDetailsMessageType.DeleteTaskResponse, VoidResponseMessage>
    | ReducerAction<PullRequestDetailsMessageType.UpdateReviewersResponse, VoidResponseMessage>;

export interface PullRequestDetailsInitMessage {
    pr: PullRequest;
    commits: Commit[];
    currentUser: User;
    currentBranchName: string;
    comments: Comment[];
    tasks: Task[];
    fileDiffs: FileDiff[];
    conflictedFiles: string[];
    mergeStrategies: MergeStrategy[];
    buildStatuses: BuildStatus[];
    relatedJiraIssues: MinimalIssue<DetailedSiteInfo>[];
    loadState: {
        basicData: boolean;
        comments: boolean;
        commits: boolean;
        tasks: boolean;
        relatedJiraIssues: boolean;
        diffs: boolean;
        mergeStrategies: boolean;
        buildStatuses: boolean;
    };
}

export interface FetchUsersResponseMessage {
    users: User[];
}

export interface VoidResponseMessage {}

export interface PullRequestDetailsSummaryMessage {
    htmlSummary: string;
    rawSummary: string;
}

export interface PullRequestDetailsTitleMessage {
    title: string;
}

export interface PullRequestDetailsCommitsMessage {
    commits: Commit[];
}

export interface PullRequestDetailsReviewersMessage {
    reviewers: Reviewer[];
}

export interface PullRequestDetailsApprovalMessage {
    status: ApprovalStatus;
}

export interface PullRequestDetailsCheckoutBranchMessage {
    branchName: string;
}

export interface PullRequestDetailsCommentsMessage {
    comments: Comment[];
}

export interface PullRequestDetailsFileDiffsMessage {
    fileDiffs: FileDiff[];
}

export interface PullRequestDetailsConflictedFilesMessage {
    conflictedFiles: string[];
}

export interface PullRequestDetailsMergeStrategiesMessage {
    mergeStrategies: MergeStrategy[];
}

export interface PullRequestDetailsBuildStatusesMessage {
    buildStatuses: BuildStatus[];
}

export interface PullRequestDetailsRelatedJiraIssuesMessage {
    relatedIssues: MinimalIssue<DetailedSiteInfo>[];
}

export interface PullRequestDetailsTasksMessage {
    tasks: Task[];
    comments: Comment[];
}

export const emptyPullRequestDetailsInitMessage: PullRequestDetailsInitMessage = {
    pr: emptyPullRequest,
    commits: [],
    currentUser: emptyUser,
    currentBranchName: '',
    comments: [],
    fileDiffs: [],
    mergeStrategies: [],
    buildStatuses: [],
    relatedJiraIssues: [],
    tasks: [],
    loadState: {
        // true indicates this particular component is still loading
        basicData: true,
        comments: true,
        commits: true,
        tasks: true,
        relatedJiraIssues: true,
        diffs: true,
        mergeStrategies: true,
        buildStatuses: true,
    },
    conflictedFiles: [],
};
