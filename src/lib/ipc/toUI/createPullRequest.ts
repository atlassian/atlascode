import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';

import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { BitbucketBranchingModel, Commit, FileDiff, PullRequest, User, WorkspaceRepo } from '../../../bitbucket/model';
import { Branch } from '../../../typings/git';

export enum CreatePullRequestMessageType {
    Init = 'init',
    InitComments = 'initComments',
    UpdateDetails = 'updateDetails',
    UpdateIssue = 'updateIssue',
    FetchUsersResponse = 'fetchUsersResponse',
    SubmitResponse = 'submitResponse',
}

export type CreatePullRequestMessage =
    | ReducerAction<CreatePullRequestMessageType.Init, CreatePullRequestInitMessage>
    | ReducerAction<CreatePullRequestMessageType.UpdateIssue, UpdateIssueMessage>
    | ReducerAction<CreatePullRequestMessageType.UpdateDetails, UpdateDetailsMessage>;

export type CreatePullRequestResponse =
    | ReducerAction<CreatePullRequestMessageType.FetchUsersResponse, FetchUsersResponseMessage>
    | ReducerAction<CreatePullRequestMessageType.SubmitResponse, SubmitResponseMessage>;

export interface RepoData {
    workspaceRepo: WorkspaceRepo;
    href?: string;
    avatarUrl?: string;
    localBranches: Branch[];
    remoteBranches: Branch[];
    developmentBranch?: string;
    hasLocalChanges: boolean;
    branchingModel?: BitbucketBranchingModel;
    defaultReviewers: User[];
    isCloud: boolean;
    hasSubmodules: boolean;
}

export interface CreatePullRequestInitMessage {
    repoData: RepoData;
}

export const emptyRepoData: RepoData = {
    workspaceRepo: {
        rootUri: '',
        mainSiteRemote: {
            site: undefined,
            remote: { name: '', isReadOnly: true },
        },
        siteRemotes: [
            {
                site: undefined,
                remote: { name: '', isReadOnly: true },
            },
        ],
    },
    href: undefined,
    avatarUrl: undefined,
    localBranches: [],
    remoteBranches: [],
    developmentBranch: undefined,
    hasLocalChanges: false,
    branchingModel: undefined,
    defaultReviewers: [],
    isCloud: false,
    hasSubmodules: false,
};

export const emptyCreatePullRequestInitMessage: CreatePullRequestInitMessage = {
    repoData: emptyRepoData,
};

export interface UpdateIssueMessage {
    issue: MinimalIssue<DetailedSiteInfo>;
}

export interface UpdateDetailsMessage {
    commits: Commit[];
    fileDiffs: FileDiff[];
}

export interface FetchUsersResponseMessage {
    users: User[];
}

export interface SubmitResponseMessage {
    pr: PullRequest;
}
