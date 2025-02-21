import { MinimalIssue, Transition } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from '../../../../atlclients/authInfo';
import { Repo, WorkspaceRepo } from '../../../../bitbucket/model';
import { StartWorkBranchTemplate } from '../../../../config/model';
import { Branch } from '../../../../typings/git';
import { ConfigSection, ConfigSubSection } from '../../../ipc/models/config';

export interface StartWorkActionApi {
    getWorkspaceRepos(): WorkspaceRepo[];
    getRepoDetails(repo: WorkspaceRepo): Promise<Repo>;
    getRepoScmState(
        repo: WorkspaceRepo,
    ): Promise<{ localBranches: Branch[]; remoteBranches: Branch[]; hasSubmodules: boolean }>;
    assignAndTransitionIssue(issue: MinimalIssue<DetailedSiteInfo>, transition?: Transition): Promise<void>;
    createOrCheckoutBranch(
        wsRepo: WorkspaceRepo,
        destinationBranch: string,
        sourceBranch: Branch,
        remote: string,
        pushBranchToRemote: boolean,
    ): Promise<void>;
    closePage(): void;
    getStartWorkConfig(): StartWorkBranchTemplate;
    openSettings(section?: ConfigSection, subsection?: ConfigSubSection): void;
}
