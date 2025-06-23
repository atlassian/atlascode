import * as vscode from 'vscode';

import { PullRequest } from '../../bitbucket/model';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import { SimpleNode } from '../nodes/simpleNode';
import { PullRequestContextValue, PullRequestTitlesNode } from './pullRequestNode';

export class PullRequestsOverviewSectionNode extends AbstractBaseNode {
    private treeItem: vscode.TreeItem;
    private children: PullRequestTitlesNode[] = [];

    constructor(
        private sectionTitle: string,
        private pullRequests: PullRequest[],
    ) {
        super();
        this.treeItem = this.createTreeItem();
        this.createChildren();
    }

    private createTreeItem(): vscode.TreeItem {
        const item = new vscode.TreeItem(
            this.sectionTitle,
            this.pullRequests.length > 0
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.Collapsed,
        );
        item.contextValue = PullRequestContextValue;
        return item;
    }

    private createChildren(): void {
        this.children = this.pullRequests.map((pr) => new PullRequestTitlesNode(pr, true));
    }

    getTreeItem(): vscode.TreeItem {
        return this.treeItem;
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        if (element) {
            return element.getChildren();
        }

        if (this.children.length === 0) {
            return [new SimpleNode('No pull requests found')];
        }

        return this.children;
    }
}
