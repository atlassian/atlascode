import { format, formatDistanceToNow, parseISO } from 'date-fns';
import path from 'path';
import {
    commands,
    ConfigurationChangeEvent,
    Disposable,
    Event,
    EventEmitter,
    TreeItem,
    TreeItemCollapsibleState,
    Uri,
    l10n,
} from 'vscode';
import { ProductBitbucket } from '../../atlclients/authInfo';
import { clientForSite } from '../../bitbucket/bbUtils';
import { WorkspaceRepo } from '../../bitbucket/model';
import { Commands } from '../../commands';
import { configuration } from '../../config/configuration';
import { Container } from '../../container';
import { Pipeline } from '../../pipelines/model';
import { Resources } from '../../resources';
import { BaseTreeDataProvider } from '../Explorer';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import { emptyBitbucketNodes } from '../nodes/bitbucketEmptyNodeList';
import { SimpleNode } from '../nodes/simpleNode';
import { descriptionForState, filtersActive, iconUriForPipeline, shouldDisplay } from './Helpers';

const defaultPageLength = 25;

export class PipelinesTree extends BaseTreeDataProvider {
    private _disposable: Disposable;
    private _childrenMap = new Map<string, PipelinesRepoNode>();
    private _onDidChangeTreeData = new EventEmitter<AbstractBaseNode | null>();
    public get onDidChangeTreeData(): Event<AbstractBaseNode | null> {
        return this._onDidChangeTreeData.event;
    }

    constructor() {
        super();

        this._disposable = Disposable.from(
            this._onDidChangeTreeData,
            commands.registerCommand(Commands.PipelinesNextPage, (repo) => {
                this.fetchNextPage(repo);
            }),
            configuration.onDidChange(this.onConfigurationChanged, this),
        );
    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {
        if (
            configuration.changed(e, 'bitbucket.pipelines.hideEmpty') ||
            configuration.changed(e, 'bitbucket.pipelines.hideFiltered') ||
            configuration.changed(e, 'bitbucket.pipelines.branchFilters')
        ) {
            this.refresh();
        }
    }

    async fetchNextPage(workspaceRepo: WorkspaceRepo) {
        const node = this._childrenMap.get(workspaceRepo.rootUri);
        if (node) {
            await node.fetchNextPage();
        }
        this._onDidChangeTreeData.fire(null);
    }

    getTreeItem(element: AbstractBaseNode): TreeItem | Promise<TreeItem> {
        return element.getTreeItem();
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        if (element) {
            return element.getChildren(element);
        }

        const workspaceRepos = Container.bitbucketContext.getBitbucketCloudRepositories();
        const expand = workspaceRepos.length === 1;

        if (this._childrenMap.size === 0) {
            workspaceRepos.forEach((wsRepo) => {
                this._childrenMap.set(wsRepo.rootUri, new PipelinesRepoNode(wsRepo, expand));
            });
        }

        return this._childrenMap.size === 0 ? emptyBitbucketNodes : Array.from(this._childrenMap.values());
    }

    public refresh() {
        this._childrenMap.clear();
        this._onDidChangeTreeData.fire(null);
    }

    async dispose() {
        this._disposable.dispose();
    }
}

export class PipelinesRepoNode extends AbstractBaseNode {
    private _pipelines: Pipeline[];
    private _page = 1;
    private _morePages = true;

    constructor(
        private workspaceRepo: WorkspaceRepo,
        private expand?: boolean,
    ) {
        super();
    }

    getTreeItem(): TreeItem {
        const directory = path.basename(this.workspaceRepo.rootUri);
        const item = new TreeItem(
            `${directory}`,
            this.expand ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed,
        );
        item.tooltip = this.workspaceRepo.rootUri;
        return item;
    }

    async fetchNextPage() {
        if (this._page) {
            this._page++;
        }
        if (!this._pipelines) {
            this._pipelines = [];
        }
        const newPipelines = await this.fetchPipelines();
        this._pipelines = this._pipelines.concat(newPipelines);
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        if (!this.workspaceRepo.mainSiteRemote.site) {
            return Promise.resolve([
                new SimpleNode(l10n.t('Please login to {0}', ProductBitbucket.name), {
                    command: Commands.ShowConfigPage,
                    title: l10n.t('Login to Bitbucket'),
                    arguments: [ProductBitbucket],
                }),
            ]);
        }
        if (!element || element instanceof PipelinesRepoNode) {
            if (!this._pipelines) {
                this._pipelines = await this.fetchPipelines();
            }
            if (this._pipelines.length === 0 && !filtersActive()) {
                return [new SimpleNode(l10n.t('No pipelines results for this repository'))];
            }

            const filteredPipelines = this._pipelines.filter((pipeline) => shouldDisplay(pipeline.target));
            let nodes: AbstractBaseNode[] = [];
            if (filtersActive() && filteredPipelines.length === 0 && !this._morePages) {
                nodes = [new SimpleNode(l10n.t('No pipelines matching your filters'))];
            } else if (filtersActive() && filteredPipelines.length === 0) {
                const firstPipeTime: string = this._pipelines[0].created_on;
                const lastPipeTime: string = this._pipelines[this._pipelines.length - 1].created_on;
                nodes = [
                    new SimpleNode(
                        `No pipelines matching your filters from ${format(
                            parseISO(firstPipeTime),
                            'yyyy-MM-dd h:mm a',
                        )} to ${format(parseISO(lastPipeTime), 'yyyy-MM-dd h:mm a')}`,
                    ),
                ];
            } else {
                nodes = filteredPipelines.map((pipeline) => new PipelineNode(this, pipeline));
            }

            if (this._morePages && filtersActive()) {
                nodes.push(
                    new NextPageNode(this.workspaceRepo, this._pipelines[this._pipelines.length - 1].created_on),
                ); //Pass the last-retrieved pipeline date
            } else if (this._morePages) {
                nodes.push(new NextPageNode(this.workspaceRepo));
            }
            return nodes;
        } else if (element instanceof PipelineNode) {
            return Promise.resolve([]);
        }
        return Promise.resolve([]);
    }

    private async fetchPipelines(): Promise<Pipeline[]> {
        let pipelines: Pipeline[] = [];

        const site = this.workspaceRepo.mainSiteRemote.site;
        if (site) {
            const bbApi = await clientForSite(site);
            const paginatedPipelines = await bbApi.pipelines!.getPaginatedPipelines(site, {
                page: `${this._page}`,
                pagelen: defaultPageLength,
            });
            pipelines = paginatedPipelines.values;
            const numPages = paginatedPipelines.size / defaultPageLength;
            this._morePages = paginatedPipelines.page < numPages;
        }
        return pipelines;
    }

    public refresh() {
        this._page = 1;
        this._pipelines = [];
    }
}

const PipelineBuildContextValue = 'pipelineBuild';

export class PipelineNode extends AbstractBaseNode {
    constructor(
        private _repoNode: PipelinesRepoNode,
        readonly pipeline: Pipeline,
    ) {
        super();
    }

    getTreeItem() {
        //Labels show up before descriptions, and descriptions are grayed out
        const label = `${descriptionForState(this.pipeline, false, true)}`;
        let description = '';
        if (this.pipeline.created_on) {
            description = `${formatDistanceToNow(parseISO(this.pipeline.created_on))} ago`;
        }

        const item = new TreeItem(label);
        item.description = description;
        item.contextValue = PipelineBuildContextValue;
        item.tooltip = label;
        item.command = {
            command: Commands.ShowPipeline,
            title: l10n.t('Show Pipeline'),
            arguments: [this.pipeline],
        };
        item.iconPath = iconUriForPipeline(this.pipeline);
        item.resourceUri = Uri.parse(
            `${this.pipeline.repository!.url}/addon/pipelines/home#!/results/${this.pipeline.build_number}`,
        );
        return item;
    }

    getChildren(element: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        return this._repoNode.getChildren(element);
    }
}

class NextPageNode extends AbstractBaseNode {
    private _resultsSince: string | undefined;
    constructor(
        private workspaceRepo: WorkspaceRepo,
        resultsSince?: string,
    ) {
        super();
        this._resultsSince = resultsSince;
    }

    getTreeItem() {
        const treeItem = this._resultsSince
            ? new TreeItem(
                  `Load more (showing filtered results since ${format(
                      parseISO(this._resultsSince),
                      'yyyy-MM-dd h:mm a',
                  )})`,
              )
            : new TreeItem(l10n.t('Load more'), TreeItemCollapsibleState.None);
        treeItem.iconPath = Resources.icons.get('more');
        treeItem.command = {
            command: Commands.PipelinesNextPage,
            title: l10n.t('Load more branches'),
            arguments: [this.workspaceRepo],
        };
        return treeItem;
    }
}
