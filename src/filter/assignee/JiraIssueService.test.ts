import { MinimalIssue, readSearchResults } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo, ProductJira } from 'src/atlclients/authInfo';
import { Container } from 'src/container';

import { JiraIssueService } from './JiraIssueService';
import { QuickPickUser } from './QuickPickUtils';

jest.mock('src/container', () => ({
    Container: {
        clientManager: {
            jiraClient: jest.fn(),
        },
        jiraSettingsManager: {
            getEpicFieldsForSite: jest.fn(),
            getMinimalIssueFieldIdsForSite: jest.fn(),
        },
    },
}));

jest.mock('@atlassianlabs/jira-pi-common-models', () => ({
    ...jest.requireActual('@atlassianlabs/jira-pi-common-models'),
    readSearchResults: jest.fn(),
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

const createMockUser = (accountId: string, displayName: string) => ({
    accountId,
    displayName,
    emailAddress: `${displayName.toLowerCase().replace(' ', '.')}@example.com`,
    active: true,
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

describe('JiraIssueService', () => {
    let mockSite1: DetailedSiteInfo;
    let mockSite2: DetailedSiteInfo;
    let mockJiraClient: any;
    let mockUser1: ReturnType<typeof createMockUser>;
    let mockUser2: ReturnType<typeof createMockUser>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSite1 = createMockSite('1', 'test1.atlassian.net');
        mockSite2 = createMockSite('2', 'test2.atlassian.net');
        mockUser1 = createMockUser('user-1', 'John Doe');
        mockUser2 = createMockUser('user-2', 'Jane Smith');

        mockJiraClient = {
            searchForIssuesUsingJqlGet: jest.fn(),
        };

        jest.mocked(Container.clientManager.jiraClient).mockResolvedValue(mockJiraClient);
        jest.mocked(Container.jiraSettingsManager.getEpicFieldsForSite).mockResolvedValue({} as any);
        jest.mocked(Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite).mockReturnValue([]);
    });

    describe('getAssignedIssuesFromAllSites', () => {
        it('should fetch issues from multiple sites', async () => {
            const user: QuickPickUser = {
                label: 'John Doe',
                description: 'john@example.com',
                detail: 'Active',
                user: mockUser1 as any,
            };

            const issue1 = createMockIssue('TEST-1', 'Issue 1', mockSite1);
            const issue2 = createMockIssue('TEST-2', 'Issue 2', mockSite2);

            const mockResponse1 = {
                issues: [
                    {
                        key: 'TEST-1',
                        fields: {
                            assignee: { displayName: 'John Doe', accountId: 'user-1' },
                        },
                    },
                ],
                total: 1,
            };

            const mockResponse2 = {
                issues: [
                    {
                        key: 'TEST-2',
                        fields: {
                            assignee: { displayName: 'John Doe', accountId: 'user-1' },
                        },
                    },
                ],
                total: 1,
            };

            mockJiraClient.searchForIssuesUsingJqlGet
                .mockResolvedValueOnce(mockResponse1)
                .mockResolvedValueOnce(mockResponse2);

            jest.mocked(readSearchResults)
                .mockResolvedValueOnce({
                    issues: [issue1],
                    total: 1,
                } as any)
                .mockResolvedValueOnce({
                    issues: [issue2],
                    total: 1,
                } as any);

            const result = await JiraIssueService.getAssignedIssuesFromAllSites(
                [user],
                [mockSite1, mockSite2],
                false,
                false,
            );

            expect(result).toHaveLength(2);
            expect(result).toEqual(expect.arrayContaining([issue1, issue2]));
        });

        it('should deduplicate issues with same key from different sites', async () => {
            const user: QuickPickUser = {
                label: 'John Doe',
                description: 'john@example.com',
                detail: 'Active',
                user: mockUser1 as any,
            };

            const issue1 = createMockIssue('TEST-1', 'Issue 1', mockSite1);
            const issue1Duplicate = createMockIssue('TEST-1', 'Issue 1 Duplicate', mockSite2);

            const mockResponse1 = {
                issues: [
                    {
                        key: 'TEST-1',
                        fields: {
                            assignee: { displayName: 'John Doe', accountId: 'user-1' },
                        },
                    },
                ],
                total: 1,
            };

            const mockResponse2 = {
                issues: [
                    {
                        key: 'TEST-1',
                        fields: {
                            assignee: { displayName: 'John Doe', accountId: 'user-1' },
                        },
                    },
                ],
                total: 1,
            };

            mockJiraClient.searchForIssuesUsingJqlGet
                .mockResolvedValueOnce(mockResponse1)
                .mockResolvedValueOnce(mockResponse2);

            jest.mocked(readSearchResults)
                .mockResolvedValueOnce({
                    issues: [issue1],
                    total: 1,
                } as any)
                .mockResolvedValueOnce({
                    issues: [issue1Duplicate],
                    total: 1,
                } as any);

            const result = await JiraIssueService.getAssignedIssuesFromAllSites(
                [user],
                [mockSite1, mockSite2],
                false,
                false,
            );

            expect(result).toHaveLength(1);
            expect(result[0].key).toBe('TEST-1');
        });

        it('should handle empty sites array', async () => {
            const user: QuickPickUser = {
                label: 'John Doe',
                description: 'john@example.com',
                detail: 'Active',
                user: mockUser1 as any,
            };

            const result = await JiraIssueService.getAssignedIssuesFromAllSites([user], [], false, false);

            expect(result).toEqual([]);
        });

        it('should handle sites with errors gracefully', async () => {
            const user: QuickPickUser = {
                label: 'John Doe',
                description: 'john@example.com',
                detail: 'Active',
                user: mockUser1 as any,
            };

            const issue1 = createMockIssue('TEST-1', 'Issue 1', mockSite1);

            const mockResponse1 = {
                issues: [
                    {
                        key: 'TEST-1',
                        fields: {
                            assignee: { displayName: 'John Doe', accountId: 'user-1' },
                        },
                    },
                ],
                total: 1,
            };

            mockJiraClient.searchForIssuesUsingJqlGet
                .mockResolvedValueOnce(mockResponse1)
                .mockRejectedValueOnce(new Error('Site error'));

            jest.mocked(readSearchResults).mockResolvedValueOnce({
                issues: [issue1],
                total: 1,
            } as any);

            const result = await JiraIssueService.getAssignedIssuesFromAllSites(
                [user],
                [mockSite1, mockSite2],
                false,
                false,
            );

            expect(result).toHaveLength(1);
            expect(result[0]).toBe(issue1);
        });
    });

    describe('getAssignedIssuesFromSite', () => {
        it('should build correct JQL for regular users', async () => {
            const user: QuickPickUser = {
                label: 'John Doe',
                description: 'john@example.com',
                detail: 'Active',
                user: mockUser1 as any,
            };

            const issue = createMockIssue('TEST-1', 'Issue 1', mockSite1);
            const mockResponse = {
                issues: [
                    {
                        key: 'TEST-1',
                        fields: {
                            assignee: { displayName: 'John Doe', accountId: 'user-1' },
                        },
                    },
                ],
                total: 1,
            };

            mockJiraClient.searchForIssuesUsingJqlGet.mockResolvedValue(mockResponse);
            jest.mocked(readSearchResults).mockResolvedValue({
                issues: [issue],
                total: 1,
            } as any);

            await JiraIssueService.getAssignedIssuesFromSite([user], mockSite1, false, false);

            expect(mockJiraClient.searchForIssuesUsingJqlGet).toHaveBeenCalledWith(
                expect.stringContaining('assignee in ("user-1")'),
                expect.anything(),
                expect.anything(),
                expect.anything(),
            );
            expect(mockJiraClient.searchForIssuesUsingJqlGet).toHaveBeenCalledWith(
                expect.stringContaining('status != "Done"'),
                expect.anything(),
                expect.anything(),
                expect.anything(),
            );
        });

        it('should build correct JQL for Unassigned option', async () => {
            const mockResponse = {
                issues: [],
                total: 0,
            };

            mockJiraClient.searchForIssuesUsingJqlGet.mockResolvedValue(mockResponse);
            jest.mocked(readSearchResults).mockResolvedValue({
                issues: [],
                total: 0,
            } as any);

            await JiraIssueService.getAssignedIssuesFromSite([], mockSite1, true, false);

            expect(mockJiraClient.searchForIssuesUsingJqlGet).toHaveBeenCalledWith(
                expect.stringContaining('assignee is EMPTY'),
                expect.anything(),
                expect.anything(),
                expect.anything(),
            );
        });

        it('should build correct JQL for both users and Unassigned', async () => {
            const user: QuickPickUser = {
                label: 'John Doe',
                description: 'john@example.com',
                detail: 'Active',
                user: mockUser1 as any,
            };

            const mockResponse = {
                issues: [],
                total: 0,
            };

            mockJiraClient.searchForIssuesUsingJqlGet.mockResolvedValue(mockResponse);
            jest.mocked(readSearchResults).mockResolvedValue({
                issues: [],
                total: 0,
            } as any);

            await JiraIssueService.getAssignedIssuesFromSite([user], mockSite1, true, false);

            const jqlCall = mockJiraClient.searchForIssuesUsingJqlGet.mock.calls[0][0];
            expect(jqlCall).toContain('assignee in ("user-1")');
            expect(jqlCall).toContain('assignee is EMPTY');
            expect(jqlCall).toContain('OR');
        });

        it('should attach assignee information to issues', async () => {
            const user: QuickPickUser = {
                label: 'John Doe',
                description: 'john@example.com',
                detail: 'Active',
                user: mockUser1 as any,
            };

            const issue = createMockIssue('TEST-1', 'Issue 1', mockSite1);
            const assignee = { displayName: 'John Doe', accountId: 'user-1' };

            const mockResponse = {
                issues: [
                    {
                        key: 'TEST-1',
                        fields: {
                            assignee,
                        },
                    },
                ],
                total: 1,
            };

            mockJiraClient.searchForIssuesUsingJqlGet.mockResolvedValue(mockResponse);
            jest.mocked(readSearchResults).mockResolvedValue({
                issues: [issue],
                total: 1,
            } as any);

            const result = await JiraIssueService.getAssignedIssuesFromSite([user], mockSite1, false, false);

            expect(result).toHaveLength(1);
            expect((result[0] as any).assignee).toEqual(assignee);
        });

        it('should handle errors gracefully', async () => {
            const user: QuickPickUser = {
                label: 'John Doe',
                description: 'john@example.com',
                detail: 'Active',
                user: mockUser1 as any,
            };

            mockJiraClient.searchForIssuesUsingJqlGet.mockRejectedValue(new Error('API Error'));

            const result = await JiraIssueService.getAssignedIssuesFromSite([user], mockSite1, false, false);

            expect(result).toEqual([]);
        });

        it('should filter out users without accountId', async () => {
            const userWithoutAccountId: QuickPickUser = {
                label: 'Invalid User',
                description: 'invalid@example.com',
                detail: 'Active',
                user: { ...mockUser1, accountId: null as any } as any,
            };

            const result = await JiraIssueService.getAssignedIssuesFromSite(
                [userWithoutAccountId],
                mockSite1,
                false,
                false,
            );

            expect(result).toEqual([]);
            expect(mockJiraClient.searchForIssuesUsingJqlGet).not.toHaveBeenCalled();
        });

        it('should handle multiple users in JQL', async () => {
            const user1: QuickPickUser = {
                label: 'John Doe',
                description: 'john@example.com',
                detail: 'Active',
                user: mockUser1 as any,
            };
            const user2: QuickPickUser = {
                label: 'Jane Smith',
                description: 'jane@example.com',
                detail: 'Active',
                user: mockUser2 as any,
            };

            const mockResponse = {
                issues: [],
                total: 0,
            };

            mockJiraClient.searchForIssuesUsingJqlGet.mockResolvedValue(mockResponse);
            jest.mocked(readSearchResults).mockResolvedValue({
                issues: [],
                total: 0,
            } as any);

            await JiraIssueService.getAssignedIssuesFromSite([user1, user2], mockSite1, false, false);

            const jqlCall = mockJiraClient.searchForIssuesUsingJqlGet.mock.calls[0][0];
            expect(jqlCall).toContain('assignee in ("user-1", "user-2")');
        });
    });
});
