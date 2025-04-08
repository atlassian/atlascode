import { ReducerAction } from '@atlassianlabs/guipi-core-controller';

import { BitbucketIssue, BitbucketSite, emptyBitbucketSite } from '../../../bitbucket/model';

export enum CreateBitbucketIssueMessageType {
    Init = 'init',
    SubmitResponse = 'submitResponse',
}

export type CreateBitbucketIssueMessage = ReducerAction<
    CreateBitbucketIssueMessageType.Init,
    CreateBitbucketIssueInitMessage
>;

export type CreateBitbucketIssueResponse = ReducerAction<
    CreateBitbucketIssueMessageType.SubmitResponse,
    SubmitResponseMessage
>;

export interface CreateBitbucketIssueInitMessage {
    site: BitbucketSite;
}

export const emptyCreateBitbucketIssueInitMessage: CreateBitbucketIssueInitMessage = {
    site: emptyBitbucketSite,
};

export interface SubmitResponseMessage {
    issue: BitbucketIssue;
}
