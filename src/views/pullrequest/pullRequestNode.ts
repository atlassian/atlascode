import { parseISO } from 'date-fns';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import * as vscode from 'vscode';
import { clientForSite } from '../../bitbucket/bbUtils';
import { Commit, PaginatedComments, PaginatedPullRequests, PullRequest } from '../../bitbucket/model';
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
    private childrenPromises: Promise<AbstractBaseNode[]>;

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
            this.childrenPromises = this.fetchDataAndProcessChildren();
        }
    }

    private createTreeItem(): vscode.TreeItem {
        const approvalText = this.pr.data.participants
            .filter((p) => p.status === 'APPROVED')
            .map((approver) => `Approved-by: ${approver.displayName}`)
            .join('\n');

        let item = new vscode.TreeItem(
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

    async fetchDataAndProcessChildren(): Promise<AbstractBaseNode[] | [SimpleNode]> {
        if (!this.pr) {
            return [];
        }

        const bbApi = await clientForSite(this.pr.site);
        let promises = Promise.all([
            bbApi.pullrequests.getChangedFiles(this.pr),
            bbApi.pullrequests.getCommits(this.pr),
            bbApi.pullrequests.getComments(this.pr),
            bbApi.pullrequests.getTasks(this.pr),
        ]);

        return promises.then(
            async (result) => {
                let [fileDiffs, commits, allComments, tasks] = result;

                const children: AbstractBaseNode[] = [new DescriptionNode(this.pr, this)];

                //Only enable commit-level review nodes for BB Cloud (at least for now)
                if (this.pr.site.details.isCloud) {
                    children.push(new CommitSectionNode(this.pr, commits));
                }

                children.push(...(await this.createRelatedJiraIssueNode(commits, allComments)));
                children.push(...(await this.createRelatedBitbucketIssueNode(commits, allComments)));
                children.push(...(await createFileChangesNodes(this.pr, allComments, fileDiffs, tasks)));
                return children;
            },
            (reason) => {
                Logger.debug('error fetching pull request details', reason);
                return [new SimpleNode(vscode.l10n.t('{0} Error: fetching pull request details failed', '⚠️'))];
            },
        );
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        if (!element) {
            //If the promise is undefined, we didn't begin preloading in the constructor, so we need to make the full call here
            return await (this.childrenPromises ?? this.fetchDataAndProcessChildren());
        }
        return element.getChildren();
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
        let item = new vscode.TreeItem(vscode.l10n.t('Details'), vscode.TreeItemCollapsibleState.None);
        item.tooltip = vscode.l10n.t('Open pull request details');
        item.iconPath = Resources.icons.get('detail');

        item.command = {
            command: Commands.BitbucketShowPullRequestDetails,
            title: vscode.l10n.t('Open pull request details'),
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
        let item = new vscode.TreeItem(vscode.l10n.t('Load next page'), vscode.TreeItemCollapsibleState.None);
        item.iconPath = Resources.icons.get('more');

        item.command = {
            command: Commands.BitbucketPullRequestsNextPage,
            title: vscode.l10n.t('Load pull requests next page'),
            arguments: [this.prs],
        };

        return item;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        return [];
    }
}
