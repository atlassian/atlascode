import { MinimalORIssueLink } from '@atlassianlabs/jira-pi-common-models';
import { commands, QuickPickItem, ThemeIcon, window } from 'vscode';

import { searchIssuesEvent } from '../../analytics';
import { DetailedSiteInfo, ProductJira } from '../../atlclients/authInfo';
import { AssignedJiraItemsViewId, Commands } from '../../constants';
import { Container } from '../../container';

interface QuickPickIssue extends QuickPickItem {
    issue: MinimalORIssueLink<DetailedSiteInfo> | null;
    searchTerm?: string;
}

export class SearchJiraHelper {
    private static _searchableIssueMap: Record<string, MinimalORIssueLink<DetailedSiteInfo>[]> = {};

    static initialize() {
        commands.registerCommand(Commands.JiraSearchIssues, () => this.createIssueQuickPick());
    }

    /***
     * Set the issues for a specific data provider in the SearchJiraHelper.
     * This is where `Commands.JiraSearchIssues` will look for issues to display
     * @param flattenedIssueList - List of fetched issues
     * @param dataProviderId - Id of the data provider (i.e. CustomJqlViewProvider.viewId())
     */
    static setIssues(flattenedIssueList: MinimalORIssueLink<DetailedSiteInfo>[], dataProviderId: string) {
        this._searchableIssueMap[dataProviderId] = flattenedIssueList;
    }

    /***
     * Append the issues for a specific data provider in the SearchJiraHelper.
     * This is where `Commands.JiraSearchIssues` will look for issues to display
     * @param flattenedIssueList - List of fetched issues
     * @param dataProviderId - Id of the data provider (i.e. CustomJqlViewProvider.viewId())
     */
    static appendIssues(flattenedIssueList: MinimalORIssueLink<DetailedSiteInfo>[], dataProviderId: string) {
        this._searchableIssueMap[dataProviderId] = this._searchableIssueMap[dataProviderId] || [];
        this._searchableIssueMap[dataProviderId].push(...flattenedIssueList);
    }

    /***
     * Clear the issues for a specific data provider in the SearchJiraHelper.
     * If no dataProviderId is provided, all issues will be cleared
     * @param dataProviderId - Id of the data provider (i.e. CustomJqlViewProvider.viewId())
     */
    static clearIssues(dataProviderId?: string) {
        if (dataProviderId) {
            this._searchableIssueMap[dataProviderId] = [];
            return;
        }

        this._searchableIssueMap = {};
    }

    static findIssue(issueKey: string): MinimalORIssueLink<DetailedSiteInfo> | undefined {
        for (const issuesList of Object.values(this._searchableIssueMap)) {
            for (const issue of issuesList) {
                if (issue.key === issueKey) {
                    return issue;
                }
            }
        }

        return undefined;
    }

    static getAssignedIssuesPerSite(siteId: string): MinimalORIssueLink<DetailedSiteInfo>[] {
        const assignedIssues = this._searchableIssueMap[AssignedJiraItemsViewId] || [];
        const assignedIssuesForSite = assignedIssues.filter((issue) => issue.siteDetails.id === siteId);
        return assignedIssuesForSite;
    }

    // This method is called when the user clicks on the "Search Jira" button in the Jira Tree View
    private static createIssueQuickPick() {
        searchIssuesEvent(ProductJira).then((e) => {
            Container.analyticsClient.sendTrackEvent(e);
        });

        const issueSet = new Set<string>();
        const quickPickIssues: QuickPickIssue[] = [];

        Object.values(this._searchableIssueMap).forEach((issueArray) => {
            issueArray.forEach((issue) => {
                if (!issueSet.has(issue.key)) {
                    issueSet.add(issue.key);
                    quickPickIssues.push({
                        label: issue.key,
                        description: issue.status.name,
                        detail: issue.summary,
                        issue: issue,
                    });
                }
            });
        });

        const quickPick = window.createQuickPick<QuickPickIssue>();
        quickPick.matchOnDetail = true;
        quickPick.placeholder = 'Search Jira work items locally';

        const searchAllOption: QuickPickIssue = {
            label: '',
            description: 'Search all Jira work items',
            iconPath: new ThemeIcon('search'),
            issue: null,
            searchTerm: '',
            alwaysShow: true,
        };

        quickPick.items = [...quickPickIssues, searchAllOption];

        quickPick.onDidChangeValue((value) => {
            const searchAllOption = quickPick.items.find((item) => 'searchTerm' in item);
            if (!searchAllOption) {
                return;
            }
            searchAllOption.searchTerm = value;
        });

        quickPick.onDidAccept(() => {
            const selectedItem = quickPick.selectedItems[0];
            if (!selectedItem) {
                return;
            }

            if ('searchTerm' in selectedItem) {
                selectedItem.searchTerm
                    ? commands.executeCommand(Commands.JiraSearchAllIssues, selectedItem.searchTerm)
                    : commands.executeCommand(Commands.JiraSearchAllIssues);
            } else {
                commands.executeCommand(Commands.ShowIssue, selectedItem.issue);
            }
            quickPick.hide();
        });

        quickPick.show();
    }
}
