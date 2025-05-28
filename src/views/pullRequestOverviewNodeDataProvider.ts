import { Disposable, Event, EventEmitter, TreeItem } from 'vscode';

import { viewScreenEvent } from '../analytics';
import { DetailedSiteInfo, ProductBitbucket } from '../atlclients/authInfo';
import { Commands } from '../commands';
import { Container } from '../container';
import { BaseTreeDataProvider } from './Explorer';
import { AbstractBaseNode } from './nodes/abstractBaseNode';
import { SimpleNode } from './nodes/simpleNode';
import { PullRequestsOverviewSectionNode } from './pullrequest/pullRequestsOverviewSectionNode';

export class PullRequestsOverviewNodeDataProvider extends BaseTreeDataProvider {
    private _onDidChangeTreeData: EventEmitter<AbstractBaseNode | null> = new EventEmitter<AbstractBaseNode | null>();
    readonly onDidChangeTreeData: Event<AbstractBaseNode | null> = this._onDidChangeTreeData.event;
    private _prsTitleSectionMap: Map<string, PullRequestsOverviewSectionNode> = new Map();
    private _isFetchingPullRequests: boolean = false;
    private readonly _minUpdatedTs: string;

    private _disposable: Disposable;

    constructor() {
        super();
        this._disposable = Disposable.from(this._onDidChangeTreeData);

        this.updateChildren();

        // TODO: Make this configurable
        this._minUpdatedTs = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    }

    dispose() {
        this._disposable.dispose();
    }

    async refresh() {
        await this.updateChildren();
        this._onDidChangeTreeData.fire(null);
    }

    private async updateChildren(): Promise<void> {
        // Clear the current map
        this._prsTitleSectionMap.clear();

        try {
            if (this.cloudSite) {
                const internalSite = {
                    ...this.cloudSite,
                    baseApiUrl: `https://bitbucket.org/!api/internal`,
                };

                const bbApi = await Container.clientManager.bbClient(internalSite);

                const workspace = Container.config.bitbucket.explorer.pullRequestsOverview.workspace;

                if (bbApi.pullrequestsOverview && workspace) {
                    this._isFetchingPullRequests = true;
                    const overviewViewState = await bbApi.pullrequestsOverview.getOverviewViewState(
                        workspace,
                        internalSite,
                        this._minUpdatedTs,
                    );

                    // Create the "PRs to be reviewed" section
                    const toReviewNode = new PullRequestsOverviewSectionNode(
                        'Pull requests to review',
                        overviewViewState.pullRequests.reviewing,
                    );
                    this._prsTitleSectionMap.set('reviewing', toReviewNode);

                    // Create the "PRs created by you" section
                    const authoredNode = new PullRequestsOverviewSectionNode(
                        'Your pull requests',
                        overviewViewState.pullRequests.authored,
                    );
                    this._prsTitleSectionMap.set('authored', authoredNode);
                    this._isFetchingPullRequests = false;
                }
            }
        } catch (e) {
            console.error('Error fetching pull requests:', e);
            // Make sure to set _isFetchingPullRequests to false when there's an error
            this._isFetchingPullRequests = false;
        }

        this._onDidChangeTreeData.fire(null);
    }

    override async getTreeItem(element: AbstractBaseNode): Promise<TreeItem> {
        return element.getTreeItem();
    }

    get cloudSite(): DetailedSiteInfo | null {
        const sites = Container.siteManager.getSitesAvailable(ProductBitbucket);
        return sites.find((site) => site.isCloud) ?? null;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        if (Container.siteManager.getSitesAvailable(ProductBitbucket).length === 0) {
            viewScreenEvent('pullRequestsOverviewTreeViewUnauthenticatedMessage', undefined, ProductBitbucket).then(
                (event) => Container.analyticsClient.sendScreenEvent(event),
            );
            return [
                new SimpleNode('Authenticate with Bitbucket to view pull requests', {
                    command: Commands.ShowBitbucketAuth,
                    title: 'Open Bitbucket Settings',
                }),
            ];
        }

        if (!this.cloudSite) {
            return [new SimpleNode('This view is only available on Bitbucket Cloud')];
        }

        if (!Container.config.bitbucket.explorer.pullRequestsOverview.workspace) {
            return [new SimpleNode('Please specify a BitBucket Workspace')];
        }

        if (element) {
            return element.getChildren();
        }

        if (this._isFetchingPullRequests) {
            return [new SimpleNode('Fetching pull requests...')];
        }

        if (this._prsTitleSectionMap.size === 0) {
            return [new SimpleNode('No Pull Requests found')];
        }

        return Array.from(this._prsTitleSectionMap.values());
    }
}
