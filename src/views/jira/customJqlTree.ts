import { JQLEntry } from 'src/config/model';
import { Disposable, TreeItem, TreeItemCollapsibleState } from 'vscode';
import { Container } from '../../container';
import { MAX_RESULTS } from '../../jira/issuesForJql';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import { IssueNode } from '../nodes/issueNode';
import { JQLTreeDataProvider } from './jqlTreeDataProvider';

export class CustomJQLTree extends JQLTreeDataProvider implements AbstractBaseNode {
    public readonly disposables: Disposable[] = [];
    private _numIssues: number | undefined;

    constructor(readonly jqlEntry: JQLEntry) {
        super(undefined, 'No issues match this query');
        this.setJqlEntry(this.jqlEntry);
    }

    getParent() {
        return undefined;
    }

    async getChildren(parent?: IssueNode, allowFetch: boolean = true): Promise<IssueNode[]> {
        return super.getChildren(undefined, allowFetch);
    }

    setNumIssues(issueCount: number): void {
        this._numIssues = issueCount;
    }

    getTreeItem(): TreeItem {
        const item = new TreeItem(this.jqlEntry.name);
        item.tooltip = this.jqlEntry.query;
        item.collapsibleState = TreeItemCollapsibleState.Collapsed;
        if (!!this._numIssues) {
            if (this._numIssues === MAX_RESULTS && !Container.config.jira.explorer.fetchAllQueryResults) {
                item.description = `${this._numIssues}+ Issues`;
            } else if (this._numIssues === 1) {
                item.description = `1 Issue`;
            } else {
                item.description = `${this._numIssues} Issues`;
            }
        } else {
            item.description = `No Issues Found`;
        }
        return item;
    }
}
