import { createEmptyMinimalIssue, MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import orderBy from 'lodash.orderby';
import * as vscode from 'vscode';
import { issueUrlCopiedEvent, issueWorkStartedEvent } from '../analytics';
import { DetailedSiteInfo, emptySiteInfo, Product, ProductJira } from '../atlclients/authInfo';
import { clientForSite } from '../bitbucket/bbUtils';
import { BitbucketBranchingModel, Repo } from '../bitbucket/model';
import { assignIssue } from '../commands/jira/assignIssue';
import { showIssue } from '../commands/jira/showIssue';
import { Container } from '../container';
import { isOpenJiraIssue, isStartWork } from '../ipc/issueActions';
import { StartWorkOnIssueData } from '../ipc/issueMessaging';
import { Action, onlineStatus } from '../ipc/messaging';
import { BranchType, RepoData } from '../ipc/prMessaging';
import { fetchMinimalIssue } from '../jira/fetchIssue';
import { transitionIssue } from '../jira/transitionIssue';
import { Logger } from '../logger';
import { iconSet, Resources } from '../resources';
import { Branch, RefType, Repository } from '../typings/git';
import { AbstractReactWebview, InitializingWebview } from './abstractWebview';

const customBranchType: BranchType = { kind: 'Custom', prefix: '' };

export class StartWorkOnIssueWebview
    extends AbstractReactWebview
    implements InitializingWebview<MinimalIssue<DetailedSiteInfo>>
{
    private _state: MinimalIssue<DetailedSiteInfo> = createEmptyMinimalIssue(emptySiteInfo);

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return vscode.l10n.t('Start work on Jira Issue');
    }
    public get id(): string {
        return 'startWorkOnIssueScreen';
    }

    setIconPath() {
        this._panel!.iconPath = Resources.icons.get(iconSet.JIRAICON);
    }

    public get siteOrUndefined(): DetailedSiteInfo | undefined {
        return this._state.siteDetails;
    }

    public get productOrUndefined(): Product | undefined {
        return ProductJira;
    }

    async createOrShowIssue(data: MinimalIssue<DetailedSiteInfo>) {
        await super.createOrShow();
        this.initialize(data);
    }

    async initialize(data: MinimalIssue<DetailedSiteInfo>) {
        if (!Container.onlineDetector.isOnline()) {
            this.postMessage(onlineStatus(false));
            return;
        }

        if (this._state.key !== data.key) {
            this.postMessage({
                type: 'update',
                issue: createEmptyMinimalIssue(emptySiteInfo),
                repoData: [],
            });
        }
        this.updateIssue(data);
        return;
    }

    public async invalidate() {
        await this.forceUpdateIssue();
    }

    protected async onMessageReceived(e: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(e);

        if (!handled) {
            switch (e.action) {
                case 'refreshIssue': {
                    handled = true;
                    this.forceUpdateIssue();
                    break;
                }
                case 'openJiraIssue': {
                    if (isOpenJiraIssue(e)) {
                        handled = true;
                        showIssue(e.issueOrKey);
                    }
                    break;
                }
                case 'copyJiraIssueLink': {
                    handled = true;
                    const linkUrl = `${this._state.siteDetails.baseLinkUrl}/browse/${this._state.key}`;
                    await vscode.env.clipboard.writeText(linkUrl);
                    issueUrlCopiedEvent().then((e) => {
                        Container.analyticsClient.sendTrackEvent(e);
                    });
                    break;
                }
                case 'startWork': {
                    if (isStartWork(e)) {
                        try {
                            const issue = this._state;
                            if (e.setupBitbucket) {
                                const scm = Container.bitbucketContext.getRepositoryScm(e.repoUri)!;
                                await this.createOrCheckoutBranch(
                                    scm,
                                    e.targetBranchName,
                                    e.sourceBranch,
                                    e.remoteName,
                                );
                            }
                            const currentUserId = issue.siteDetails.userId;
                            await assignIssue(issue, currentUserId);
                            if (e.setupJira && issue.status.id !== e.transition.to.id) {
                                await transitionIssue(issue, e.transition);
                            }
                            this.postMessage({
                                type: 'startWorkOnIssueResult',
                                successMessage: `<ul><li>${vscode.l10n.t('Assigned the issue to you')}</li>${
                                    e.setupJira
                                        ? `<li>${vscode.l10n.t('Transitioned status to {0}', `<code>${e.transition.to.name}</code>`)}</li>`
                                        : ''
                                }  ${
                                    e.setupBitbucket
                                        ? `<li>${vscode.l10n.t('Switched to {0} branch with upstream set to {1}', `<code>${e.targetBranchName}</code>`, `<code>${e.remoteName}/${e.targetBranchName}</code>`)}</li>`
                                        : ''
                                }</ul>`,
                            });
                            issueWorkStartedEvent(issue.siteDetails).then((e) => {
                                Container.analyticsClient.sendTrackEvent(e);
                            });
                        } catch (e) {
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }
                    }
                }
            }
        }

        return handled;
    }

    async createOrCheckoutBranch(
        repo: Repository,
        destBranch: string,
        sourceBranch: Branch,
        remote: string,
    ): Promise<void> {
        // checkout if a branch exists already
        try {
            await repo.fetch(remote, sourceBranch.name);
            await repo.getBranch(destBranch);
            await repo.checkout(destBranch);
            return;
        } catch (_) {}

        // checkout if there's a matching remote branch (checkout will track remote branch automatically)
        try {
            await repo.getBranch(`remotes/${remote}/${destBranch}`);
            await repo.checkout(destBranch);
            return;
        } catch (_) {}

        // no existing branches, create a new one
        await repo.createBranch(
            destBranch,
            true,
            `${sourceBranch.type === RefType.RemoteHead ? 'remotes/' : ''}${sourceBranch.name}`,
        );
        await repo.push(remote, destBranch, true);
        return;
    }

    public async updateIssue(issue: MinimalIssue<DetailedSiteInfo>) {
        if (this.isRefeshing) {
            return;
        }

        this.isRefeshing = true;
        try {
            this._state = issue;

            if (this._panel) {
                this._panel.title = `Start work on ${issue.key}`;
            }

            const workspaceRepos = Container.bitbucketContext ? Container.bitbucketContext.getAllRepositories() : [];

            const repoData: (RepoData & { hasSubmodules: boolean })[] = await Promise.all(
                workspaceRepos
                    .filter((r) => r.siteRemotes.length > 0)
                    .map(async (wsRepo) => {
                        let repo: Repo | undefined = undefined;
                        let developmentBranch = undefined;
                        let href = undefined;
                        let isCloud = false;
                        let branchTypes: BranchType[] = [];

                        const site = wsRepo.mainSiteRemote.site;
                        const scm = Container.bitbucketContext.getRepositoryScm(wsRepo.rootUri)!;
                        if (site) {
                            let branchingModel: BitbucketBranchingModel | undefined = undefined;

                            const bbApi = await clientForSite(site);
                            [, repo, developmentBranch, branchingModel] = await Promise.all([
                                scm.fetch(),
                                bbApi.repositories.get(site),
                                bbApi.repositories.getDevelopmentBranch(site),
                                bbApi.repositories.getBranchingModel(site),
                            ]);

                            href = repo!.url;
                            isCloud = site.details.isCloud;

                            if (branchingModel && branchingModel.branch_types) {
                                branchTypes = [...branchingModel.branch_types].sort((a, b) => {
                                    return a.kind.localeCompare(b.kind);
                                });
                                if (branchTypes.length > 0) {
                                    branchTypes.push(customBranchType);
                                }
                            }
                        }

                        return {
                            workspaceRepo: wsRepo,
                            href: href,
                            localBranches: await scm.getBranches({ remote: false }),
                            remoteBranches: await scm.getBranches({ remote: true }),
                            branchTypes: branchTypes,
                            developmentBranch: developmentBranch,
                            isCloud: isCloud,
                            hasSubmodules: scm.state.submodules.length > 0,
                        };
                    }),
            );

            let issueClone: MinimalIssue<DetailedSiteInfo> = JSON.parse(JSON.stringify(issue));
            // best effort to set issue to in-progress
            if (!issueClone.status.name.toLowerCase().includes('progress')) {
                const inProgressTransition = issueClone.transitions.find(
                    (t) => !t.isInitial && t.to.name.toLocaleLowerCase().includes('progress'),
                );
                if (inProgressTransition) {
                    issueClone.status = inProgressTransition.to;
                } else {
                    const firstNonInitialTransition = issueClone.transitions.find((t) => !t.isInitial);
                    issueClone.status = firstNonInitialTransition ? firstNonInitialTransition.to : issueClone.status;
                }
            }

            //Pass in the modified issue but keep the original issue as-is so that we're able to see if its status has changed later
            const msg: StartWorkOnIssueData = {
                type: 'update',
                issue: issueClone,
                repoData: orderBy(repoData, 'hasSubmodules', 'desc'),
            };
            this.postMessage(msg);
        } catch (e) {
            let err = new Error(`error updating issue: ${e}`);
            Logger.error(err);
            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
        } finally {
            this.isRefeshing = false;
        }
    }

    private async forceUpdateIssue() {
        let key = this._state.key;
        if (key !== '') {
            try {
                let issue = await fetchMinimalIssue(key, this._state.siteDetails);
                this.updateIssue(issue);
            } catch (e) {
                Logger.error(e);
                this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
            }
        }
    }
}
