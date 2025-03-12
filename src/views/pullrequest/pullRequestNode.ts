import { parseISO } from 'date-fns';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import * as vscode from 'vscode';
import { clientForSite } from '../../bitbucket/bbUtils';
import { Commit, PaginatedComments, PaginatedPullRequests, PullRequest, type FileDiff } from '../../bitbucket/model';
import { Commands } from '../../commands';
import { Logger } from '../../logger';
import { Resources } from '../../resources';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import { CommitSectionNode } from '../nodes/commitSectionNode';
import { RelatedBitbucketIssuesNode } from '../nodes/relatedBitbucketIssuesNode';
import { RelatedIssuesNode } from '../nodes/relatedIssuesNode';
import { SimpleNode } from '../nodes/simpleNode';
import { createFileChangesNodes } from './diffViewHelper';

export const PullRequestContextValue = 'pullrequest';
export class PullRequestTitlesNode extends AbstractBaseNode {
    private treeItem: vscode.TreeItem;
    public prHref: string;
    private loadedChildren: AbstractBaseNode[] = [];
    private isLoading = false;

    constructor(
        private pr: PullRequest,
        shouldPreload: boolean,
        parent: AbstractBaseNode | undefined,
    ) {
        super(parent);
        this.treeItem = this.createTreeItem();
        this.prHref = pr.data!.url;

        //If the PR node belongs to a server repo, we don't want to preload it because we can't cache nodes based on update times.
        //BBServer update times omit actions like comments, task creation, etc. so we don't know if the PR we have is really up to date without
        //grabbing all the PR data. Due to rate limits imposed by BBServer admins, mass preloading of all nodes is not feasible without
        //caching.
        if (shouldPreload) {
            this.fetchDataAndProcessChildren();
        }
    }

    private createTreeItem(): vscode.TreeItem {
        const approvalText = this.pr.data.participants
            .filter((p) => p.status === 'APPROVED')
            .map((approver) => `Approved-by: ${approver.displayName}`)
            .join('\n');

        const item = new vscode.TreeItem(
            `#${this.pr.data.id!} ${this.pr.data.title!}`,
            vscode.TreeItemCollapsibleState.Collapsed,
        );
        item.tooltip = `#${this.pr.data.id!} ${this.pr.data.title!}${
            approvalText.length > 0 ? `\n\n${approvalText}` : ''
        }`;
        item.iconPath = vscode.Uri.parse(this.pr.data!.author!.avatarUrl);
        item.contextValue = PullRequestContextValue;
        item.resourceUri = vscode.Uri.parse(this.pr.data.url);
        let dateString = '';
        if (typeof this.pr.data.updatedTs === 'number') {
            dateString = formatDistanceToNow(new Date(this.pr.data.updatedTs), {
                addSuffix: true,
            });
        } else {
            dateString = formatDistanceToNow(parseISO(this.pr.data.updatedTs), {
                addSuffix: true,
            });
        }
        item.description = `updated ${dateString}`;

        return item;
    }

    getTreeItem(): vscode.TreeItem {
        return this.treeItem;
    }

    getPR() {
        return this.pr;
    }

    refresh(): void {
        vscode.commands.executeCommand(Commands.RefreshPullRequestExplorerNode, this.treeItem.resourceUri);
    }

    async fetchDataAndProcessChildren(): Promise<void> {
        if (this.isLoading || !this.pr) {
            return;
        }
        this.isLoading = true;
        this.loadedChildren = [new DescriptionNode(this.pr, this), new SimpleNode('Loading...')];
        const bbApi = await clientForSite(this.pr.site);
        let fileDiffs: FileDiff[] = [];
        let allComments: PaginatedComments = { data: [] };
        // critical flow APIs
        try {
            fileDiffs = await bbApi.pullrequests.getChangedFiles(this.pr);
            allComments = await bbApi.pullrequests.getComments(this.pr);
            const fileChangedNodes = await createFileChangesNodes(this.pr, allComments, fileDiffs, [], []);
            this.loadedChildren = [];
            this.loadedChildren.push(new DescriptionNode(this.pr, this));
            this.loadedChildren.push(...fileChangedNodes);
            this.refresh();
        } catch (error) {
            Logger.debug('error fetching pull request details', error);
            this.loadedChildren = [new SimpleNode('⚠️ Error: fetching pull request details failed')];
        }
        // non-critical flow APIs
        Promise.all([
            bbApi.pullrequests.getConflictedFiles(this.pr),
            bbApi.pullrequests.getCommits(this.pr),
            bbApi.pullrequests.getTasks(this.pr),
        ]).then((result) => {
            const [conflictedFiles, commits, tasks] = result;
            this.loadedChildren = [];
            this.loadedChildren.push(new DescriptionNode(this.pr, this));
            if (this.pr.site.details.isCloud) {
                this.loadedChildren.push(new CommitSectionNode(this.pr, commits));
            }
            Promise.all([
                this.createRelatedJiraIssueNode(commits, allComments),
                this.createRelatedBitbucketIssueNode(commits, allComments),
                createFileChangesNodes(this.pr, allComments, fileDiffs, conflictedFiles, tasks),
            ]).then((nodes) => {
                const [jiraIssueNodes, bbIssueNodes, fileNodes] = nodes;
                this.loadedChildren.push(...jiraIssueNodes);
                this.loadedChildren.push(...bbIssueNodes);
                this.loadedChildren.push(...fileNodes);
                this.isLoading = false;
                this.refresh();
            });
        });
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        if (element) {
            return element.getChildren();
        }
        if (!this.loadedChildren.length && !this.isLoading) {
            this.fetchDataAndProcessChildren();
        }
        return this.loadedChildren;
    }

    private async createRelatedJiraIssueNode(
        commits: Commit[],
        allComments: PaginatedComments,
    ): Promise<AbstractBaseNode[]> {
        const result: AbstractBaseNode[] = [];
        const relatedIssuesNode = await RelatedIssuesNode.create(this.pr, commits, allComments.data);
        if (relatedIssuesNode) {
            result.push(relatedIssuesNode);
        }
        return result;
    }

    private async createRelatedBitbucketIssueNode(
        commits: Commit[],
        allComments: PaginatedComments,
    ): Promise<AbstractBaseNode[]> {
        const result: AbstractBaseNode[] = [];
        const relatedIssuesNode = await RelatedBitbucketIssuesNode.create(this.pr, commits, allComments.data);
        if (relatedIssuesNode) {
            result.push(relatedIssuesNode);
        }
        return result;
    }
}

export class DescriptionNode extends AbstractBaseNode {
    constructor(
        private pr: PullRequest,
        parent?: AbstractBaseNode | undefined,
    ) {
        super(parent);
    }

    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem('Details', vscode.TreeItemCollapsibleState.None);
        item.tooltip = 'Open pull request details';
        item.iconPath = Resources.icons.get('detail');

        item.command = {
            command: Commands.BitbucketShowPullRequestDetails,
            title: 'Open pull request details',
            arguments: [this.pr],
        };

        item.contextValue = PullRequestContextValue;
        item.resourceUri = vscode.Uri.parse(this.pr.data.url);

        return item;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        return [];
    }
}

export class NextPageNode extends AbstractBaseNode {
    constructor(private prs: PaginatedPullRequests) {
        super();
    }

    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem('Load next page', vscode.TreeItemCollapsibleState.None);
        item.iconPath = Resources.icons.get('more');

        item.command = {
            command: Commands.BitbucketPullRequestsNextPage,
            title: 'Load pull requests next page',
            arguments: [this.prs],
        };

        return item;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        return [];
    }
}
