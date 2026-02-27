import { MinimalIssue, Transition } from '@atlassianlabs/jira-pi-common-models';
import { ReducerAction } from 'src/ipc/messaging';

import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { BitbucketSite, FileDiff, SiteRemote, User, WorkspaceRepo } from '../../../bitbucket/model';
import { Branch } from '../../../typings/git';
import { CommonAction } from './common';

export enum CreatePullRequestActionType {
    FetchIssue = 'fetchIssue',
    FetchDetails = 'fetchCommits',
    FetchUsersRequest = 'fetchUsersRequest',
    OpenDiff = 'openDiff',
    CreatePullRequestButtonClicked = 'createPullRequestButtonClicked',
    SubmitCreateRequest = 'submitCreateRequest',
}

export type CreatePullRequestAction =
    | ReducerAction<CreatePullRequestActionType.FetchIssue, FetchIssueAction>
    | ReducerAction<CreatePullRequestActionType.FetchDetails, FetchDetailsAction>
    | ReducerAction<CreatePullRequestActionType.OpenDiff, OpenDiffAction>
    | ReducerAction<CreatePullRequestActionType.FetchUsersRequest, FetchUsersRequestAction>
    | ReducerAction<CreatePullRequestActionType.SubmitCreateRequest, SubmitCreateRequestAction>
    | ReducerAction<CreatePullRequestActionType.CreatePullRequestButtonClicked, CreatePullRequestButtonClickedAction>
    | CommonAction;

export interface FetchIssueAction {
    branchName: string;
}

export interface FetchDetailsAction {
    sourceBranch: Branch;
    destinationBranch: Branch;
}

export interface OpenDiffAction {
    fileDiff: FileDiff;
}

export interface FetchUsersRequestAction {
    site: BitbucketSite;
    query: string;
    abortKey?: string;
}

export interface SubmitCreateRequestAction {
    workspaceRepo: WorkspaceRepo;
    sourceSiteRemote: SiteRemote;
    sourceBranch: Branch;
    sourceRemoteName: string;
    destinationBranch: Branch;
    title: string;
    summary: string;
    reviewers: User[];
    pushLocalChanges: boolean;
    closeSourceBranch: boolean;
    issue?: MinimalIssue<DetailedSiteInfo>;
    transition?: Transition;
    isDraft: boolean;
}
export interface CreatePullRequestButtonClickedAction {
    isDraft: boolean;
    sourceSiteRemote: SiteRemote;
}
