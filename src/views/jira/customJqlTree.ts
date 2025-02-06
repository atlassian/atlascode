import { JQLEntry } from 'src/config/model';
import { Disposable, TreeItem, TreeItemCollapsibleState, l10n } from 'vscode';
import { Container } from '../../container';
import { MAX_RESULTS } from '../../jira/issuesForJql';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import { IssueNode } from '../nodes/issueNode';
import { JQLTreeDataProvider } from './jqlTreeDataProvider';

export class CustomJQLTree extends JQLTreeDataProvider implements AbstractBaseNode {
    public readonly disposables: Disposable[] = [];
    private _numIssues: number;

    constructor(readonly jqlEntry: JQLEntry) {
        super(undefined, l10n.t('No issues match this query'));
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
                item.description = l10n.t('{0}+ Issues', this._numIssues);
            } else if (this._numIssues === 1) {
                item.description = l10n.t('1 Issue');
            } else {
                item.description = l10n.t('{0} Issues', this._numIssues);
            }
        } else {
            item.description = l10n.t('No Issues Found');
        }
        return item;
    }
}
