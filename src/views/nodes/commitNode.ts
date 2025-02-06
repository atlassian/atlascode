import * as vscode from 'vscode';
import { clientForSite } from '../../bitbucket/bbUtils';
import { Commit, PullRequest } from '../../bitbucket/model';
import { Logger } from '../../logger';
import { createFileChangesNodes } from '../pullrequest/diffViewHelper';
import { AbstractBaseNode } from './abstractBaseNode';
import { SimpleNode } from './simpleNode';

export class CommitNode extends AbstractBaseNode {
    private pr: PullRequest;
    private commit: Commit;
    constructor(pr: PullRequest, commit: Commit) {
        super();
        this.pr = pr;
        this.commit = commit;
    }

    getTreeItem(): vscode.TreeItem {
        let item = new vscode.TreeItem(
            `${this.commit.hash.substring(0, 7)}`,
            vscode.TreeItemCollapsibleState.Collapsed,
        );
        item.description = this.commit.message;
        item.tooltip = this.commit.message;
        item.resourceUri = vscode.Uri.parse(this.commit.url);
        return item;
    }

    async fetchDataAndProcessChildren(): Promise<AbstractBaseNode[] | [SimpleNode]> {
        try {
            const bbApi = await clientForSite(this.pr.site);
            const diffs = await bbApi.pullrequests.getChangedFiles(this.pr, this.commit.hash);
            const paginatedComments = await bbApi.pullrequests.getComments(this.pr, this.commit.hash);

            //TODO: pass tasks if commit-level tasks exist
            //TODO: if there is more than one parent, there should probably be a notification about diff ambiguity, unless I can figure
            //out a way to resolve this
            const children = await createFileChangesNodes(this.pr, paginatedComments, diffs, [], {
                lhs: this.commit.parentHashes?.[0] ?? '', //The only time I can think of this being undefined is for an initial commit, but what should the parent be there?
                rhs: this.commit.hash,
            });
            return children;
        } catch (e) {
            Logger.debug('error fetching changed files', e);
            return [new SimpleNode(vscode.l10n.t('{0} Error: fetching changed files', '⚠️'))];
        }
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        if (!element) {
            return await this.fetchDataAndProcessChildren();
        }
        return element.getChildren();
    }
}
