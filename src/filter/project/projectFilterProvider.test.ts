import { MinimalIssue, Project, User } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo, ProductJira } from 'src/atlclients/authInfo';
import * as vscode from 'vscode';

import { currentUserJira } from '../../commands/jira/currentUser';
import { Container } from '../../container';
import { AssigneeFilterProvider } from '../assignee/assigneeFilterProvider';
import { QuickPickUser } from '../assignee/QuickPickUtils';
import { JiraIssueService } from '../JiraIssueService';
import { JiraProjectService } from './JiraProjectService';
import { ProjectFilterProvider } from './projectFilterProvider';
import { QuickPickIssue, QuickPickProject } from './QuickPickUtils';

jest.mock('../../container', () => ({
    Container: {
        siteManager: {
            getSitesAvailable: jest.fn(),
        },
        clientManager: {
            jiraClient: jest.fn(),
        },
        jiraSettingsManager: {
            getEpicFieldsForSite: jest.fn(),
            getMinimalIssueFieldIdsForSite: jest.fn(),
        },
        jiraProjectManager: {
            getProjects: jest.fn(),
        },
        assignedWorkItemsView: {
            setFilteredIssues: jest.fn(),
            focus: jest.fn(),
        },
    },
}));

jest.mock('../../commands/jira/currentUser', () => ({
    currentUserJira: jest.fn(),
}));

jest.mock('./JiraProjectService');
jest.mock('../JiraIssueService');
jest.mock('../assignee/assigneeFilterProvider', () => ({
    AssigneeFilterProvider: {
        currentUser: null,
        previousSelectedItems: [],
    },
}));

const createMockSite = (id: string, host: string): DetailedSiteInfo => ({
    id,
    host,
    name: `Site ${id}`,
    avatarUrl: `https://${host}/avatar.png`,
    baseLinkUrl: `https://${host}`,
    baseApiUrl: `https://${host}/rest/api/3`,
    isCloud: true,
    credentialId: `cred-${id}`,
    userId: `user-${id}`,
    product: ProductJira,
});

const createMockProject = (key: string, name: string): Project =>
    ({
        key,
        name,
        id: key,
        self: `https://test.atlassian.net/rest/api/3/project/${key}`,
        projectTypeKey: 'software',
        simplified: false,
        style: 'next-gen',
        isPrivate: false,
    }) as Project;

const createMockUser = (accountId: string, displayName: string, email: string): User => ({
    accountId,
    displayName,
    emailAddress: email,
    active: true,
    self: `https://test.atlassian.net/rest/api/3/user?accountId=${accountId}`,
    avatarUrls: {
        '48x48': `https://test.atlassian.net/avatar/${accountId}`,
        '24x24': `https://test.atlassian.net/avatar/${accountId}`,
        '16x16': `https://test.atlassian.net/avatar/${accountId}`,
        '32x32': `https://test.atlassian.net/avatar/${accountId}`,
    },
    timeZone: 'UTC',
    key: undefined,
});

const createMockIssue = (key: string, summary: string, site: DetailedSiteInfo): MinimalIssue<DetailedSiteInfo> => ({
    key,
    summary,
    id: key,
    self: `${site.baseApiUrl}/issue/${key}`,
    created: new Date(),
    updated: new Date(),
    description: '',
    descriptionHtml: '',
    siteDetails: site,
    status: { name: 'To Do' } as any,
    priority: { name: 'High' } as any,
    issuetype: { name: 'Bug' } as any,
    subtasks: [],
    issuelinks: [],
    transitions: [],
    isEpic: false,
    epicLink: '',
    epicName: '',
    epicChildren: [],
});

const createMockQuickPick = <T extends vscode.QuickPickItem>() => ({
    title: '',
    placeholder: '',
    value: '',
    busy: false,
    items: [] as T[],
    activeItems: [] as T[],
    selectedItems: [] as T[],
    canSelectMany: false,
    matchOnDescription: false,
    matchOnDetail: false,
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
    onDidChangeValue: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    onDidAccept: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    onDidChangeSelection: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    onDidHide: jest.fn().mockReturnValue({ dispose: jest.fn() }),
});

describe('ProjectFilterProvider', () => {
    let mockQuickPick: ReturnType<typeof createMockQuickPick>;
    let mockIssuesQuickPick: ReturnType<typeof createMockQuickPick>;
    let mockSite1: DetailedSiteInfo;
    let mockSite2: DetailedSiteInfo;
    let mockProject1: Project;
    let mockProject2: Project;
    let mockUser1: User;
    let mockIssue1: MinimalIssue<DetailedSiteInfo>;
    let mockIssue2: MinimalIssue<DetailedSiteInfo>;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        ProjectFilterProvider['currentToken'] = 0;
        ProjectFilterProvider['fetchTimeout'] = undefined;
        ProjectFilterProvider['persistentSelectedItems'] = [];
        ProjectFilterProvider['previousSelectedItems'] = [];
        AssigneeFilterProvider.currentUser = null;
        AssigneeFilterProvider.previousSelectedItems = [];

        mockSite1 = createMockSite('1', 'test1.atlassian.net');
        mockSite2 = createMockSite('2', 'test2.atlassian.net');

        mockProject1 = createMockProject('PROJ1', 'Project One');
        mockProject2 = createMockProject('PROJ2', 'Project Two');

        mockUser1 = createMockUser('user-1', 'John Doe', 'john@example.com');

        mockIssue1 = createMockIssue('PROJ1-1', 'Test Issue 1', mockSite1);
        mockIssue2 = createMockIssue('PROJ2-1', 'Test Issue 2', mockSite2);

        mockQuickPick = createMockQuickPick<QuickPickProject>();
        mockIssuesQuickPick = createMockQuickPick<QuickPickIssue>();
        jest.spyOn(vscode.window, 'createQuickPick').mockImplementation(
            (() => {
                let callCount = 0;
                return () => {
                    callCount++;
                    return callCount === 1 ? (mockQuickPick as any) : (mockIssuesQuickPick as any);
                };
            })() as any,
        );

        jest.spyOn(vscode.window, 'showInformationMessage').mockImplementation();
        jest.spyOn(vscode.window, 'showErrorMessage').mockImplementation();
        jest.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);

        jest.mocked(Container.siteManager.getSitesAvailable).mockReturnValue([mockSite1, mockSite2]);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    describe('create', () => {
        it('should show info message if no Jira sites are available', async () => {
            jest.mocked(Container.siteManager.getSitesAvailable).mockReturnValue([]);

            await ProjectFilterProvider.create();

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('No Jira sites connected.');
            expect(vscode.window.createQuickPick).not.toHaveBeenCalled();
        });

        it('should include previous selected items in default options', async () => {
            const previousProject: QuickPickProject = {
                label: 'Previous Project',
                description: 'PREV',
                detail: 'Standard',
                project: mockProject1,
            };
            ProjectFilterProvider['previousSelectedItems'] = [previousProject];

            await ProjectFilterProvider.create();

            expect(mockQuickPick.items).toEqual(
                expect.arrayContaining([expect.objectContaining({ label: 'Previous Project' })]),
            );
        });
    });

    describe('handleSearchInput', () => {
        beforeEach(async () => {
            await ProjectFilterProvider.create();
        });

        it('should reset to default options when input is empty', () => {
            const changeValueHandler = mockQuickPick.onDidChangeValue.mock.calls[0][0];

            changeValueHandler('');

            expect(mockQuickPick.title).toBe('Filter by Project - Select Projects');
            expect(mockQuickPick.placeholder).toBe('Search for projects');
            expect(mockQuickPick.busy).toBe(false);
        });
    });

    describe('searchProjects', () => {
        beforeEach(async () => {
            await ProjectFilterProvider.create();
        });

        it('should update QuickPick with search results', async () => {
            jest.mocked(JiraProjectService.searchProjectsFromAllSites).mockResolvedValue([mockProject1, mockProject2]);

            const changeValueHandler = mockQuickPick.onDidChangeValue.mock.calls[0][0];
            changeValueHandler('proj');
            jest.advanceTimersByTime(300);

            await Promise.resolve();

            expect(mockQuickPick.busy).toBe(false);
            expect(mockQuickPick.title).toContain('Search Results (2)');
            expect(mockQuickPick.placeholder).toContain('Search results for "proj"');
            expect(mockQuickPick.items.length).toBeGreaterThan(0);
        });

        it('should show no results message when search returns empty', async () => {
            jest.mocked(JiraProjectService.searchProjectsFromAllSites).mockResolvedValue([]);

            const changeValueHandler = mockQuickPick.onDidChangeValue.mock.calls[0][0];
            changeValueHandler('nonexistent');
            jest.advanceTimersByTime(300);

            await Promise.resolve();

            expect(mockQuickPick.title).toBe('Filter by Project - No Results Found');
            expect(mockQuickPick.placeholder).toContain('No projects found for "nonexistent"');
        });

        it('should merge search results with persistent selected items', async () => {
            const persistentProject: QuickPickProject = {
                label: 'Selected Project',
                description: 'SEL',
                detail: 'Standard',
                project: mockProject1,
            };
            ProjectFilterProvider['persistentSelectedItems'] = [persistentProject];
            jest.mocked(JiraProjectService.searchProjectsFromAllSites).mockResolvedValue([mockProject2]);

            const changeValueHandler = mockQuickPick.onDidChangeValue.mock.calls[0][0];
            changeValueHandler('two');
            jest.advanceTimersByTime(300);

            await Promise.resolve();

            const itemLabels = mockQuickPick.items.map((item) => item.label);
            expect(itemLabels).toContain('Selected Project');
            expect(itemLabels).toContain('Project Two');
            expect(mockQuickPick.selectedItems).toEqual([persistentProject]);
        });
    });

    describe('handleSelectionChange', () => {
        beforeEach(async () => {
            await ProjectFilterProvider.create();
        });

        it('should update persistent selected items', () => {
            const selectedProject: QuickPickProject = {
                label: 'Selected Project',
                description: 'SEL',
                detail: 'Standard',
                project: mockProject1,
            };

            const selectionHandler = mockQuickPick.onDidChangeSelection.mock.calls[0][0];
            selectionHandler([selectedProject]);

            expect(ProjectFilterProvider['persistentSelectedItems']).toEqual([selectedProject]);
        });
    });

    describe('handleProjectAccept', () => {
        beforeEach(async () => {
            await ProjectFilterProvider.create();
        });

        it('should fetch issues even when no projects are selected (all projects)', async () => {
            jest.mocked(JiraIssueService.getIssuesFromAllSites).mockResolvedValue([mockIssue1, mockIssue2]);
            jest.mocked(currentUserJira).mockResolvedValue(mockUser1);

            const acceptHandler = mockQuickPick.onDidAccept.mock.calls[0][0];
            await acceptHandler();

            expect(mockQuickPick.hide).toHaveBeenCalled();
            expect(JiraIssueService.getIssuesFromAllSites).toHaveBeenCalledWith(
                [mockSite1, mockSite2],
                expect.objectContaining({
                    projects: undefined,
                    hasCurrentUser: true, // Current user filter is applied when no projects selected
                }),
            );
        });

        it('should fetch issues when projects are selected', async () => {
            const selectedProject: QuickPickProject = {
                label: 'Project One',
                description: 'PROJ1',
                detail: 'Standard',
                project: mockProject1,
            };
            ProjectFilterProvider['persistentSelectedItems'] = [selectedProject];
            jest.mocked(JiraIssueService.getIssuesFromAllSites).mockResolvedValue([mockIssue1, mockIssue2]);
            jest.mocked(currentUserJira).mockResolvedValue(mockUser1);

            const acceptHandler = mockQuickPick.onDidAccept.mock.calls[0][0];
            await acceptHandler();

            expect(mockQuickPick.hide).toHaveBeenCalled();
            expect(JiraIssueService.getIssuesFromAllSites).toHaveBeenCalledWith(
                [mockSite1, mockSite2],
                expect.objectContaining({
                    projects: [selectedProject],
                    hasCurrentUser: true,
                }),
            );
        });

        it('should move selected items to previous selections and keep persistent items', async () => {
            const selectedProject: QuickPickProject = {
                label: 'Project One',
                description: 'PROJ1',
                detail: 'Standard',
                project: mockProject1,
            };
            ProjectFilterProvider['persistentSelectedItems'] = [selectedProject];
            jest.mocked(JiraIssueService.getIssuesFromAllSites).mockResolvedValue([]);
            jest.mocked(currentUserJira).mockResolvedValue(mockUser1);

            const acceptHandler = mockQuickPick.onDidAccept.mock.calls[0][0];
            await acceptHandler();

            expect(ProjectFilterProvider['previousSelectedItems']).toEqual([selectedProject]);
            expect(ProjectFilterProvider['persistentSelectedItems']).toEqual([selectedProject]);
        });
    });

    describe('fetchProjectIssues', () => {
        beforeEach(async () => {
            await ProjectFilterProvider.create();
        });

        it('should set filtered issues in sidebar and display results', async () => {
            const selectedProject: QuickPickProject = {
                label: 'Project One',
                description: 'PROJ1',
                detail: 'Standard',
                project: mockProject1,
            };
            ProjectFilterProvider['persistentSelectedItems'] = [selectedProject];
            jest.mocked(JiraIssueService.getIssuesFromAllSites).mockResolvedValue([mockIssue1, mockIssue2]);
            jest.mocked(currentUserJira).mockResolvedValue(mockUser1);

            const acceptHandler = mockQuickPick.onDidAccept.mock.calls[0][0];
            await acceptHandler();

            expect(Container.assignedWorkItemsView.setFilteredIssues).toHaveBeenCalledTimes(2);
            expect(Container.assignedWorkItemsView.setFilteredIssues).toHaveBeenNthCalledWith(1, [], 1);
            expect(Container.assignedWorkItemsView.setFilteredIssues).toHaveBeenNthCalledWith(
                2,
                expect.arrayContaining([
                    expect.objectContaining({ key: 'PROJ1-1' }),
                    expect.objectContaining({ key: 'PROJ2-1' }),
                ]),
                1,
            );
            expect(vscode.commands.executeCommand).toHaveBeenCalled();
            expect(Container.assignedWorkItemsView.focus).toHaveBeenCalled();
        });

        it('should display empty state when no issues found', async () => {
            const selectedProject: QuickPickProject = {
                label: 'Project One',
                description: 'PROJ1',
                detail: 'Standard',
                project: mockProject1,
            };
            ProjectFilterProvider['persistentSelectedItems'] = [selectedProject];
            jest.mocked(JiraIssueService.getIssuesFromAllSites).mockResolvedValue([]);
            jest.mocked(currentUserJira).mockResolvedValue(mockUser1);

            const acceptHandler = mockQuickPick.onDidAccept.mock.calls[0][0];
            await acceptHandler();

            expect(Container.assignedWorkItemsView.setFilteredIssues).toHaveBeenCalledTimes(2);
            expect(Container.assignedWorkItemsView.setFilteredIssues).toHaveBeenNthCalledWith(2, [], 1);
        });

        it('should display error state when fetch fails', async () => {
            const selectedProject: QuickPickProject = {
                label: 'Project One',
                description: 'PROJ1',
                detail: 'Standard',
                project: mockProject1,
            };
            ProjectFilterProvider['persistentSelectedItems'] = [selectedProject];
            jest.mocked(JiraIssueService.getIssuesFromAllSites).mockRejectedValue(new Error('Fetch failed'));
            jest.mocked(currentUserJira).mockResolvedValue(mockUser1);

            const acceptHandler = mockQuickPick.onDidAccept.mock.calls[0][0];
            await acceptHandler();

            expect(Container.assignedWorkItemsView.setFilteredIssues).toHaveBeenCalledTimes(2);
            expect(Container.assignedWorkItemsView.setFilteredIssues).toHaveBeenNthCalledWith(1, [], 1);
            expect(Container.assignedWorkItemsView.setFilteredIssues).toHaveBeenNthCalledWith(2, null);
            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Failed to fetch issues: Fetch failed');
        });

        it('should not fetch issues if no sites available', async () => {
            const selectedProject: QuickPickProject = {
                label: 'Project One',
                description: 'PROJ1',
                detail: 'Standard',
                project: mockProject1,
            };
            ProjectFilterProvider['persistentSelectedItems'] = [selectedProject];
            jest.mocked(Container.siteManager.getSitesAvailable).mockReturnValue([]);
            jest.mocked(JiraIssueService.getIssuesFromAllSites).mockResolvedValue([]);

            const acceptHandler = mockQuickPick.onDidAccept.mock.calls[0][0];
            await acceptHandler();

            expect(JiraIssueService.getIssuesFromAllSites).not.toHaveBeenCalled();
            expect(Container.assignedWorkItemsView.setFilteredIssues).not.toHaveBeenCalled();
        });

        it('should handle multiple projects correctly', async () => {
            const selectedProject1: QuickPickProject = {
                label: 'Project One',
                description: 'PROJ1',
                detail: 'Standard',
                project: mockProject1,
            };
            const selectedProject2: QuickPickProject = {
                label: 'Project Two',
                description: 'PROJ2',
                detail: 'Standard',
                project: mockProject2,
            };
            ProjectFilterProvider['persistentSelectedItems'] = [selectedProject1, selectedProject2];
            jest.mocked(JiraIssueService.getIssuesFromAllSites).mockResolvedValue([mockIssue1]);
            jest.mocked(currentUserJira).mockResolvedValue(mockUser1);

            const acceptHandler = mockQuickPick.onDidAccept.mock.calls[0][0];
            await acceptHandler();

            // selectedUsersCount is 1 (current user) since no assignee filter is active
            expect(Container.assignedWorkItemsView.setFilteredIssues).toHaveBeenNthCalledWith(1, [], 1);
            expect(Container.assignedWorkItemsView.setFilteredIssues).toHaveBeenNthCalledWith(
                2,
                expect.arrayContaining([expect.objectContaining({ key: 'PROJ1-1' })]),
                1,
            );
        });

        it('should apply assignee filter when active', async () => {
            const selectedProject: QuickPickProject = {
                label: 'Project One',
                description: 'PROJ1',
                detail: 'Standard',
                project: mockProject1,
            };
            // Use a different user (not the current user) to test assignee filter
            const selectedUser: QuickPickUser = {
                label: 'Jane Smith',
                description: 'jane@example.com',
                detail: 'Active',
                user: createMockUser('user-2', 'Jane Smith', 'jane@example.com'),
            };
            ProjectFilterProvider['persistentSelectedItems'] = [selectedProject];
            AssigneeFilterProvider.previousSelectedItems = [selectedUser];
            AssigneeFilterProvider.currentUser = mockUser1; // Different from selectedUser
            jest.mocked(JiraIssueService.getIssuesFromAllSites).mockResolvedValue([mockIssue1]);

            const acceptHandler = mockQuickPick.onDidAccept.mock.calls[0][0];
            await acceptHandler();

            expect(JiraIssueService.getIssuesFromAllSites).toHaveBeenCalledWith(
                [mockSite1, mockSite2],
                expect.objectContaining({
                    projects: [selectedProject],
                    users: [selectedUser],
                    hasCurrentUser: false,
                }),
            );
        });

        it('should use current user filter when no assignee filter is active', async () => {
            const selectedProject: QuickPickProject = {
                label: 'Project One',
                description: 'PROJ1',
                detail: 'Standard',
                project: mockProject1,
            };
            ProjectFilterProvider['persistentSelectedItems'] = [selectedProject];
            AssigneeFilterProvider.previousSelectedItems = [];
            jest.mocked(currentUserJira).mockResolvedValue(mockUser1);
            jest.mocked(JiraIssueService.getIssuesFromAllSites).mockResolvedValue([mockIssue1]);

            const acceptHandler = mockQuickPick.onDidAccept.mock.calls[0][0];
            await acceptHandler();

            expect(JiraIssueService.getIssuesFromAllSites).toHaveBeenCalledWith(
                [mockSite1, mockSite2],
                expect.objectContaining({
                    projects: [selectedProject],
                    hasCurrentUser: true,
                }),
            );
        });

        it('should fetch current user if not already available', async () => {
            const selectedProject: QuickPickProject = {
                label: 'Project One',
                description: 'PROJ1',
                detail: 'Standard',
                project: mockProject1,
            };
            ProjectFilterProvider['persistentSelectedItems'] = [selectedProject];
            AssigneeFilterProvider.currentUser = null;
            jest.mocked(currentUserJira).mockResolvedValue(mockUser1);
            jest.mocked(JiraIssueService.getIssuesFromAllSites).mockResolvedValue([mockIssue1]);

            const acceptHandler = mockQuickPick.onDidAccept.mock.calls[0][0];
            await acceptHandler();

            expect(currentUserJira).toHaveBeenCalledWith(mockSite1);
            expect(AssigneeFilterProvider.currentUser).toBe(mockUser1);
        });

        it('should handle display count correctly with assignee filter', async () => {
            const selectedProject: QuickPickProject = {
                label: 'Project One',
                description: 'PROJ1',
                detail: 'Standard',
                project: mockProject1,
            };
            const selectedUser: QuickPickUser = {
                label: 'John Doe',
                description: 'john@example.com',
                detail: 'Active',
                user: mockUser1,
            };
            ProjectFilterProvider['persistentSelectedItems'] = [selectedProject];
            AssigneeFilterProvider.previousSelectedItems = [selectedUser];
            AssigneeFilterProvider.currentUser = mockUser1;
            jest.mocked(JiraIssueService.getIssuesFromAllSites).mockResolvedValue([mockIssue1]);

            const acceptHandler = mockQuickPick.onDidAccept.mock.calls[0][0];
            await acceptHandler();

            // Display count should be based on assignee filter (1 user)
            expect(Container.assignedWorkItemsView.setFilteredIssues).toHaveBeenNthCalledWith(1, [], 1);
        });

        it('should handle display count correctly with no filters (all projects)', async () => {
            ProjectFilterProvider['persistentSelectedItems'] = [];
            AssigneeFilterProvider.previousSelectedItems = [];
            jest.mocked(currentUserJira).mockResolvedValue(mockUser1);
            jest.mocked(JiraIssueService.getIssuesFromAllSites).mockResolvedValue([mockIssue1]);

            const acceptHandler = mockQuickPick.onDidAccept.mock.calls[0][0];
            await acceptHandler();

            // selectedUsersCount is 1 (current user) since no assignee filter is active but current user filter is applied
            expect(Container.assignedWorkItemsView.setFilteredIssues).toHaveBeenNthCalledWith(1, [], 1);
        });
    });

    describe('getAvailableSites', () => {
        it('should return sites when available', () => {
            jest.mocked(Container.siteManager.getSitesAvailable).mockReturnValue([mockSite1, mockSite2]);

            const sites = ProjectFilterProvider['getAvailableSites']();

            expect(sites).toEqual([mockSite1, mockSite2]);
            expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
        });

        it('should show info message when no sites available', () => {
            jest.mocked(Container.siteManager.getSitesAvailable).mockReturnValue([]);

            const sites = ProjectFilterProvider['getAvailableSites']();

            expect(sites).toEqual([]);
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('No Jira sites connected.');
        });
    });
});
