import { MinimalORIssueLink } from '@atlassianlabs/jira-pi-common-models';
import { searchIssuesEvent } from '../../analytics';
import { DetailedSiteInfo, ProductJira } from '../../atlclients/authInfo';
import { Commands } from '../../commands';
import { Container } from '../../container';
import { commands, QuickPickItem, window } from 'vscode';

interface QuickPickIssue extends QuickPickItem {
    issue: MinimalORIssueLink<DetailedSiteInfo>;
}

export class SearchJiraHelper {
    static initialize() {
        this._searchableIssueMap = {};
        commands.registerCommand(Commands.JiraSearchIssues, () => this.createIssueQuickPick());
    }

    private static _searchableIssueMap: Record<string, MinimalORIssueLink<DetailedSiteInfo>[]>;
    static get searchableIssueMap() {
        return this._searchableIssueMap;
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
                        description: issue.summary,
                        issue: issue,
                    });
                }
            });
        });

        window
            .showQuickPick<QuickPickIssue>(quickPickIssues, {
                matchOnDescription: true,
                placeHolder: 'Search for issue key or summary',
            })
            .then((quickPickIssue: QuickPickIssue | undefined) => {
                if (quickPickIssue) {
                    commands.executeCommand(Commands.ShowIssue, quickPickIssue.issue);
                }
            });
    }
}
