import { commands, Disposable, Event, EventEmitter, TreeItem } from 'vscode';

import { bbIssuesPaginationEvent } from '../analytics';
import { BitbucketContext } from '../bitbucket/bbContext';
import { clientForSite } from '../bitbucket/bbUtils';
import { PaginatedBitbucketIssues } from '../bitbucket/model';
import { Commands } from '../commands';
import { Container } from '../container';
import { BitbucketIssuesRepositoryNode } from './bbissues/bbIssueNode';
import { CreateBitbucketIssueNode } from './bbissues/headerNode';
import { BaseTreeDataProvider } from './Explorer';
import { AbstractBaseNode } from './nodes/abstractBaseNode';
import { emptyBitbucketNodes } from './nodes/bitbucketEmptyNodeList';

const createBitbucketIssueNode = new CreateBitbucketIssueNode();

export class BitbucketIssuesDataProvider extends BaseTreeDataProvider {
    private _onDidChangeTreeData: EventEmitter<AbstractBaseNode | null> = new EventEmitter<AbstractBaseNode | null>();
    readonly onDidChangeTreeData: Event<AbstractBaseNode | null> = this._onDidChangeTreeData.event;
    private _childrenMap: Map<string, BitbucketIssuesRepositoryNode> | undefined = undefined;

    private _disposable: Disposable;

    constructor(private ctx: BitbucketContext) {
        super();
        this._disposable = Disposable.from(
            commands.registerCommand(Commands.BitbucketIssuesNextPage, async (issues: PaginatedBitbucketIssues) => {
                const bbApi = await clientForSite(issues.site);
                const result = await bbApi.issues!.nextPage(issues);
                this.addItems(result);
                bbIssuesPaginationEvent().then((e) => Container.analyticsClient.sendUIEvent(e));
            }),
            ctx.onDidChangeBitbucketContext(() => {
                this.refresh();
            }),
        );
    }

    private updateChildren(): void {
        if (!this._childrenMap) {
            this._childrenMap = new Map();
        }
        this._childrenMap.clear();
        const workspaceRepos = this.ctx.getBitbucketCloudRepositories();
        const expand = workspaceRepos.length === 1;
        workspaceRepos.forEach((wsRepo) => {
            this._childrenMap!.set(wsRepo.rootUri, new BitbucketIssuesRepositoryNode(wsRepo, expand));
        });
    }

    refresh(): void {
        this.updateChildren();
        this._onDidChangeTreeData.fire(null);
    }

    addItems(issues: PaginatedBitbucketIssues): void {
        if (!this._childrenMap || !this._childrenMap.get(issues.workspaceRepo.rootUri)) {
            return;
        }

        this._childrenMap.get(issues.workspaceRepo.rootUri)!.addItems(issues);
        this._onDidChangeTreeData.fire(null);
    }

    async getTreeItem(element: AbstractBaseNode): Promise<TreeItem> {
        return element.getTreeItem();
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        const repos = this.ctx.getBitbucketRepositories();
        if (repos.length < 1) {
            return emptyBitbucketNodes;
        }

        if (element) {
            return element.getChildren();
        }

        if (!this._childrenMap) {
            this.updateChildren();
        }

        return [createBitbucketIssueNode, ...Array.from(this._childrenMap!.values())];
    }

    dispose() {
        this._disposable.dispose();
        this._onDidChangeTreeData.dispose();
    }
}
