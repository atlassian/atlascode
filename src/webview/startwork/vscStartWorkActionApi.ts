import { MinimalIssue, Transition } from '@atlassianlabs/jira-pi-common-models';

import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { clientForSite } from '../../bitbucket/bbUtils';
import { emptyRepo, Repo, WorkspaceRepo } from '../../bitbucket/model';
import { StartWorkBranchTemplate } from '../../config/model';
import { Container } from '../../container';
import { ConfigSection, ConfigSubSection, ConfigV3Section, ConfigV3SubSection } from '../../lib/ipc/models/config';
import { StartWorkActionApi } from '../../lib/webview/controller/startwork/startWorkActionApi';
import { Logger } from '../../logger';
import { Branch, RefType } from '../../typings/git';
import { Experiments } from '../../util/featureFlags';

const startWorkPushBranchToRemote = 'startWorkPushBranchToRemote';

export class VSCStartWorkActionApi implements StartWorkActionApi {
    getWorkspaceRepos(): WorkspaceRepo[] {
        return Container.bitbucketContext?.getAllRepositories() || [];
    }

    private getScm(wsRepo: WorkspaceRepo) {
        const scm = Container.bitbucketContext?.getRepositoryScm(wsRepo.rootUri);
        if (!scm) {
            Logger.debug(`Git repository not found for ${wsRepo.rootUri}`);
            throw new Error(`Git repository not found for ${wsRepo.rootUri}`);
        }
        return scm;
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
        currentBranch: string | undefined;
    }> {
        const scm = this.getScm(wsRepo);

        return {
            userName: (await scm.getConfig('user.name')) || (await scm.getGlobalConfig('user.name')),
            userEmail: (await scm.getConfig('user.email')) || (await scm.getGlobalConfig('user.email')),
            localBranches: await scm.getBranches({ remote: false }),
            remoteBranches: await scm.getBranches({ remote: true }),
            hasSubmodules: scm.state.submodules.length > 0,
            currentBranch: scm.state.HEAD?.name,
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
        const scm = this.getScm(wsRepo);

        // Try to fetch the latest from remote
        try {
            await scm.fetch(remote, sourceBranch.name);
        } catch {
            // Continue anyway as the branch might exist locally
            Logger.debug(`Fetch failed for ${remote}/${sourceBranch.name}`);
        }

        // Checkout if a local branch exists already
        try {
            await scm.getBranch(destinationBranch);
            await scm.checkout(destinationBranch);
            return;
        } catch {
            Logger.debug(`Local branch ${destinationBranch} not found`);
        }

        // Checkout if there's a matching remote branch (checkout will track remote branch automatically)
        try {
            await scm.getBranch(`remotes/${remote}/${destinationBranch}`);
            await scm.checkout(destinationBranch);
            return;
        } catch {
            Logger.debug(`Remote branch ${remote}/${destinationBranch} not found`);
        }

        // No existing branches, create a new one
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

    openSettings(section?: ConfigSection | ConfigV3Section, subsection?: ConfigSubSection | ConfigV3SubSection): void {
        if (section) {
            if (Container.featureFlagClient.checkExperimentValue(Experiments.AtlascodeNewSettingsExperiment)) {
                Container.settingsWebviewFactory.createOrShow({
                    section: ConfigV3Section.AdvancedConfig,
                    subSection: ConfigV3SubSection.StartWork,
                });
            } else {
                Container.settingsWebviewFactory.createOrShow({
                    section: ConfigSection.Jira,
                    subSection: ConfigSubSection.StartWork,
                });
            }
        } else {
            Container.settingsWebviewFactory.createOrShow(undefined);
        }
    }

    closePage() {
        Container.startWorkWebviewFactory.hide();
    }

    async getRovoDevPreference(): Promise<boolean> {
        return Container.context.globalState.get<boolean>('startWorkWithRovoDev', false);
    }

    async updateRovoDevPreference(enabled: boolean): Promise<void> {
        await Container.context.globalState.update('startWorkWithRovoDev', enabled);
    }

    async getPushBranchPreference(): Promise<boolean> {
        return Container.context.globalState.get<boolean>(startWorkPushBranchToRemote, true);
    }

    async updatePushBranchPreference(enabled: boolean): Promise<void> {
        await Container.context.globalState.update(startWorkPushBranchToRemote, enabled);
    }

    async openRovoDev(issue: MinimalIssue<DetailedSiteInfo>): Promise<void> {
        const issueUrl = `${issue.siteDetails.baseLinkUrl}/browse/${issue.key}`;
        await Container.rovodevWebviewProvider.setPromptTextWithFocus('Work on the attached Jira work item', {
            contextType: 'jiraWorkItem',
            name: issue.key,
            url: issueUrl,
        });
    }
}
