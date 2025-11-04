import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { showIssue } from 'src/commands/jira/showIssue';
import { QuickPick, window } from 'vscode';

import { DetailedSiteInfo, ProductJira } from '../../atlclients/authInfo';
import { Container } from '../../container';
import { JiraIssueService } from './JiraIssueService';
import { JiraUserService } from './JiraUserService';
import { QuickPickIssue, QuickPickUser, QuickPickUtils } from './QuickPickUtils';

export class AssigneeFilterProvider {
    static currentToken = 0;
    static fetchTimeout: NodeJS.Timeout | undefined;
    static persistentSelectedItems: QuickPickUser[] = [];
    static previousSelectedItems: QuickPickUser[] = [];

    public static async create(): Promise<void> {
        const sites = this.getAvailableSites();
        if (!sites.length) {
            return;
        }

        const quickPick = window.createQuickPick<QuickPickUser>();
        quickPick.title = 'Filter by Assignee - Select Users';
        quickPick.placeholder = 'Search for assignees';
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;
        quickPick.canSelectMany = true;
        quickPick.items = QuickPickUtils.getDefaultAssigneeOptions(this.previousSelectedItems);
        quickPick.selectedItems = [];

        quickPick.show();

        quickPick.onDidHide(() => {
            if (this.fetchTimeout) {
                clearTimeout(this.fetchTimeout);
                this.fetchTimeout = undefined;
            }
            quickPick.dispose();
        });

        quickPick.onDidChangeValue((value) => this.handleSearchInput(value, quickPick, sites));
        quickPick.onDidAccept(() => this.handleUserAccept(quickPick));
        quickPick.onDidChangeSelection((selected) => this.handleSelectionChange(selected));
    }

    static handleSearchInput(value: string, quickPick: QuickPick<QuickPickUser>, sites: DetailedSiteInfo[]) {
        if (this.fetchTimeout) {
            clearTimeout(this.fetchTimeout);
        }

        const persistentItems = this.persistentSelectedItems;

        if (!value.trim()) {
            this.currentToken++;

            const defaultOptions = QuickPickUtils.getDefaultAssigneeOptions(this.previousSelectedItems);
            const mergedItems = QuickPickUtils.mergeItemsWithPersistent(persistentItems, defaultOptions);

            quickPick.title = 'Filter by Assignee - Select Users';
            quickPick.placeholder = 'Search for assignees';
            quickPick.busy = false;
            quickPick.items = mergedItems;
            quickPick.selectedItems = persistentItems;

            return;
        }

        this.fetchTimeout = setTimeout(() => {
            this.searchUsers(value, quickPick, sites);
        }, 300);
    }

    static async handleUserAccept(quickPick: QuickPick<QuickPickUser>) {
        const selected = this.persistentSelectedItems;

        if (selected.length > 0) {
            quickPick.hide();

            await this.fetchAssignedIssues(selected);

            this.previousSelectedItems = [...selected];
            this.persistentSelectedItems = [];
        }
    }

    static handleSelectionChange(selected: readonly QuickPickUser[]) {
        this.persistentSelectedItems = [...selected];
    }

    static async searchUsers(query: string, quickPick: QuickPick<QuickPickUser>, sites: DetailedSiteInfo[]) {
        quickPick.busy = true;
        quickPick.placeholder = `Searching for "${query}"...`;

        const token = ++this.currentToken;

        try {
            const users = await JiraUserService.searchUsersFromAllSites(query, sites);

            if (token !== this.currentToken) {
                return;
            }

            const quickPickItems: QuickPickUser[] = QuickPickUtils.mapUsersToQuickPickItems(users);
            const persistentItems = this.persistentSelectedItems;

            if (quickPickItems.length > 0) {
                const mergedItems = QuickPickUtils.mergeItemsWithPersistent(persistentItems, quickPickItems);
                quickPick.title = `Filter by Assignee - Search Results (${quickPickItems.length})`;
                quickPick.placeholder = `Search results for "${query}"`;
                quickPick.items = mergedItems;
                quickPick.selectedItems = persistentItems;
            } else {
                quickPick.title = 'Filter by Assignee - No Results Found';
                quickPick.placeholder = `No users found for "${query}"`;
                quickPick.items = persistentItems;
                quickPick.selectedItems = persistentItems;
            }
        } finally {
            quickPick.busy = false;
        }
    }

    static async fetchAssignedIssues(selectedUsers: readonly QuickPickUser[]): Promise<void> {
        const filterParams = QuickPickUtils.extractFilterParameters(selectedUsers);
        if (!QuickPickUtils.isValidFilter(filterParams)) {
            return;
        }

        const sites = this.getAvailableSites();
        if (!sites.length) {
            return;
        }

        const issuesQuickPick = window.createQuickPick<QuickPickIssue>();
        const userNames = selectedUsers.map((u) => u.label).join(', ');
        issuesQuickPick.title = `Issues Assigned to ${userNames}`;
        issuesQuickPick.placeholder = 'Fetching issues...';
        issuesQuickPick.matchOnDescription = true;
        issuesQuickPick.matchOnDetail = true;
        issuesQuickPick.canSelectMany = false;
        issuesQuickPick.items = [];
        issuesQuickPick.busy = true;

        issuesQuickPick.show();

        issuesQuickPick.onDidHide(() => {
            issuesQuickPick.dispose();
        });
        this.setupIssueSelectionHandler(issuesQuickPick);

        try {
            const issues = await JiraIssueService.getAssignedIssuesFromAllSites(
                filterParams.regularUsers,
                sites,
                filterParams.hasUnassigned,
            );
            this.displayIssues(issuesQuickPick, issues, userNames);
        } catch (error) {
            this.displayError(issuesQuickPick, error);
        }
    }

    static getAvailableSites(): DetailedSiteInfo[] {
        const sites = Container.siteManager.getSitesAvailable(ProductJira);
        if (sites.length === 0) {
            window.showInformationMessage('No Jira sites connected.');
        }
        return sites;
    }

    static displayIssues(
        quickPick: QuickPick<QuickPickIssue>,
        issues: MinimalIssue<DetailedSiteInfo>[],
        userNames: string,
    ): void {
        if (issues.length === 0) {
            this.displayEmptyState(quickPick, userNames);
            return;
        }
        quickPick.title = `Issues Assigned to ${userNames} (${issues.length})`;
        quickPick.placeholder = `Found ${issues.length} issues`;
        quickPick.items = QuickPickUtils.mapIssuesToQuickPickItems(issues);
        quickPick.busy = false;
    }

    private static displayEmptyState(quickPick: QuickPick<QuickPickIssue>, userNames: string): void {
        quickPick.items = [
            {
                label: 'No Issues Found',
                description: 'No issues assigned to selected users',
                detail: 'Try selecting different users or check if they have any assigned issues',
                issue: null as any,
            },
        ];
        quickPick.title = `Issues Assigned to ${userNames} (0)`;
        quickPick.placeholder = 'No issues found';
        quickPick.busy = false;
    }

    private static displayError(quickPick: QuickPick<QuickPickIssue>, error: unknown): void {
        quickPick.items = [
            {
                label: 'Error Loading Issues',
                description: 'Failed to fetch issues',
                detail: 'Please try again or check your connection',
                issue: null as any,
            },
        ];
        quickPick.title = 'Error Loading Issues';
        quickPick.placeholder = 'Failed to load issues';
        quickPick.busy = false;
    }

    private static setupIssueSelectionHandler(quickPick: QuickPick<QuickPickIssue>): void {
        quickPick.onDidAccept(async () => {
            const selected = quickPick.selectedItems[0];
            if (!selected?.issue) {
                return;
            }

            quickPick.hide();
            await showIssue(selected.issue);
        });
    }
}
