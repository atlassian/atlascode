import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { commands, QuickPick, QuickPickItem, window } from 'vscode';

import { DetailedSiteInfo, ProductJira } from '../../atlclients/authInfo';
import { Commands } from '../../constants';
import { Container } from '../../container';
import { issuesForJQL } from '../../jira/issuesForJql';
interface QuickPickIssue extends QuickPickItem {
    issue: MinimalIssue<DetailedSiteInfo>;
}
export class SearchAllJiraHelper {
    static currentToken = 0;
    static searchTimeout: NodeJS.Timeout | undefined;

    public static initialize(): void {
        commands.registerCommand(Commands.JiraSearchAllIssues, () => {
            this.createAllIssuesQuickPick();
        });
    }
    private static async createAllIssuesQuickPick(): Promise<void> {
        const sites = Container.siteManager.getSitesAvailable(ProductJira);
        if (sites.length === 0) {
            window.showInformationMessage('No Jira sites connected. Please connect to a Jira site first.');
            return;
        }

        const quickPick = window.createQuickPick<QuickPickIssue>();
        quickPick.placeholder = 'Search for issue key or summary across all connected sites';
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;
        quickPick.show();

        quickPick.onDidChangeValue((value) => this.handleInputChange(value, quickPick, sites));

        quickPick.onDidHide(() => {
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = undefined;
            }
            quickPick.dispose();
        });

        quickPick.onDidAccept(() => this.handleAccept(quickPick));
    }

    static handleInputChange(value: string, quickPick: QuickPick<QuickPickIssue>, sites: DetailedSiteInfo[]) {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        this.searchTimeout = setTimeout(() => {
            this.executeSearch(value, quickPick, sites);
        }, 400);
    }

    static async executeSearch(value: string, quickPick: QuickPick<QuickPickIssue>, sites: DetailedSiteInfo[]) {
        quickPick.busy = true;

        if (!value.trim()) {
            this.currentToken++;
            quickPick.items = [];
            quickPick.busy = false;
            quickPick.title = '';
            return;
        }
        const token = ++this.currentToken;

        const jql = this.buildJqlQuery(value);
        try {
            const issues = await this.fetchIssuesFromAllSites(jql, sites);
            if (token !== this.currentToken) {
                return;
            }

            const quickPickItems: QuickPickIssue[] = this.mapToQuickPickItems(issues);

            if (quickPickItems.length > 0) {
                quickPick.title = `Search Results (${quickPickItems.length})`;
            } else {
                quickPick.title = `No results found`;
            }

            quickPick.items = quickPickItems;

            if (quickPickItems.length > 0) {
                quickPick.activeItems = [quickPickItems[0]];
            }
        } finally {
            quickPick.busy = false;
        }
    }

    static async fetchIssuesFromAllSites(
        jql: string,
        sites: DetailedSiteInfo[],
    ): Promise<MinimalIssue<DetailedSiteInfo>[]> {
        const allIssues = await Promise.all(
            sites.map(async (site) => {
                try {
                    return await issuesForJQL(jql, site);
                } catch (error) {
                    console.error(`Failed to search in ${site.host}:`, error);
                    return [];
                }
            }),
        );

        return allIssues.flat();
    }

    static mapToQuickPickItems(issues: MinimalIssue<DetailedSiteInfo>[]): QuickPickIssue[] {
        return issues.map((issue) => ({
            label: issue.key,
            description: `${issue.summary ?? ''} (${issue.siteDetails.host})`,
            issue,
        }));
    }

    static handleAccept(quickPick: QuickPick<QuickPickIssue>) {
        const selected = quickPick.selectedItems[0];
        if (selected) {
            quickPick.hide();
            commands.executeCommand(Commands.ShowIssue, selected.issue);
        }
    }

    static buildJqlQuery(query: string): string {
        const trimmedQuery = query.trim();
        return `(summary ~ "${trimmedQuery}*" OR key = "${trimmedQuery}") ORDER BY updated DESC`;
    }
}
