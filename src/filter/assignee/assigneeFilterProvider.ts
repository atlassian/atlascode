import { User } from '@atlassianlabs/jira-pi-common-models';
import { commands, QuickPick, window } from 'vscode';

import { DetailedSiteInfo, ProductJira } from '../../atlclients/authInfo';
import { currentUserJira } from '../../commands/jira/currentUser';
import { Commands } from '../../constants';
import { Container } from '../../container';
import { TreeViewIssue } from '../../views/jira/treeViews/utils';
import { JiraIssueService } from './JiraIssueService';
import { JiraUserService } from './JiraUserService';
import { QuickPickUser, QuickPickUtils } from './QuickPickUtils';

export class AssigneeFilterProvider {
    static currentToken = 0;
    static fetchTimeout: NodeJS.Timeout | undefined;
    static persistentSelectedItems: QuickPickUser[] = [];
    static previousSelectedItems: QuickPickUser[] = [];
    static currentUser: User | null = null;

    public static async create(): Promise<void> {
        const sites = this.getAvailableSites();
        if (!sites.length) {
            return;
        }

        try {
            this.currentUser = await currentUserJira(sites[0]);
        } catch (error) {
            console.error('Failed to fetch current user:', error);
            this.currentUser = null;
        }

        const quickPick = window.createQuickPick<QuickPickUser>();
        quickPick.title = 'Filter by Assignee - Select Users';
        quickPick.placeholder = 'Search for assignees';
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;
        quickPick.canSelectMany = true;
        quickPick.items = QuickPickUtils.getDefaultAssigneeOptions(this.previousSelectedItems, this.currentUser);
        quickPick.selectedItems = [];

        quickPick.show();

        quickPick.onDidHide(() => {
            if (this.fetchTimeout) {
                clearTimeout(this.fetchTimeout);
                this.fetchTimeout = undefined;
            }
            quickPick.dispose();
        });

        quickPick.onDidChangeValue((value) => this.handleSearchInput(value, quickPick, sites, this.currentUser));
        quickPick.onDidAccept(() => this.handleUserAccept(quickPick));
        quickPick.onDidChangeSelection((selected) => this.handleSelectionChange(selected));
    }

    static handleSearchInput(
        value: string,
        quickPick: QuickPick<QuickPickUser>,
        sites: DetailedSiteInfo[],
        currentUser: User | null,
    ) {
        if (this.fetchTimeout) {
            clearTimeout(this.fetchTimeout);
        }

        const persistentItems = this.persistentSelectedItems;

        if (!value.trim()) {
            this.currentToken++;

            const defaultOptions = QuickPickUtils.getDefaultAssigneeOptions(this.previousSelectedItems, currentUser);
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
        const filterParams = QuickPickUtils.extractFilterParameters(selectedUsers, this.currentUser);
        if (!QuickPickUtils.isValidFilter(filterParams)) {
            return;
        }

        const sites = this.getAvailableSites();
        if (!sites.length) {
            return;
        }

        const selectedUsersCount = filterParams.regularUsers.length + (filterParams.hasCurrentUser ? 1 : 0);

        Container.assignedWorkItemsView.setFilteredIssues([], selectedUsersCount);
        commands.executeCommand(Commands.RefreshAssignedWorkItemsExplorer);
        Container.assignedWorkItemsView.focus();

        try {
            const issues = await JiraIssueService.getAssignedIssuesFromAllSites(
                filterParams.regularUsers,
                sites,
                filterParams.hasCurrentUser,
            );

            const treeViewIssues: TreeViewIssue[] = issues.map((issue) => ({
                ...issue,
                source: { id: 'filtered-assignee' },
                children: [],
            }));

            Container.assignedWorkItemsView.setFilteredIssues(treeViewIssues, selectedUsersCount);
            commands.executeCommand(Commands.RefreshAssignedWorkItemsExplorer);
        } catch (error) {
            Container.assignedWorkItemsView.setFilteredIssues(null);
            commands.executeCommand(Commands.RefreshAssignedWorkItemsExplorer);
            window.showErrorMessage(
                `Failed to fetch issues: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    static getAvailableSites(): DetailedSiteInfo[] {
        const sites = Container.siteManager.getSitesAvailable(ProductJira);
        if (sites.length === 0) {
            window.showInformationMessage('No Jira sites connected.');
        }
        return sites;
    }
}
