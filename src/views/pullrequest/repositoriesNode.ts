import * as path from 'path';
import * as vscode from 'vscode';
import { PaginatedPullRequests, PullRequest, WorkspaceRepo } from '../../bitbucket/model';
import { Container } from '../../container';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import { SimpleNode } from '../nodes/simpleNode';
import { NextPageNode, PullRequestContextValue, PullRequestTitlesNode } from './pullRequestNode';

export class RepositoriesNode extends AbstractBaseNode {
    private treeItem: vscode.TreeItem;
    private children: (PullRequestTitlesNode | NextPageNode)[] | undefined = undefined;
    private dirty = false;

    constructor(
        public fetcher: (wsRepo: WorkspaceRepo) => Promise<PaginatedPullRequests>,
        private workspaceRepo: WorkspaceRepo,
        private preloadingEnabled: boolean,
        private expand?: boolean,
    ) {
        super();
        this.treeItem = this.createTreeItem();
        this.disposables.push({
            dispose: () => {
                if (this.children) {
                    this.children.forEach((child) => {
                        if (child instanceof PullRequestTitlesNode) {
                            Container.bitbucketContext.prCommentController.disposePR(child.prHref);
                        }
                        child.dispose();
                    });
                }
            },
        });
    }

    private createTreeItem(): vscode.TreeItem {
        const directory = path.basename(this.workspaceRepo.rootUri);
        const item = new vscode.TreeItem(
            `${directory}`,
            this.expand ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed,
        );
        item.tooltip = this.workspaceRepo.rootUri;
        item.contextValue = PullRequestContextValue;

        const site = this.workspaceRepo.mainSiteRemote.site!;
        item.resourceUri = vscode.Uri.parse(
            site.details.isCloud
                ? `${site.details.baseLinkUrl}/${site.ownerSlug}/${site.repoSlug}/pull-requests`
                : `${site.details.baseLinkUrl}/projects/${site.ownerSlug}/repos/${site.repoSlug}/pull-requests`,
        );

        return item;
    }

    async markDirty(preloadingEnabled: boolean) {
        this.dirty = true;
        this.preloadingEnabled = preloadingEnabled;
    }

    private async refresh() {
        const previousChildrenHrefs = (this.children || [])
            .filter((child) => child instanceof PullRequestTitlesNode)
            .map((child) => (child as PullRequestTitlesNode).prHref);

        let prs = await this.fetcher(this.workspaceRepo);
        this.children = this.createChildNodes(prs.data, this.children);
        if (prs.next) {
            this.children!.push(new NextPageNode(prs));
        }

        // dispose comments for any PRs that might have been closed during refresh
        previousChildrenHrefs.forEach((prHref) => {
            if (!this.children!.find((child) => child instanceof PullRequestTitlesNode && child.prHref === prHref)) {
                Container.bitbucketContext.prCommentController.disposePR(prHref);
            }
        });

        this.dirty = false;
    }

    findResource(uri: vscode.Uri): AbstractBaseNode | undefined {
        if (this.getTreeItem().resourceUri && this.getTreeItem().resourceUri!.toString() === uri.toString()) {
            return this;
        }
        for (const child of this.children || []) {
            if (child.getTreeItem().resourceUri && child.getTreeItem().resourceUri!.toString() === uri.toString()) {
                return child;
            }
        }
        return undefined;
    }

    addItems(prs: PaginatedPullRequests): void {
        if (!this.children) {
            this.children = [];
        }
        if (this.children.length > 0 && this.children[this.children.length - 1] instanceof NextPageNode) {
            this.children.pop();
        }
        this.children!.push(...this.createChildNodes(prs.data, this.children));
        if (prs.next) {
            this.children!.push(new NextPageNode(prs));
        }
    }

    private createChildNodes(
        pullRequests: PullRequest[],
        currentChildren?: (PullRequestTitlesNode | NextPageNode)[],
    ): PullRequestTitlesNode[] {
        const prMap = new Map<string, { pr: PullRequest; node: PullRequestTitlesNode }>();
        let numPRs = pullRequests.length;
        if (currentChildren) {
            const prNodes = currentChildren.filter(
                (child) => child instanceof PullRequestTitlesNode,
            ) as PullRequestTitlesNode[];
            prNodes.forEach((child) => {
                const pr = child.getPR();
                numPRs++; //There were calls made for each of these PRs at some point, so to avoid rate-limit issues, we track these too
                prMap.set(pr.data.id, { pr: pr, node: child });
            });
        }

        return pullRequests.map((pr) => {
            //Don't cache BBServer prs; we have no way of knowing they're up to date because the updated time property does
            //not include PR actions like comments, tasks, etc.
            if (!pr.site.details.isCloud) {
                //We can preload server PRs even without caching if there are less than 10 of them. Otherwise, probably not a good idea because of
                //varying bbserver rate limits
                return new PullRequestTitlesNode(pr, numPRs <= 10 && this.preloadingEnabled, this);
            }

            const prAndTreeNode = prMap.get(pr.data.id);
            if (prAndTreeNode && pr.data.updatedTs === prAndTreeNode.pr.data.updatedTs) {
                return prAndTreeNode.node;
            } else {
                //If there are more than 25 open pull requests, stop preloading them. We don't want to run into rate limit issues for bbcloud
                return new PullRequestTitlesNode(pr, numPRs <= 10 && this.preloadingEnabled, this);
            }
        });
    }

    getTreeItem(): vscode.TreeItem {
        return this.treeItem;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        if (element) {
            return element.getChildren();
        }
        if (!this.children || this.dirty) {
            await this.refresh();
        }
        if (this.children!.length === 0) {
            return [new SimpleNode(vscode.l10n.t('No pull requests found for this repository'))];
        }
        return this.children!;
    }
}
