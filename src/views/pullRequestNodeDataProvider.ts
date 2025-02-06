import { commands, Disposable, Event, EventEmitter, TreeItem, Uri, window, workspace, l10n } from 'vscode';
import { prPaginationEvent, viewScreenEvent } from '../analytics';
import { ProductBitbucket } from '../atlclients/authInfo';
import { BitbucketContext } from '../bitbucket/bbContext';
import { clientForSite } from '../bitbucket/bbUtils';
import { PaginatedPullRequests, WorkspaceRepo } from '../bitbucket/model';
import { configuration } from '../config/configuration';
import { Commands } from '../commands';
import { Container } from '../container';
import { BaseTreeDataProvider } from './Explorer';
import { GitContentProvider } from './gitContentProvider';
import { AbstractBaseNode } from './nodes/abstractBaseNode';
import { emptyBitbucketNodes } from './nodes/bitbucketEmptyNodeList';
import { SimpleNode } from './nodes/simpleNode';
import { CreatePullRequestNode, PullRequestHeaderNode, PullRequestFilters } from './pullrequest/headerNode';
import { DescriptionNode, PullRequestTitlesNode } from './pullrequest/pullRequestNode';
import { RepositoriesNode } from './pullrequest/repositoriesNode';

const createPRNode = new CreatePullRequestNode();
const MAX_WORKSPACE_REPOS_TO_PRELOAD = 3;

export class PullRequestNodeDataProvider extends BaseTreeDataProvider {
    private _onDidChangeTreeData: EventEmitter<AbstractBaseNode | null> = new EventEmitter<AbstractBaseNode | null>();
    readonly onDidChangeTreeData: Event<AbstractBaseNode | null> = this._onDidChangeTreeData.event;
    private _childrenMap: Map<string, RepositoriesNode> | undefined = undefined;
    private _headerNode: PullRequestHeaderNode;

    public static SCHEME = 'atlascode.bbpr';
    private _disposable: Disposable;

    constructor(private ctx: BitbucketContext) {
        super();

        const defaultFilter =
            configuration.get<PullRequestFilters>('bitbucket.explorer.defaultPullRequestFilter') ||
            PullRequestFilters.Open;

        this._headerNode = new PullRequestHeaderNode(defaultFilter);

        this._disposable = Disposable.from(
            workspace.registerTextDocumentContentProvider(
                PullRequestNodeDataProvider.SCHEME,
                new GitContentProvider(ctx),
            ),
            commands.registerCommand(Commands.BitbucketPullRequestsNextPage, async (prs: PaginatedPullRequests) => {
                const bbApi = await clientForSite(prs.site);
                const result = await bbApi.pullrequests.nextPage(prs);
                this.addItems(result);
                prPaginationEvent().then((e) => Container.analyticsClient.sendUIEvent(e));
            }),
            commands.registerCommand(Commands.BitbucketShowOpenPullRequests, () => {
                this._headerNode.filterType = PullRequestFilters.Open;
                this.refresh();
            }),
            commands.registerCommand(Commands.BitbucketShowPullRequestsCreatedByMe, () => {
                this._headerNode.filterType = PullRequestFilters.CreatedByMe;
                this.refresh();
            }),
            commands.registerCommand(Commands.BitbucketShowPullRequestsToReview, () => {
                this._headerNode.filterType = PullRequestFilters.ToReview;
                this.refresh();
            }),
            commands.registerCommand(Commands.BitbucketShowMergedPullRequests, () => {
                this._headerNode.filterType = PullRequestFilters.Merged;
                this.refresh();
            }),
            commands.registerCommand(Commands.BitbucketShowDeclinedPullRequests, () => {
                this._headerNode.filterType = PullRequestFilters.Declined;
                this.refresh();
            }),
            commands.registerCommand(Commands.BitbucketPullRequestFilters, () => {
                const choice1 = l10n.t('Show all open pull requests');
                const choice2 = l10n.t('Show pull requests created by me');
                const choice3 = l10n.t('Show pull requests to be reviewed');
                const choice4 = l10n.t('Show merged pull requests');
                const choice5 = l10n.t('Show declined pull requests');
                window.showQuickPick([choice1, choice2, choice3, choice4, choice5]).then((selected: string) => {
                    switch (selected) {
                        case choice1:
                            commands.executeCommand(Commands.BitbucketShowOpenPullRequests);
                            break;
                        case choice2:
                            commands.executeCommand(Commands.BitbucketShowPullRequestsCreatedByMe);
                            break;
                        case choice3:
                            commands.executeCommand(Commands.BitbucketShowPullRequestsToReview);
                            break;
                        case choice4:
                            commands.executeCommand(Commands.BitbucketShowMergedPullRequests);
                            break;
                        case choice5:
                            commands.executeCommand(Commands.BitbucketShowDeclinedPullRequests);
                            break;
                        default:
                            break;
                    }
                });
            }),
            commands.registerCommand(Commands.RefreshPullRequestExplorerNode, (uri: Uri) => this.refreshResource(uri)),
            ctx.onDidChangeBitbucketContext(() => this.refresh()),
        );
    }

    private async updateChildren() {
        if (!this._childrenMap) {
            this._childrenMap = new Map();
        }
        const workspaceRepos = this.ctx.getBitbucketRepositories();
        const expand = workspaceRepos.length === 1;

        // dispose any removed repos
        this._childrenMap.forEach((val, key) => {
            if (!workspaceRepos.find((repo) => repo.rootUri === key)) {
                val.dispose();
                this._childrenMap!.delete(key);
            } else {
                val.fetcher = (ws) => this.fetch(ws);
            }
        });

        // add nodes for newly added repos
        // Disable preloading when there are more than 10 repos due to rate-limit issues
        // see https://splunk.paas-inf.net/en-US/app/search/atlascode_bitbucket_user_analysis for repo number distributions for our users
        for (const wsRepo of workspaceRepos) {
            const repoUri = wsRepo.rootUri;
            this._childrenMap!.has(repoUri)
                ? this._childrenMap!.get(repoUri)!.markDirty(workspaceRepos.length <= MAX_WORKSPACE_REPOS_TO_PRELOAD)
                : this._childrenMap!.set(
                      repoUri,
                      new RepositoriesNode(
                          (ws) => this.fetch(ws),
                          wsRepo,
                          workspaceRepos.length <= MAX_WORKSPACE_REPOS_TO_PRELOAD,
                          expand,
                      ),
                  );
        }
    }

    async fetch(wsRepo: WorkspaceRepo): Promise<PaginatedPullRequests> {
        const bbApi = await clientForSite(wsRepo.mainSiteRemote.site!);

        switch (this._headerNode.filterType) {
            case PullRequestFilters.Open:
                return await bbApi.pullrequests.getList(wsRepo);
            case PullRequestFilters.CreatedByMe:
                return await bbApi.pullrequests.getListCreatedByMe(wsRepo);
            case PullRequestFilters.ToReview:
                return await bbApi.pullrequests.getListToReview(wsRepo);
            case PullRequestFilters.Merged:
                return await bbApi.pullrequests.getListMerged(wsRepo);
            case PullRequestFilters.Declined:
                return await bbApi.pullrequests.getListDeclined(wsRepo);
        }
    }

    async refresh() {
        await this.updateChildren();
        this._onDidChangeTreeData.fire(null);
    }

    async refreshResource(uri: Uri) {
        if (!this._childrenMap) {
            return;
        }
        this._childrenMap.forEach((child) => {
            const foundItem = child.findResource(uri);
            if (foundItem) {
                this._onDidChangeTreeData.fire(foundItem);
            }
        });
    }

    async getFirstPullRequestNode(forceFocus: boolean): Promise<PullRequestTitlesNode | SimpleNode | undefined> {
        const children = await this.getChildren(undefined);
        const repoNode = children.find((node) => node instanceof RepositoriesNode);
        if (repoNode instanceof RepositoriesNode) {
            const prTitlesNodes = await repoNode.getChildren();
            if (prTitlesNodes) {
                return prTitlesNodes[0] as PullRequestTitlesNode;
            } else if (forceFocus) {
                return children[0] as SimpleNode;
            }
            return undefined;
        } else if (forceFocus) {
            return children[0] as SimpleNode;
        }
        return undefined;
    }

    async getCreatePullRequestNode(forceFocus: boolean): Promise<CreatePullRequestNode | SimpleNode | undefined> {
        const children = await this.getChildren(undefined);
        const createPRNode = children.find((node) => node instanceof CreatePullRequestNode);
        if (createPRNode instanceof CreatePullRequestNode) {
            return createPRNode;
        } else if (forceFocus) {
            return children[0] as SimpleNode;
        }
        return undefined;
    }

    async getDetailsNode(prTitlesNode: PullRequestTitlesNode): Promise<DescriptionNode> {
        const children = await prTitlesNode.getChildren();
        return children[0] as DescriptionNode;
    }

    addItems(prs: PaginatedPullRequests): void {
        if (!prs.workspaceRepo || !this._childrenMap || !this._childrenMap.get(prs.workspaceRepo.rootUri)) {
            return;
        }

        this._childrenMap.get(prs.workspaceRepo.rootUri)!.addItems(prs);
        this._onDidChangeTreeData.fire(null);
    }

    async getTreeItem(element: AbstractBaseNode): Promise<TreeItem> {
        return element.getTreeItem();
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        if (Container.siteManager.getSitesAvailable(ProductBitbucket).length === 0) {
            viewScreenEvent('pullRequestsTreeViewUnauthenticatedMessage', undefined, ProductBitbucket).then((event) =>
                Container.analyticsClient.sendScreenEvent(event),
            );
            return [
                new SimpleNode(l10n.t('Authenticate with Bitbucket to view pull requests'), {
                    command: Commands.ShowBitbucketAuth,
                    title: l10n.t('Open Bitbucket Settings'),
                }),
            ];
        }

        const repos = this.ctx.getBitbucketRepositories();
        if (repos.length < 1) {
            viewScreenEvent('pullRequestsTreeViewNoReposFoundMessage', undefined, ProductBitbucket).then((event) =>
                Container.analyticsClient.sendScreenEvent(event),
            );
            return emptyBitbucketNodes;
        }

        if (element) {
            return element.getChildren();
        }
        if (!this._childrenMap) {
            this.updateChildren();
        }

        return [createPRNode, this._headerNode, ...Array.from(this._childrenMap!.values())];
    }

    dispose() {
        if (this._childrenMap) {
            this._childrenMap.forEach((node) => node.dispose());
        }
        this._disposable.dispose();
        this._onDidChangeTreeData.dispose();
    }
}
