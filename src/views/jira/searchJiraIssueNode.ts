import { MinimalORIssueLink } from '@atlassianlabs/jira-pi-common-models';
import { TreeItem, TreeItemCollapsibleState } from 'vscode';

import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { Commands } from '../../commands';
import { Resources } from '../../resources';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';

export class SearchJiraIssuesNode extends AbstractBaseNode {
    private _searchableIssueList: MinimalORIssueLink<DetailedSiteInfo>[] | undefined;

    setIssues(searchableIssueList: MinimalORIssueLink<DetailedSiteInfo>[]) {
        this._searchableIssueList = searchableIssueList;
    }

    getIssues() {
        return this._searchableIssueList!;
    }

    getTreeItem(): TreeItem {
        const treeItem = new TreeItem('Search issue results', TreeItemCollapsibleState.None);
        treeItem.iconPath = Resources.icons.get('search');

        treeItem.command = {
            command: Commands.JiraSearchIssues,
            title: 'Search Jira Issues',
        };

        return treeItem;
    }
}
