import { ReducerAction } from '@atlassianlabs/guipi-core-controller';

import { BitbucketSite } from '../../../bitbucket/model';
import { CommonAction } from './common';

export enum CreateBitbucketIssueActionType {
    SubmitCreateRequest = 'submitCreateRequest',
}

export type CreateBitbucketIssueAction =
    | ReducerAction<CreateBitbucketIssueActionType.SubmitCreateRequest, SubmitCreateRequestAction>
    | CommonAction;

export interface SubmitCreateRequestAction {
    site: BitbucketSite;
    title: string;
    description: string;
    kind: string;
    priority: string;
}
