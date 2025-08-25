import { MinimalIssue, Transition } from '@atlassianlabs/jira-pi-common-models';

import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { clientForSite } from '../../bitbucket/bbUtils';
import { emptyRepo, Repo, WorkspaceRepo } from '../../bitbucket/model';
import { StartWorkBranchTemplate } from '../../config/model';
import { Container } from '../../container';
import { ConfigSection, ConfigSubSection } from '../../lib/ipc/models/config';
import { StartWorkActionApi } from '../../lib/webview/controller/startwork/startWorkActionApi';
import { Logger } from '../../logger';
import { Branch, RefType } from '../../typings/git';
import { Features } from '../../util/featureFlags';

export class VSCStartWorkActionApi implements StartWorkActionApi {
    getWorkspaceRepos(): WorkspaceRepo[] {
        return Container.bitbucketContext?.getAllRepositories() || [];
    }

    async getRepoDetails(wsRepo: WorkspaceRepo): Promise<Repo> {
        const site = wsRepo.mainSiteRemote.site;
        if (!site) {
            Logger.debug(`JS-1324 No site found for repo with URI '${wsRepo.rootUri}'`);
            return emptyRepo;
        }
        const client = await clientForSite(wsRepo.mainSiteRemote.site!);
        const repoDetails = await client.repositories.get(site);
        return repoDetails;
    }

    async getRepoScmState(wsRepo: WorkspaceRepo): Promise<{
        userName: string;
        userEmail: string;
        localBranches: Branch[];
        remoteBranches: Branch[];
        hasSubmodules: boolean;
    }> {
        const scm = Container.bitbucketContext.getRepositoryScm(wsRepo.rootUri)!;

        return {
            userName: (await scm.getConfig('user.name')) || (await scm.getGlobalConfig('user.name')),
            userEmail: (await scm.getConfig('user.email')) || (await scm.getGlobalConfig('user.email')),
            localBranches: await scm.getBranches({ remote: false }),
            remoteBranches: await scm.getBranches({ remote: true }),
            hasSubmodules: scm.state.submodules.length > 0,
        };
    }

    async assignAndTransitionIssue(issue: MinimalIssue<DetailedSiteInfo>, transition?: Transition): Promise<void> {
        const client = await Container.clientManager.jiraClient(issue.siteDetails);
        await client.assignIssue(issue.key, issue.siteDetails.userId);
        if (transition !== undefined && issue.status.id !== transition.to.id) {
            await client.transitionIssue(issue.key, transition.id);
        }
    }

    async createOrCheckoutBranch(
        wsRepo: WorkspaceRepo,
        destinationBranch: string,
        sourceBranch: Branch,
        remote: string,
        pushBranchToRemote: boolean,
    ): Promise<void> {
        const scm = Container.bitbucketContext.getRepositoryScm(wsRepo.rootUri)!;

        // checkout if a branch exists already
        try {
            await scm.fetch(remote, sourceBranch.name);
            await scm.getBranch(destinationBranch);
            await scm.checkout(destinationBranch);
            return;
        } catch {}

        // checkout if there's a matching remote branch (checkout will track remote branch automatically)
        try {
            await scm.getBranch(`remotes/${remote}/${destinationBranch}`);
            await scm.checkout(destinationBranch);
            return;
        } catch {}

        // no existing branches, create a new one
        await scm.createBranch(
            destinationBranch,
            true,
            `${sourceBranch.type === RefType.RemoteHead ? 'remotes/' : ''}${sourceBranch.name}`,
        );

        if (pushBranchToRemote) {
            await scm.push(remote, destinationBranch, true);
        }
    }

    getStartWorkConfig(): StartWorkBranchTemplate {
        return {
            customTemplate: Container.config.jira.startWorkBranchTemplate.customTemplate,
            customPrefixes: Container.config.jira.startWorkBranchTemplate.customPrefixes,
        };
    }

    openSettings(section?: ConfigSection, subsection?: ConfigSubSection): void {
        Container.settingsWebviewFactory.createOrShow(
            section ? { section: section, subSection: subsection } : undefined,
        );
    }

    closePage() {
        const factory = Container.featureFlagClient.checkGate(Features.StartWorkV3)
            ? Container.startWorkV3WebviewFactory
            : Container.startWorkWebviewFactory;
        factory.hide();
    }
}
