import orderBy from 'lodash.orderby';
import * as vscode from 'vscode';
import { bbIssueUrlCopiedEvent, bbIssueWorkStartedEvent } from '../analytics';
import { DetailedSiteInfo, Product, ProductBitbucket } from '../atlclients/authInfo';
import { clientForSite } from '../bitbucket/bbUtils';
import { BitbucketIssue, Repo } from '../bitbucket/model';
import { Commands } from '../commands';
import { Container } from '../container';
import { isOpenBitbucketIssueAction } from '../ipc/bitbucketIssueActions';
import { StartWorkOnBitbucketIssueData } from '../ipc/bitbucketIssueMessaging';
import { isStartWork } from '../ipc/issueActions';
import { Action, onlineStatus } from '../ipc/messaging';
import { RepoData } from '../ipc/prMessaging';
import { Logger } from '../logger';
import { Resources, iconSet } from '../resources';
import { Branch, RefType, Repository } from '../typings/git';
import { AbstractReactWebview, InitializingWebview } from './abstractWebview';

export class StartWorkOnBitbucketIssueWebview
    extends AbstractReactWebview
    implements InitializingWebview<BitbucketIssue>
{
    private _state: BitbucketIssue;

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return vscode.l10n.t('Start work on Bitbucket Issue');
    }
    public get id(): string {
        return 'startWorkOnIssueScreen';
    }

    setIconPath() {
        this._panel!.iconPath = Resources.icons.get(iconSet.BITBUCKETICON);
    }

    public get siteOrUndefined(): DetailedSiteInfo | undefined {
        if (this._state) {
            return this._state.site.details;
        }

        return undefined;
    }

    public get productOrUndefined(): Product | undefined {
        return ProductBitbucket;
    }

    async createOrShowIssue(data: BitbucketIssue) {
        await super.createOrShow();
        this.initialize(data);
    }

    initialize(data: BitbucketIssue) {
        this._state = data;

        if (!Container.onlineDetector.isOnline()) {
            this.postMessage(onlineStatus(false));
            return;
        }
        this.invalidate();
    }

    public async invalidate() {
        this.forceUpdateIssue();
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
                case 'openBitbucketIssue': {
                    if (isOpenBitbucketIssueAction(e)) {
                        handled = true;
                        vscode.commands.executeCommand(Commands.ShowBitbucketIssue, this._state);
                    }
                    break;
                }
                case 'copyBitbucketIssueLink': {
                    handled = true;
                    const linkUrl = this._state.data.links!.html!.href!;
                    await vscode.env.clipboard.writeText(linkUrl);
                    bbIssueUrlCopiedEvent().then((e) => {
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

                            const bbApi = await clientForSite(issue.site);
                            await bbApi.issues!.assign(issue, issue.site.details.userId);
                            this.postMessage({
                                type: 'startWorkOnIssueResult',
                                successMessage: `<ul><li>${vscode.l10n.t('Assigned the issue to you')}</li>${
                                    e.setupBitbucket
                                        ? `<li>${vscode.l10n.t(
                                              'Switched to {0} branch with upstream set to {1}',
                                              `<code>${e.targetBranchName}</code>`,
                                              `<code>${e.remoteName}/${e.targetBranchName}</code>`,
                                          )}</li>`
                                        : ''
                                }</ul>`,
                            });

                            bbIssueWorkStartedEvent(issue.site.details).then((e) => {
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

    public async updateIssue(issue: BitbucketIssue) {
        this._state = issue;

        if (this._panel) {
            this._panel.title = vscode.l10n.t('Start work on Issue #{0}', issue.data.id);
        }

        const repos = Container.bitbucketContext ? Container.bitbucketContext.getAllRepositories() : [];

        const repoData: (RepoData & { hasSubmodules: boolean })[] = await Promise.all(
            repos
                .filter((r) => r.siteRemotes.length > 0)
                .map(async (wsRepo) => {
                    let repo: Repo | undefined = undefined;
                    let developmentBranch = undefined;
                    let href = undefined;
                    let isCloud = false;
                    const site = wsRepo.mainSiteRemote.site;
                    const scm = Container.bitbucketContext.getRepositoryScm(wsRepo.rootUri)!;
                    await scm.fetch();
                    if (site) {
                        const bbApi = await clientForSite(site);
                        [repo, developmentBranch] = await Promise.all([
                            bbApi.repositories.get(site),
                            bbApi.repositories.getDevelopmentBranch(site),
                        ]);
                        href = repo.url;
                        isCloud = site.details.isCloud;
                    }

                    return {
                        workspaceRepo: wsRepo,
                        href: href,
                        localBranches: await scm.getBranches({ remote: false }),
                        remoteBranches: await scm.getBranches({ remote: true }),
                        branchTypes: [],
                        developmentBranch: developmentBranch,
                        isCloud: isCloud,
                        hasSubmodules: scm.state.submodules.length > 0,
                    };
                }),
        );

        const msg: StartWorkOnBitbucketIssueData = {
            type: 'startWorkOnBitbucketIssueData',
            issue: issue,
            repoData: orderBy(repoData, 'hasSubmodules', 'desc'),
        };
        this.postMessage(msg);
    }

    private async forceUpdateIssue() {
        if (this.isRefeshing) {
            return;
        }

        this.isRefeshing = true;
        try {
            const bbApi = await clientForSite(this._state.site);
            const updatedIssue = await bbApi.issues!.refetch(this._state);
            this.updateIssue(updatedIssue);
        } catch (e) {
            Logger.error(e);
            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
        } finally {
            this.isRefeshing = false;
        }
    }
}
