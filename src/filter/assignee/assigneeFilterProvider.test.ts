import { MinimalIssue, User } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo, ProductJira } from 'src/atlclients/authInfo';
import * as vscode from 'vscode';

import { Container } from '../../container';
import { JiraIssueService } from '../JiraIssueService';
import { AssigneeFilterProvider } from './assigneeFilterProvider';
import { JiraUserService } from './JiraUserService';
import { QuickPickIssue, QuickPickUser } from './QuickPickUtils';

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

jest.mock('./JiraUserService');
jest.mock('../JiraIssueService');

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

describe('AssigneeFilterProvider', () => {
    let mockQuickPick: ReturnType<typeof createMockQuickPick>;
    let mockIssuesQuickPick: ReturnType<typeof createMockQuickPick>;
    let mockSite1: DetailedSiteInfo;
    let mockSite2: DetailedSiteInfo;
    let mockUser1: User;
    let mockUser2: User;
    let mockIssue1: MinimalIssue<DetailedSiteInfo>;
    let mockIssue2: MinimalIssue<DetailedSiteInfo>;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        AssigneeFilterProvider['currentToken'] = 0;
        AssigneeFilterProvider['fetchTimeout'] = undefined;
        AssigneeFilterProvider['persistentSelectedItems'] = [];
        AssigneeFilterProvider['previousSelectedItems'] = [];

        mockSite1 = createMockSite('1', 'test1.atlassian.net');
        mockSite2 = createMockSite('2', 'test2.atlassian.net');

        mockUser1 = createMockUser('user-1', 'John Doe', 'john@example.com');
        mockUser2 = createMockUser('user-2', 'Jane Smith', 'jane@example.com');

        mockIssue1 = createMockIssue('TEST-1', 'Test Issue 1', mockSite1);
        mockIssue2 = createMockIssue('TEST-2', 'Test Issue 2', mockSite2);

        mockQuickPick = createMockQuickPick<QuickPickUser>();
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

            await AssigneeFilterProvider.create();

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('No Jira sites connected.');
            expect(vscode.window.createQuickPick).not.toHaveBeenCalled();
        });

        it('should include previous selected items in default options', async () => {
            const previousUser: QuickPickUser = {
                label: 'Previous User',
                description: 'previous@example.com',
                detail: 'Active',
                user: mockUser1,
            };
            AssigneeFilterProvider['previousSelectedItems'] = [previousUser];

            await AssigneeFilterProvider.create();

            expect(mockQuickPick.items).toEqual(
                expect.arrayContaining([expect.objectContaining({ label: 'Previous User' })]),
            );
        });
    });

    describe('handleSearchInput', () => {
        beforeEach(async () => {
            await AssigneeFilterProvider.create();
        });

        it('should reset to default options when input is empty', () => {
            const changeValueHandler = mockQuickPick.onDidChangeValue.mock.calls[0][0];

            changeValueHandler('');

            expect(mockQuickPick.title).toBe('Filter by Assignee - Select Users');
            expect(mockQuickPick.placeholder).toBe('Search for assignees');
            expect(mockQuickPick.busy).toBe(false);
            expect(mockQuickPick.items).toEqual([]);
        });
    });

    describe('searchUsers', () => {
        beforeEach(async () => {
            await AssigneeFilterProvider.create();
        });

        it('should update QuickPick with search results', async () => {
            jest.mocked(JiraUserService.searchUsersFromAllSites).mockResolvedValue([mockUser1, mockUser2]);

            const changeValueHandler = mockQuickPick.onDidChangeValue.mock.calls[0][0];
            changeValueHandler('john');
            jest.advanceTimersByTime(300);

            await Promise.resolve();

            expect(mockQuickPick.busy).toBe(false);
            expect(mockQuickPick.title).toContain('Search Results (2)');
            expect(mockQuickPick.placeholder).toContain('Search results for "john"');
            expect(mockQuickPick.items.length).toBeGreaterThan(0);
        });

        it('should show no results message when search returns empty', async () => {
            jest.mocked(JiraUserService.searchUsersFromAllSites).mockResolvedValue([]);

            const changeValueHandler = mockQuickPick.onDidChangeValue.mock.calls[0][0];
            changeValueHandler('nonexistent');
            jest.advanceTimersByTime(300);

            await Promise.resolve();

            expect(mockQuickPick.title).toBe('Filter by Assignee - No Results Found');
            expect(mockQuickPick.placeholder).toContain('No users found for "nonexistent"');
        });

        it('should merge search results with persistent selected items', async () => {
            const persistentUser: QuickPickUser = {
                label: 'Selected User',
                description: 'selected@example.com',
                detail: 'Active',
                user: mockUser1,
            };
            AssigneeFilterProvider['persistentSelectedItems'] = [persistentUser];
            jest.mocked(JiraUserService.searchUsersFromAllSites).mockResolvedValue([mockUser2]);

            const changeValueHandler = mockQuickPick.onDidChangeValue.mock.calls[0][0];
            changeValueHandler('jane');
            jest.advanceTimersByTime(300);

            await Promise.resolve();

            const itemLabels = mockQuickPick.items.map((item) => item.label);
            expect(itemLabels).toContain('Selected User');
            expect(itemLabels).toContain('Jane Smith');
            expect(mockQuickPick.selectedItems).toEqual([persistentUser]);
        });
    });

    describe('handleSelectionChange', () => {
        beforeEach(async () => {
            await AssigneeFilterProvider.create();
        });

        it('should update persistent selected items', () => {
            const selectedUser: QuickPickUser = {
                label: 'Selected User',
                description: 'selected@example.com',
                detail: 'Active',
                user: mockUser1,
            };

            const selectionHandler = mockQuickPick.onDidChangeSelection.mock.calls[0][0];
            selectionHandler([selectedUser]);

            expect(AssigneeFilterProvider['persistentSelectedItems']).toEqual([selectedUser]);
        });
    });

    describe('handleUserAccept', () => {
        beforeEach(async () => {
            await AssigneeFilterProvider.create();
        });

        it('should do nothing if no items are selected', async () => {
            jest.mocked(JiraIssueService.getIssuesFromAllSites).mockResolvedValue([]);

            const acceptHandler = mockQuickPick.onDidAccept.mock.calls[0][0];
            await acceptHandler();

            expect(mockQuickPick.hide).not.toHaveBeenCalled();
            expect(JiraIssueService.getIssuesFromAllSites).not.toHaveBeenCalled();
        });

        it('should fetch issues when users are selected', async () => {
            const selectedUser: QuickPickUser = {
                label: 'John Doe',
                description: 'john@example.com',
                detail: 'Active',
                user: mockUser1,
            };
            AssigneeFilterProvider['persistentSelectedItems'] = [selectedUser];
            jest.mocked(JiraIssueService.getIssuesFromAllSites).mockResolvedValue([mockIssue1, mockIssue2]);

            const acceptHandler = mockQuickPick.onDidAccept.mock.calls[0][0];
            await acceptHandler();

            expect(mockQuickPick.hide).toHaveBeenCalled();
            expect(JiraIssueService.getIssuesFromAllSites).toHaveBeenCalledWith([mockSite1, mockSite2], {
                users: [selectedUser],
                hasCurrentUser: false,
            });
        });

        it('should move selected items to previous selections and keep persistent items', async () => {
            const selectedUser: QuickPickUser = {
                label: 'John Doe',
                description: 'john@example.com',
                detail: 'Active',
                user: mockUser1,
            };
            AssigneeFilterProvider['persistentSelectedItems'] = [selectedUser];
            jest.mocked(JiraIssueService.getIssuesFromAllSites).mockResolvedValue([]);

            const acceptHandler = mockQuickPick.onDidAccept.mock.calls[0][0];
            await acceptHandler();

            expect(AssigneeFilterProvider['previousSelectedItems']).toEqual([selectedUser]);
            expect(AssigneeFilterProvider['persistentSelectedItems']).toEqual([selectedUser]);
        });
    });

    describe('fetchAssignedIssues', () => {
        beforeEach(async () => {
            await AssigneeFilterProvider.create();
        });

        it('should set filtered issues in sidebar and display results', async () => {
            const selectedUser: QuickPickUser = {
                label: 'John Doe',
                description: 'john@example.com',
                detail: 'Active',
                user: mockUser1,
            };
            AssigneeFilterProvider['persistentSelectedItems'] = [selectedUser];
            jest.mocked(JiraIssueService.getIssuesFromAllSites).mockResolvedValue([mockIssue1, mockIssue2]);

            const acceptHandler = mockQuickPick.onDidAccept.mock.calls[0][0];
            await acceptHandler();

            expect(Container.assignedWorkItemsView.setFilteredIssues).toHaveBeenCalledTimes(2);
            expect(Container.assignedWorkItemsView.setFilteredIssues).toHaveBeenNthCalledWith(1, [], 1);
            expect(Container.assignedWorkItemsView.setFilteredIssues).toHaveBeenNthCalledWith(
                2,
                expect.arrayContaining([
                    expect.objectContaining({ key: 'TEST-1' }),
                    expect.objectContaining({ key: 'TEST-2' }),
                ]),
                1,
            );
            expect(vscode.commands.executeCommand).toHaveBeenCalled();
            expect(Container.assignedWorkItemsView.focus).toHaveBeenCalled();
        });

        it('should display empty state when no issues found', async () => {
            const selectedUser: QuickPickUser = {
                label: 'John Doe',
                description: 'john@example.com',
                detail: 'Active',
                user: mockUser1,
            };
            AssigneeFilterProvider['persistentSelectedItems'] = [selectedUser];
            jest.mocked(JiraIssueService.getIssuesFromAllSites).mockResolvedValue([]);

            const acceptHandler = mockQuickPick.onDidAccept.mock.calls[0][0];
            await acceptHandler();

            expect(Container.assignedWorkItemsView.setFilteredIssues).toHaveBeenCalledTimes(2);
            expect(Container.assignedWorkItemsView.setFilteredIssues).toHaveBeenNthCalledWith(2, [], 1);
        });

        it('should display error state when fetch fails', async () => {
            const selectedUser: QuickPickUser = {
                label: 'John Doe',
                description: 'john@example.com',
                detail: 'Active',
                user: mockUser1,
            };
            AssigneeFilterProvider['persistentSelectedItems'] = [selectedUser];
            jest.mocked(JiraIssueService.getIssuesFromAllSites).mockRejectedValue(new Error('Fetch failed'));

            const acceptHandler = mockQuickPick.onDidAccept.mock.calls[0][0];
            await acceptHandler();

            expect(Container.assignedWorkItemsView.setFilteredIssues).toHaveBeenCalledTimes(2);
            expect(Container.assignedWorkItemsView.setFilteredIssues).toHaveBeenNthCalledWith(1, [], 1);
            expect(Container.assignedWorkItemsView.setFilteredIssues).toHaveBeenNthCalledWith(2, null);
            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Failed to fetch issues: Fetch failed');
        });

        it('should not fetch issues if no sites available', async () => {
            const selectedUser: QuickPickUser = {
                label: 'John Doe',
                description: 'john@example.com',
                detail: 'Active',
                user: mockUser1,
            };
            AssigneeFilterProvider['persistentSelectedItems'] = [selectedUser];
            jest.mocked(Container.siteManager.getSitesAvailable).mockReturnValue([]);
            jest.mocked(JiraIssueService.getIssuesFromAllSites).mockResolvedValue([]);

            const acceptHandler = mockQuickPick.onDidAccept.mock.calls[0][0];
            await acceptHandler();

            expect(JiraIssueService.getIssuesFromAllSites).not.toHaveBeenCalled();
            expect(Container.assignedWorkItemsView.setFilteredIssues).not.toHaveBeenCalled();
        });

        it('should handle multiple users correctly', async () => {
            const selectedUser1: QuickPickUser = {
                label: 'John Doe',
                description: 'john@example.com',
                detail: 'Active',
                user: mockUser1,
            };
            const selectedUser2: QuickPickUser = {
                label: 'Jane Smith',
                description: 'jane@example.com',
                detail: 'Active',
                user: mockUser2,
            };
            AssigneeFilterProvider['persistentSelectedItems'] = [selectedUser1, selectedUser2];
            jest.mocked(JiraIssueService.getIssuesFromAllSites).mockResolvedValue([mockIssue1]);

            const acceptHandler = mockQuickPick.onDidAccept.mock.calls[0][0];
            await acceptHandler();

            expect(Container.assignedWorkItemsView.setFilteredIssues).toHaveBeenNthCalledWith(1, [], 2);
            expect(Container.assignedWorkItemsView.setFilteredIssues).toHaveBeenNthCalledWith(
                2,
                expect.arrayContaining([expect.objectContaining({ key: 'TEST-1' })]),
                2,
            );
        });
    });

    describe('getAvailableSites', () => {
        it('should return sites when available', () => {
            jest.mocked(Container.siteManager.getSitesAvailable).mockReturnValue([mockSite1, mockSite2]);

            const sites = AssigneeFilterProvider['getAvailableSites']();

            expect(sites).toEqual([mockSite1, mockSite2]);
            expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
        });
    });
});
