import { commands, QuickPick, window } from 'vscode';

import { DetailedSiteInfo, ProductJira } from '../../atlclients/authInfo';
import { currentUserJira } from '../../commands/jira/currentUser';
import { Commands } from '../../constants';
import { Container } from '../../container';
import { TreeViewIssue } from '../../views/jira/treeViews/utils';
import { AssigneeFilterProvider } from '../assignee/assigneeFilterProvider';
import { QuickPickUser, QuickPickUtils as AssigneeQuickPickUtils } from '../assignee/QuickPickUtils';
import { JiraIssueService } from '../JiraIssueService';
import { JiraProjectService } from './JiraProjectService';
import { QuickPickProject, QuickPickUtils } from './QuickPickUtils';

export class ProjectFilterProvider {
    static currentToken = 0;
    static fetchTimeout: NodeJS.Timeout | undefined;
    static persistentSelectedItems: QuickPickProject[] = [];
    static previousSelectedItems: QuickPickProject[] = [];

    public static async create(): Promise<void> {
        const sites = this.getAvailableSites();
        if (!sites.length) {
            return;
        }

        const quickPick = window.createQuickPick<QuickPickProject>();
        quickPick.title = 'Filter by Project - Select Projects';
        quickPick.placeholder = 'Search for projects';
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;
        quickPick.canSelectMany = true;
        const defaultOptions = QuickPickUtils.getDefaultProjectOptions(this.previousSelectedItems);
        quickPick.items = QuickPickUtils.mergeItemsWithPersistent(this.persistentSelectedItems, defaultOptions);
        quickPick.selectedItems = this.persistentSelectedItems;

        quickPick.show();

        quickPick.onDidHide(() => {
            if (this.fetchTimeout) {
                clearTimeout(this.fetchTimeout);
                this.fetchTimeout = undefined;
            }
            quickPick.dispose();
        });

        quickPick.onDidChangeValue((value) => this.handleSearchInput(value, quickPick, sites));
        quickPick.onDidAccept(() => this.handleProjectAccept(quickPick));
        quickPick.onDidChangeSelection((selected) => this.handleSelectionChange(selected));
    }

    static handleSearchInput(value: string, quickPick: QuickPick<QuickPickProject>, sites: DetailedSiteInfo[]) {
        if (this.fetchTimeout) {
            clearTimeout(this.fetchTimeout);
        }

        const persistentItems = this.persistentSelectedItems;

        if (!value.trim()) {
            this.currentToken++;

            const defaultOptions = QuickPickUtils.getDefaultProjectOptions(this.previousSelectedItems);
            const mergedItems = QuickPickUtils.mergeItemsWithPersistent(persistentItems, defaultOptions);

            quickPick.title = 'Filter by Project - Select Projects';
            quickPick.placeholder = 'Search for projects';
            quickPick.busy = false;
            quickPick.items = mergedItems;
            quickPick.selectedItems = persistentItems;

            return;
        }

        this.fetchTimeout = setTimeout(() => {
            this.searchProjects(value, quickPick, sites);
        }, 300);
    }

    static async handleProjectAccept(quickPick: QuickPick<QuickPickProject>) {
        const selected = this.persistentSelectedItems;

        quickPick.hide();

        await this.fetchProjectIssues(selected);

        this.previousSelectedItems = [...selected];
    }

    static handleSelectionChange(selected: readonly QuickPickProject[]) {
        this.persistentSelectedItems = [...selected];
    }

    static async searchProjects(query: string, quickPick: QuickPick<QuickPickProject>, sites: DetailedSiteInfo[]) {
        quickPick.busy = true;
        quickPick.placeholder = `Searching for "${query}"...`;

        const token = ++this.currentToken;

        try {
            const projects = await JiraProjectService.searchProjectsFromAllSites(query, sites);

            if (token !== this.currentToken) {
                return;
            }

            const quickPickItems: QuickPickProject[] = QuickPickUtils.mapProjectsToQuickPickItems(projects);
            const persistentItems = this.persistentSelectedItems;

            if (quickPickItems.length > 0) {
                const mergedItems = QuickPickUtils.mergeItemsWithPersistent(persistentItems, quickPickItems);
                quickPick.title = `Filter by Project - Search Results (${quickPickItems.length})`;
                quickPick.placeholder = `Search results for "${query}"`;
                quickPick.items = mergedItems;
                quickPick.selectedItems = persistentItems;
            } else {
                quickPick.title = 'Filter by Project - No Results Found';
                quickPick.placeholder = `No projects found for "${query}"`;
                quickPick.items = persistentItems;
                quickPick.selectedItems = persistentItems;
            }
        } finally {
            quickPick.busy = false;
        }
    }

    static async fetchProjectIssues(selectedProjects: readonly QuickPickProject[]): Promise<void> {
        const filterParams = QuickPickUtils.extractFilterParameters(selectedProjects);

        const sites = this.getAvailableSites();
        if (!sites.length) {
            return;
        }

        let currentUser = AssigneeFilterProvider.currentUser;
        if (!currentUser && sites.length > 0) {
            try {
                currentUser = await currentUserJira(sites[0]);
                AssigneeFilterProvider.currentUser = currentUser;
            } catch (error) {
                console.error('Failed to fetch current user:', error);
                currentUser = null;
            }
        }

        const hasActiveAssigneeFilter = AssigneeFilterProvider.previousSelectedItems.length > 0;

        let assigneeFilterParams: { regularUsers: QuickPickUser[]; hasCurrentUser: boolean } = {
            regularUsers: [],
            hasCurrentUser: !hasActiveAssigneeFilter && currentUser !== null,
        };
        if (hasActiveAssigneeFilter) {
            assigneeFilterParams = AssigneeQuickPickUtils.extractFilterParameters(
                AssigneeFilterProvider.previousSelectedItems,
                currentUser || null,
            );
        }

        const selectedUsersCount =
            assigneeFilterParams.regularUsers.length + (assigneeFilterParams.hasCurrentUser ? 1 : 0);

        Container.assignedWorkItemsView.setFilteredIssues([], selectedUsersCount);
        commands.executeCommand(Commands.RefreshAssignedWorkItemsExplorer);
        Container.assignedWorkItemsView.focus();

        try {
            const issues = await JiraIssueService.getIssuesFromAllSites(sites, {
                projects: filterParams.projects.length > 0 ? filterParams.projects : undefined,
                users: assigneeFilterParams.regularUsers.length > 0 ? assigneeFilterParams.regularUsers : undefined,
                hasCurrentUser: assigneeFilterParams.hasCurrentUser,
            });

            const treeViewIssues: TreeViewIssue[] = issues.map((issue) => ({
                ...issue,
                source: { id: 'filtered-project' },
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
