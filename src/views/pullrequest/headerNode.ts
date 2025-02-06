import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { Commands } from '../../commands';
import { Resources } from '../../resources';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import { l10n } from 'vscode';

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
            return l10n.t('Showing open pull requests');
        case PullRequestFilters.CreatedByMe:
            return l10n.t('Showing pull requests created by me');
        case PullRequestFilters.ToReview:
            return l10n.t('Showing pull requests to review');
        case PullRequestFilters.Merged:
            return l10n.t('Showing merged pull requests');
        case PullRequestFilters.Declined:
            return l10n.t('Showing declined pull requests');
    }
}

export class PullRequestHeaderNode extends AbstractBaseNode {
    constructor(public filterType: PullRequestFilters) {
        super();
    }

    getTreeItem(): TreeItem {
        let treeItem = new TreeItem('', TreeItemCollapsibleState.None);
        treeItem.label = getPullRequestFilterDescription(this.filterType);
        treeItem.description = l10n.t('click to change filter');
        treeItem.iconPath = Resources.icons.get('preferences');

        treeItem.command = {
            command: Commands.BitbucketPullRequestFilters,
            title: l10n.t('Show Bitbucket explorer filters'),
        };

        return treeItem;
    }
}

export class CreatePullRequestNode extends AbstractBaseNode {
    getTreeItem(): TreeItem {
        let treeItem = new TreeItem(l10n.t('Create pull request...'), TreeItemCollapsibleState.None);
        treeItem.iconPath = Resources.icons.get('pullrequests');

        treeItem.command = {
            command: Commands.CreatePullRequest,
            title: l10n.t('Create pull request'),
        };

        return treeItem;
    }
}
