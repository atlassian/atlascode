import { User } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo, ProductJira } from 'src/atlclients/authInfo';
import { Container } from 'src/container';

import { JiraUserService } from './JiraUserService';

jest.mock('src/container', () => ({
    Container: {
        clientManager: {
            jiraClient: jest.fn(),
        },
        jiraProjectManager: {
            getProjects: jest.fn(),
        },
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

const createMockUser = (accountId: string, displayName: string): User => ({
    accountId,
    displayName,
    emailAddress: `${displayName.toLowerCase().replace(' ', '.')}@example.com`,
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

describe('JiraUserService', () => {
    let mockSite1: DetailedSiteInfo;
    let mockSite2: DetailedSiteInfo;
    let mockJiraClient: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSite1 = createMockSite('1', 'test1.atlassian.net');
        mockSite2 = createMockSite('2', 'test2.atlassian.net');

        mockJiraClient = {
            findUsersAssignableToProject: jest.fn(),
        };

        jest.mocked(Container.clientManager.jiraClient).mockResolvedValue(mockJiraClient);
    });

    describe('searchUsersFromAllSites', () => {
        it('should search users from multiple sites', async () => {
            const user1 = createMockUser('user-1', 'John Doe');
            const user2 = createMockUser('user-2', 'Jane Smith');

            jest.mocked(Container.jiraProjectManager.getProjects)
                .mockResolvedValueOnce([{ key: 'PROJ1' } as any])
                .mockResolvedValueOnce([{ key: 'PROJ2' } as any]);

            mockJiraClient.findUsersAssignableToProject.mockResolvedValueOnce([user1]).mockResolvedValueOnce([user2]);

            const result = await JiraUserService.searchUsersFromAllSites('john', [mockSite1, mockSite2]);

            expect(result).toHaveLength(2);
            expect(result).toEqual(expect.arrayContaining([user1, user2]));
        });

        it('should deduplicate users with same accountId', async () => {
            const user1 = createMockUser('user-1', 'John Doe');

            jest.mocked(Container.jiraProjectManager.getProjects)
                .mockResolvedValueOnce([{ key: 'PROJ1' } as any])
                .mockResolvedValueOnce([{ key: 'PROJ2' } as any]);

            mockJiraClient.findUsersAssignableToProject.mockResolvedValueOnce([user1]).mockResolvedValueOnce([user1]);

            const result = await JiraUserService.searchUsersFromAllSites('john', [mockSite1, mockSite2]);

            expect(result).toHaveLength(1);
            expect(result[0]).toBe(user1);
        });

        it('should handle empty sites array', async () => {
            const result = await JiraUserService.searchUsersFromAllSites('john', []);

            expect(result).toEqual([]);
        });

        it('should handle sites with errors gracefully', async () => {
            const user1 = createMockUser('user-1', 'John Doe');

            jest.mocked(Container.jiraProjectManager.getProjects)
                .mockResolvedValueOnce([{ key: 'PROJ1' } as any])
                .mockRejectedValueOnce(new Error('Site error'));

            mockJiraClient.findUsersAssignableToProject.mockResolvedValueOnce([user1]);

            const result = await JiraUserService.searchUsersFromAllSites('john', [mockSite1, mockSite2]);

            expect(result).toHaveLength(1);
            expect(result[0]).toBe(user1);
        });
    });

    describe('searchUsersFromSite', () => {
        it('should search users from a single site', async () => {
            const user = createMockUser('user-1', 'John Doe');

            jest.mocked(Container.jiraProjectManager.getProjects).mockResolvedValueOnce([{ key: 'PROJ1' } as any]);
            mockJiraClient.findUsersAssignableToProject.mockResolvedValueOnce([user]);

            const result = await JiraUserService.searchUsersFromAllSites('john', [mockSite1]);

            expect(result).toHaveLength(1);
            expect(result[0]).toBe(user);
            expect(Container.jiraProjectManager.getProjects).toHaveBeenCalledWith(mockSite1);
            expect(mockJiraClient.findUsersAssignableToProject).toHaveBeenCalledWith('PROJ1', 'john');
        });

        it('should return empty array when no projects available', async () => {
            jest.mocked(Container.jiraProjectManager.getProjects).mockResolvedValueOnce([]);

            const result = await JiraUserService.searchUsersFromAllSites('john', [mockSite1]);

            expect(result).toEqual([]);
            expect(mockJiraClient.findUsersAssignableToProject).not.toHaveBeenCalled();
        });

        it('should use first project when multiple projects available', async () => {
            const user = createMockUser('user-1', 'John Doe');

            jest.mocked(Container.jiraProjectManager.getProjects).mockResolvedValueOnce([
                { key: 'PROJ1' } as any,
                { key: 'PROJ2' } as any,
            ]);
            mockJiraClient.findUsersAssignableToProject.mockResolvedValueOnce([user]);

            await JiraUserService.searchUsersFromAllSites('john', [mockSite1]);

            expect(mockJiraClient.findUsersAssignableToProject).toHaveBeenCalledWith('PROJ1', 'john');
            expect(mockJiraClient.findUsersAssignableToProject).toHaveBeenCalledTimes(1);
        });

        it('should handle API errors gracefully', async () => {
            jest.mocked(Container.jiraProjectManager.getProjects).mockResolvedValueOnce([{ key: 'PROJ1' } as any]);
            mockJiraClient.findUsersAssignableToProject.mockRejectedValue(new Error('API Error'));

            const result = await JiraUserService.searchUsersFromAllSites('john', [mockSite1]);

            expect(result).toEqual([]);
        });

        it('should handle client manager errors gracefully', async () => {
            jest.mocked(Container.clientManager.jiraClient).mockRejectedValue(new Error('Client Error'));

            const result = await JiraUserService.searchUsersFromAllSites('john', [mockSite1]);

            expect(result).toEqual([]);
        });

        it('should handle empty search query', async () => {
            const user = createMockUser('user-1', 'John Doe');

            jest.mocked(Container.jiraProjectManager.getProjects).mockResolvedValueOnce([{ key: 'PROJ1' } as any]);
            mockJiraClient.findUsersAssignableToProject.mockResolvedValueOnce([user]);

            const result = await JiraUserService.searchUsersFromAllSites('', [mockSite1]);

            expect(result).toHaveLength(1);
            expect(mockJiraClient.findUsersAssignableToProject).toHaveBeenCalledWith('PROJ1', '');
        });
    });
});
