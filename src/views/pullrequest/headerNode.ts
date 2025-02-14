import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { Commands } from '../../commands';
import { Resources } from '../../resources';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';

export enum PullRequestFilters {
    Open = 'open',
    CreatedByMe = 'createdByMe',
    ToReview = 'toReview',
    Merged = 'merged',
    Declined = 'declined',
}

function getPullRequestFilterDescription(filterType: PullRequestFilters): string {
    switch (filterType) {
        case PullRequestFilters.Open:
            return 'Showing open pull requests';
        case PullRequestFilters.CreatedByMe:
            return 'Showing pull requests created by me';
        case PullRequestFilters.ToReview:
            return 'Showing pull requests to review';
        case PullRequestFilters.Merged:
            return 'Showing merged pull requests';
        case PullRequestFilters.Declined:
            return 'Showing declined pull requests';
    }
}

export class PullRequestHeaderNode extends AbstractBaseNode {
    constructor(public filterType: PullRequestFilters) {
        super();
    }

    getTreeItem(): TreeItem {
        const treeItem = new TreeItem('', TreeItemCollapsibleState.None);
        treeItem.label = getPullRequestFilterDescription(this.filterType);
        treeItem.description = 'click to change filter';
        treeItem.iconPath = Resources.icons.get('preferences');

        treeItem.command = {
            command: Commands.BitbucketPullRequestFilters,
            title: 'Show Bitbucket explorer filters',
        };

        return treeItem;
    }
}

export class CreatePullRequestNode extends AbstractBaseNode {
    getTreeItem(): TreeItem {
        const treeItem = new TreeItem('Create pull request...', TreeItemCollapsibleState.None);
        treeItem.iconPath = Resources.icons.get('pullrequests');

        treeItem.command = {
            command: Commands.CreatePullRequest,
            title: 'Create pull request',
        };

        return treeItem;
    }
}
