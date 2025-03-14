import * as path from 'path';
import * as vscode from 'vscode';
import { clientForSite } from '../../bitbucket/bbUtils';
import { BitbucketIssue, PaginatedBitbucketIssues, WorkspaceRepo } from '../../bitbucket/model';
import { Commands } from '../../commands';
import { Resources } from '../../resources';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import { SimpleNode } from '../nodes/simpleNode';

export class BitbucketIssuesRepositoryNode extends AbstractBaseNode {
    private _children: AbstractBaseNode[] | undefined = undefined;

    constructor(
        private workspaceRepo: WorkspaceRepo,
        private expand?: boolean,
    ) {
        super();
    }

    addItems(issues: PaginatedBitbucketIssues): void {
        if (!this._children) {
            this._children = [];
        }
        if (this._children.length > 0 && this._children[this._children.length - 1] instanceof NextPageNode) {
            this._children.pop();
        }
        this._children!.push(...issues.data.map((i) => new BitbucketIssueNode(i)));
        if (issues.next) {
            this._children!.push(new NextPageNode(issues));
        }
    }

    getTreeItem(): vscode.TreeItem {
        const directory = path.basename(this.workspaceRepo.rootUri);
        const item = new vscode.TreeItem(
            `${directory}`,
            this.expand ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed,
        );
        item.tooltip = this.workspaceRepo.rootUri;

        return item;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        if (element) {
            return element.getChildren();
        }
        if (!this._children) {
            const bbApi = await clientForSite(this.workspaceRepo.mainSiteRemote.site!);
            const issues = await bbApi.issues!.getList(this.workspaceRepo);
            if (issues.data.length === 0) {
                return [new SimpleNode('No open issues for this repository')];
            }
            this._children = issues.data.map((i) => new BitbucketIssueNode(i));
            if (issues.next) {
                this._children!.push(new NextPageNode(issues));
            }
        }
        return this._children;
    }
}

class BitbucketIssueNode extends AbstractBaseNode {
    constructor(readonly issue: BitbucketIssue) {
        super();
    }

    getTreeItem(): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(`#${this.issue.data.id} ${this.issue.data.title!}`);
        treeItem.command = {
            command: Commands.ShowBitbucketIssue,
            title: 'Open bitbucket issue',
            arguments: [this.issue],
        };
        treeItem.contextValue = 'bitbucketIssue';
        treeItem.resourceUri = vscode.Uri.parse(this.issue.data.links!.html!.href!);
        return treeItem;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        return [];
    }
}

class NextPageNode extends AbstractBaseNode {
    constructor(private issues: PaginatedBitbucketIssues) {
        super();
    }

    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem('Load next page', vscode.TreeItemCollapsibleState.None);
        item.iconPath = Resources.icons.get('more');

        item.command = {
            command: Commands.BitbucketIssuesNextPage,
            title: 'Load issues next page',
            arguments: [this.issues],
        };

        return item;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        return [];
    }
}
