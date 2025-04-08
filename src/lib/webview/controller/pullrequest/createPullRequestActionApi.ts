import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';

import { DetailedSiteInfo } from '../../../../atlclients/authInfo';
import { BitbucketSite, Commit, FileDiff, PullRequest, User, WorkspaceRepo } from '../../../../bitbucket/model';
import { Branch } from '../../../../typings/git';
import { SubmitCreateRequestAction } from '../../../ipc/fromUI/createPullRequest';
import { RepoData } from '../../../ipc/toUI/createPullRequest';

export interface CreatePullRequestActionApi {
    getWorkspaceRepos(): WorkspaceRepo[];
    getRepoDetails(repo: WorkspaceRepo): Promise<RepoData>;
    getRepoScmState(
        repo: WorkspaceRepo,
    ): Promise<{ localBranches: Branch[]; remoteBranches: Branch[]; hasSubmodules: boolean }>;
    currentUser(site: BitbucketSite): Promise<User>;
    fetchUsers(site: BitbucketSite, query: string, abortKey?: string): Promise<User[]>;
    fetchIssue(branchName: string): Promise<MinimalIssue<DetailedSiteInfo> | undefined>;
    fetchDetails(
        wsRepo: WorkspaceRepo,
        sourceBranch: Branch,
        destinationBranch: Branch,
    ): Promise<[Commit[], FileDiff[]]>;
    openDiff(fileDiff: FileDiff): void;
    create(data: SubmitCreateRequestAction): Promise<PullRequest>;
}
