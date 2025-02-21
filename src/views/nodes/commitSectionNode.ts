import * as vscode from 'vscode';
import { Commit, PullRequest } from '../../bitbucket/model';
import { AbstractBaseNode } from './abstractBaseNode';
import { CommitNode } from './commitNode';
import { IssueNode } from './issueNode';

export class CommitSectionNode extends AbstractBaseNode {
    private pr: PullRequest;
    private commits: Commit[];
    constructor(pr: PullRequest, commits: Commit[]) {
        super();
        this.pr = pr;
        this.commits = commits;
    }

    getTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem('Commits', vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = 'View commits';
        return item;
    }

    async getChildren(element?: IssueNode): Promise<CommitNode[]> {
        return this.commits.map((commit) => new CommitNode(this.pr, commit));
    }
}
