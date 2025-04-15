import { parseISO } from 'date-fns';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import * as vscode from 'vscode';
import { clientForSite } from '../../bitbucket/bbUtils';
import {
    Commit,
    PaginatedComments,
    PaginatedPullRequests,
    PullRequest,
    Task,
    type FileDiff,
} from '../../bitbucket/model';
import { Commands } from '../../commands';
import { Logger } from '../../logger';
import { Resources } from '../../resources';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import { CommitSectionNode } from '../nodes/commitSectionNode';
import { RelatedBitbucketIssuesNode } from '../nodes/relatedBitbucketIssuesNode';
import { RelatedIssuesNode } from '../nodes/relatedIssuesNode';
import { SimpleNode } from '../nodes/simpleNode';
import { createFileChangesNodes } from './diffViewHelper';
// @ts-ignore TODO: fix noImplicitAny error here
// eslint-disable-next-line import/no-extraneous-dependencies
import { Diff } from '@atlassian/bitkit-diff';
// @ts-ignore TODO: fix noImplicitAny error here
// eslint-disable-next-line import/no-extraneous-dependencies
import diffParser from '@atlassian/diffparser';
import { FilesRootNode } from '../nodes/FilesRootNode';

export const PullRequestContextValue = 'pullrequest';
export class PullRequestTitlesNode extends AbstractBaseNode {
    private treeItem: vscode.TreeItem;
    public prHref: string;
    private loadedChildren: AbstractBaseNode[] = [];
    private isLoading = false;
    private parsedDiffCache: Map<string, any> = new Map();

    constructor(
        private pr: PullRequest,
        shouldPreload: boolean,
        parent: AbstractBaseNode | undefined,
    ) {
        super(parent);
        this.treeItem = this.createTreeItem();
        this.prHref = pr.data!.url;
        pr.titleNode = this;

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

    getParsedCache() {
        return this.parsedDiffCache;
    }

    getPR() {
        return this.pr;
    }

    refresh(): void {
        vscode.commands.executeCommand(Commands.RefreshPullRequestExplorerNode, this.treeItem.resourceUri);
    }

    async criticalData(
        criticalPromise: Promise<[FileDiff[], PaginatedComments]>,
    ): Promise<[FileDiff[], PaginatedComments, AbstractBaseNode[]]> {
        let fileChangedNodes: AbstractBaseNode[] = [];
        let files: FileDiff[] = [];
        let comments: PaginatedComments = { data: [] };
        try {
            [files, comments] = await criticalPromise;
            fileChangedNodes = await createFileChangesNodes(this.pr, comments, files, [], []);
            // update loadedChildren with critical data without commits
            this.loadedChildren = [
                new DescriptionNode(this.pr, this),
                ...(this.pr.site.details.isCloud ? [new CommitSectionNode(this.pr, [], true)] : []),
                new FilesRootNode(fileChangedNodes, this),
            ];
        } catch (error) {
            Logger.debug('error fetching pull request details', error);
            this.loadedChildren = [new SimpleNode('⚠️ Error: fetching pull request details failed')];
            this.isLoading = false;
        } finally {
            this.refresh();
            return [files, comments, fileChangedNodes];
        }
    }

    async nonCriticalData(
        nonCriticalPromise: Promise<[string[], Task[]]>,
        fileDiffs: FileDiff[],
        allComments: PaginatedComments,
        commits: Commit[],
    ): Promise<void> {
        try {
            const [conflictedFiles, tasks] = await nonCriticalPromise;
            const [jiraIssueNodes, bbIssueNodes, fileNodes] = await Promise.all([
                this.createRelatedJiraIssueNode(commits, allComments),
                this.createRelatedBitbucketIssueNode(commits, allComments),
                createFileChangesNodes(this.pr, allComments, fileDiffs, conflictedFiles, tasks),
            ]);
            // update loadedChildren with additional data
            this.loadedChildren = [
                new DescriptionNode(this.pr, this),
                ...(this.pr.site.details.isCloud ? [new CommitSectionNode(this.pr, commits)] : []),
                ...jiraIssueNodes,
                ...bbIssueNodes,
                new FilesRootNode(fileNodes, this),
            ];
        } catch (error) {
            Logger.debug('error fetching additional pull request details', error);
        }
    }

    async fetchDataAndProcessChildren(): Promise<void> {
        if (this.isLoading || !this.pr) {
            return;
        }
        this.isLoading = true;

        // Set initial state with empty Files directory
        this.loadedChildren = [new DescriptionNode(this.pr, this), new SimpleNode('Loading...')];
        this.refresh(); // Show initial structure

        try {
            const bbApi = await clientForSite(this.pr.site);

            // Parse diff and setup file index map
            const fullDiff = await bbApi.pullrequests.getPullRequestDiff(this.pr);
            const parsedDiffs = diffParser(fullDiff);
            const fileIndexMap = new Map<string, string>();
            parsedDiffs.forEach((diff: Diff) => {
                if (diff.index?.length > 0) {
                    const fileIndex = diff.index[0];
                    const hash = fileIndex.includes('..') ? fileIndex.split('..')[1] : fileIndex;
                    if (diff.from) {
                        fileIndexMap.set(diff.from, hash);
                    }
                    if (diff.to) {
                        fileIndexMap.set(diff.to, hash);
                    }
                }
            });
            this.parsedDiffCache.set('fileIndexMap', fileIndexMap);

            // Fetch data
            const criticalPromise = Promise.all([
                bbApi.pullrequests.getChangedFiles(this.pr),
                bbApi.pullrequests.getComments(this.pr),
            ]);
            const commitsPromise = bbApi.pullrequests.getCommits(this.pr);
            const nonCriticalPromise = Promise.all([
                bbApi.pullrequests.getConflictedFiles(this.pr),
                bbApi.pullrequests.getTasks(this.pr),
            ]);

            // Process critical data
            const [fileDiffs, allComments, fileChangedNodes] = await this.criticalData(criticalPromise);
            const commits = await commitsPromise;

            // Update children list without recreating Files directory
            this.loadedChildren = [
                new DescriptionNode(this.pr, this),
                ...(this.pr.site.details.isCloud ? [new CommitSectionNode(this.pr, commits)] : []),
                new FilesRootNode(fileChangedNodes, this),
            ];
            this.refresh();

            // Process non-critical data
            await this.nonCriticalData(nonCriticalPromise, fileDiffs, allComments, commits);
        } catch (error) {
            Logger.debug('error fetching pull request details', error);
            this.loadedChildren = [new SimpleNode('⚠️ Error: fetching pull request details failed')];
        } finally {
            this.isLoading = false;
            this.refresh();
        }
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
