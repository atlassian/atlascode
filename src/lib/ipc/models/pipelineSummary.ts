import { DetailedSiteInfo, emptySiteInfo, ProductBitbucket } from '../../../atlclients/authInfo';
import { BitbucketSite, Repo } from '../../../bitbucket/model';
import { Pipeline, PipelineState, PipelineTarget, PipelineTargetType } from '../../../pipelines/model';

const emptyPipelineTarget: PipelineTarget = {
    type: PipelineTargetType.Reference,
};

const emptyPipelineState: PipelineState = {
    name: '',
    type: '',
};

const emptyBitbucketSiteInfo: DetailedSiteInfo = { ...emptySiteInfo, product: ProductBitbucket };

const emptyBitbucketSite: BitbucketSite = {
    details: emptyBitbucketSiteInfo,
    ownerSlug: '',
    repoSlug: '',
};

const emptyRepo: Repo = {
    id: '',
    name: '',
    displayName: '',
    fullName: '',
    url: '',
    avatarUrl: '',
    issueTrackerEnabled: false,
};

export const emptyPipeline: Pipeline = {
    repository: emptyRepo,
    site: emptyBitbucketSite,
    build_number: 0,
    created_on: '',
    state: emptyPipelineState,
    uuid: '',
    target: emptyPipelineTarget,
};
