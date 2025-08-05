import * as vscode from 'vscode';

import { Commit, PullRequest } from '../../bitbucket/model';
import { AbstractBaseNode } from './abstractBaseNode';
import { CommitNode } from './commitNode';
import { IssueNode } from './issueNode';
import { SimpleNode } from './simpleNode';

export class CommitSectionNode extends AbstractBaseNode {
    private pr: PullRequest;
    private commits: Commit[];
    private loading: boolean;

    constructor(pr: PullRequest, commits: Commit[], loading?: boolean) {
        super();
        this.pr = pr;
        this.commits = commits;
        this.loading = loading ?? false;
    }

    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem('Commits', vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = 'View commits';
        return item;
    }

    override async getChildren(element?: IssueNode): Promise<CommitNode[] | SimpleNode[]> {
        if (this.commits.length === 0 && this.loading) {
            return [new SimpleNode('Loading...')];
        }
        return this.commits.map((commit) => new CommitNode(this.pr, commit));
    }
}
