import { Disposable, Event, EventEmitter, Uri } from 'vscode';

import { DetailedSiteInfo, ProductBitbucket } from '../atlclients/authInfo';
import { bbAPIConnectivityError } from '../constants';
import { Container } from '../container';
import { Logger } from '../logger';
import { API as GitApi, Repository } from '../typings/git';
import { CacheMap } from '../util/cachemap';
import { Time } from '../util/time';
import { BitbucketIssuesExplorer } from '../views/bbissues/bbIssuesExplorer';
import { PullRequestCommentController } from '../views/pullrequest/prCommentController';
import { PullRequestsExplorer } from '../views/pullrequest/pullRequestsExplorer';
import { clientForSite, getBitbucketCloudRemotes, getBitbucketRemotes, workspaceRepoFor } from './bbUtils';
import { BitbucketSite, PullRequest, User, WorkspaceRepo } from './model';

// BitbucketContext stores the context (hosts, auth, current repo etc.)
// for all Bitbucket related actions.
export class BitbucketContext extends Disposable {
    private _onDidChangeBitbucketContext: EventEmitter<void> = new EventEmitter<void>();
    readonly onDidChangeBitbucketContext: Event<void> = this._onDidChangeBitbucketContext.event;

    private _gitApi: GitApi;
    private _repoMap: Map<string, WorkspaceRepo> = new Map();
    private _pullRequestsExplorer: PullRequestsExplorer;
    private _bitbucketIssuesExplorer: BitbucketIssuesExplorer;
    private _disposable: Disposable;
    private _currentUsers: CacheMap;
    private _pullRequestCache = new CacheMap();
    private _mirrorsCache = new CacheMap();
    public readonly prCommentController: PullRequestCommentController;

    constructor(gitApi: GitApi) {
        super(() => this.dispose());
        this._gitApi = gitApi;
        this._pullRequestsExplorer = new PullRequestsExplorer(this);
        this._bitbucketIssuesExplorer = new BitbucketIssuesExplorer(this);
        this._currentUsers = new CacheMap();

        Container.context.subscriptions.push(
            Container.siteManager.onDidSitesAvailableChange((e) => {
                if (e.product.key === ProductBitbucket.key) {
                    this.updateUsers(e.sites);
                    this.refreshRepos();
                }
            }),
        );

        this.prCommentController = new PullRequestCommentController(Container.context);
        this._disposable = Disposable.from(
            this._gitApi.onDidChangeState(() => this.refreshRepos()),
            this._gitApi.onDidOpenRepository(() => this.refreshRepos()),
            this._gitApi.onDidCloseRepository(() => this.refreshRepos()),
            this._pullRequestsExplorer,
            this._bitbucketIssuesExplorer,
            this.prCommentController,
        );

        this.refreshRepos();
    }

    public async currentUser(site: BitbucketSite): Promise<User> {
        let foundUser = this._currentUsers.getItem<User>(site.details.host);
        if (!foundUser) {
            const bbClient = await clientForSite(site);
            foundUser = await bbClient.pullrequests.getCurrentUser(site.details)!;
            this._currentUsers.setItem(site.details.host, foundUser, 10 * Time.MINUTES);
        }

        if (foundUser) {
            return foundUser;
        }

        return Promise.reject(bbAPIConnectivityError);
    }

    public async recentPullrequestsForAllRepos(): Promise<PullRequest[]> {
        if (!this._pullRequestCache.getItem<PullRequest[]>('pullrequests')) {
            const prs = await Promise.all(
                this.getBitbucketRepositories().map(async (repo) => {
                    const bbClient = await clientForSite(repo.mainSiteRemote.site!);
                    return (await bbClient.pullrequests.getRecentAllStatus(repo)).data;
                }),
            );
            const flatPrs = prs.reduce((prev, curr) => prev.concat(curr), []);
            this._pullRequestCache.setItem('pullrequests', flatPrs, 5 * Time.MINUTES);
        }

        return this._pullRequestCache.getItem<PullRequest[]>('pullrequests')!;
    }

    private async refreshRepos() {
        if (this._gitApi.state === 'uninitialized') {
            return;
        }

        this._pullRequestCache.clear();
        this._repoMap.clear();

        await Promise.all(
            Container.siteManager.getSitesAvailable(ProductBitbucket).map(async (site) => {
                try {
                    const bbApi = await Container.clientManager.bbClient(site);
                    const mirrorHosts = await bbApi.repositories.getMirrorHosts();
                    this._mirrorsCache.setItem(site.host, mirrorHosts);
                } catch {
                    // log and ignore error
                    Logger.debug('Failed to fetch mirror sites');
                }
            }),
        );

        const repos = this.getAllRepositoriesRaw();
        for (let i = 0; i < repos.length; i++) {
            const repo: Repository = repos[i];
            if (!repo.state.HEAD) {
                Logger.debug(`JS-1324 Forcing updateModelState on ${repo.rootUri}`);
                await repo.status();
            }
            if (repo.state.remotes.length > 0) {
                this._repoMap.set(repo.rootUri.toString(), workspaceRepoFor(repo));
            } else {
                Logger.warn(`JS-1324 no remotes found for ${repo.rootUri}`);
            }
        }

        this._onDidChangeBitbucketContext.fire();
    }

    private updateUsers(sites: DetailedSiteInfo[]) {
        const removed: string[] = [];
        this._currentUsers.getItems<User>().forEach((entry) => {
            if (!sites.some((s) => s.host === entry.key)) {
                removed.push(entry.key);
            }
        });
        removed.forEach((hostname) => this._currentUsers.deleteItem(hostname));
        if (removed.length > 0) {
            this._onDidChangeBitbucketContext.fire();
        }
    }

    public getAllRepositoriesRaw(): Repository[] {
        return this._gitApi.repositories;
    }

    public getAllRepositories(): WorkspaceRepo[] {
        return Array.from(this._repoMap.values());
    }

    public isBitbucketRepo(repo: Repository): boolean {
        return getBitbucketRemotes(repo).length > 0;
    }

    public isBitbucketCloudRepo(repo: Repository): boolean {
        return getBitbucketCloudRemotes(repo).length > 0;
    }

    public getBitbucketRepositories(): WorkspaceRepo[] {
        return this.getAllRepositories().filter((wsRepo) => wsRepo.mainSiteRemote.site !== undefined);
    }

    public getBitbucketCloudRepositories(): WorkspaceRepo[] {
        return this.getAllRepositories().filter(
            (wsRepo) => wsRepo.mainSiteRemote.site !== undefined && wsRepo.mainSiteRemote.site.details.isCloud === true,
        );
    }

    public getRepository(repoUri: Uri): WorkspaceRepo | undefined {
        return this._repoMap.get(repoUri.toString());
    }

    public getRepositoryScm(repoUri: string): Repository | undefined {
        return this.getAllRepositoriesRaw().find((r) => r.rootUri.toString() === repoUri);
    }

    public getMirrors(hostname: string): string[] {
        return this._mirrorsCache.getItem<string[]>(hostname) || [];
    }

    dispose() {
        this.disposeForNow();
        this._disposable.dispose();
    }

    disposeForNow() {
        if (this._pullRequestsExplorer) {
            this._pullRequestsExplorer.dispose();
        }
        if (this._bitbucketIssuesExplorer) {
            this._bitbucketIssuesExplorer.dispose();
        }

        this._onDidChangeBitbucketContext.dispose();
    }
}
