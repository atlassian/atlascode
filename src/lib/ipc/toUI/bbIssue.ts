import { ReducerAction } from '@atlassianlabs/guipi-core-controller';

import {
    BitbucketIssue,
    BitbucketIssueData,
    Comment,
    emptyBitbucketSite,
    emptyUser,
    User,
} from '../../../bitbucket/model';

export enum BitbucketIssueMessageType {
    Init = 'init',
    InitComments = 'initComments',
    UpdateComments = 'updateComments',
    UpdateStatusResponse = 'updateStatusResponse',
    AddCommentResponse = 'addCommentResponse',
    FetchUsersResponse = 'fetchUsersResponse',
    AssignResponse = 'assignResponse',
}

export type BitbucketIssueMessage =
    | ReducerAction<BitbucketIssueMessageType.Init, BitbucketIssueInitMessage>
    | ReducerAction<BitbucketIssueMessageType.InitComments, BitbucketIssueCommentsMessage>
    | ReducerAction<BitbucketIssueMessageType.UpdateComments, BitbucketIssueCommentsMessage>;

export type BitbucketIssueResponse =
    | ReducerAction<BitbucketIssueMessageType.UpdateStatusResponse, UpdateStatusResponseMessage>
    | ReducerAction<BitbucketIssueMessageType.AddCommentResponse, AddCommentResponseMessage>
    | ReducerAction<BitbucketIssueMessageType.AssignResponse, AssignResponseMessage>
    | ReducerAction<BitbucketIssueMessageType.FetchUsersResponse, FetchUsersResponseMessage>;

export interface BitbucketIssueInitMessage {
    issue: BitbucketIssue;
    currentUser: User;
    showJiraButton: boolean;
}

export const emptyBitbucketIssueInitMessage: BitbucketIssueInitMessage = {
    issue: { site: emptyBitbucketSite, data: { id: '', state: '', content: { html: '' } } },
    currentUser: emptyUser,
    showJiraButton: false,
};

export interface BitbucketIssueCommentsMessage {
    comments: Comment[];
}

export const emptyBitbucketIssueCommentsMessage: BitbucketIssueCommentsMessage = {
    comments: [],
};

export interface BitbucketIssueChangesMessage {
    issue: Partial<BitbucketIssueData>;
    comments: Comment[];
}

export interface UpdateStatusResponseMessage {
    status: string;
}

export interface AddCommentResponseMessage {
    comment: Comment;
}

export interface FetchUsersResponseMessage {
    users: User[];
}

export interface AssignResponseMessage {
    assignee: User;
}
