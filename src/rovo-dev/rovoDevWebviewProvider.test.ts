import { isMinimalIssue, MinimalIssue, readSearchResults } from '@atlassianlabs/jira-pi-common-models';

import { DetailedSiteInfo, ProductJira } from '../atlclients/authInfo';
import { Container } from '../container';
import { SearchJiraHelper } from '../views/jira/searchJiraHelper';
import { RovoDevWebviewProvider } from './rovoDevWebviewProvider';
import { RovoDevProviderMessageType } from './rovoDevWebviewProviderMessages';

// Mock dependencies
jest.mock('../container');
jest.mock('../jira/issuesForJql');
jest.mock('../logger');
jest.mock('../views/jira/searchJiraHelper');
jest.mock('@atlassianlabs/jira-pi-common-models');

const mockContainer = Container as jest.Mocked<typeof Container>;
const mockSearchJiraHelper = SearchJiraHelper as jest.Mocked<typeof SearchJiraHelper>;
const mockReadSearchResults = readSearchResults as jest.MockedFunction<typeof readSearchResults>;
const mockIsMinimalIssue = isMinimalIssue as jest.MockedFunction<typeof isMinimalIssue>;

// Mock Math.random for predictable shuffling
const mockMathRandom = jest.spyOn(Math, 'random');

describe('RovoDevWebviewProvider', () => {
    let provider: RovoDevWebviewProvider;
    let mockWebView: any;
    let mockSiteManager: any;

    const createMockSite = (id: string, host: string): DetailedSiteInfo => ({
        id,
        host,
        name: `Site ${id}`,
        userId: 'user123',
        avatarUrl: '',
        baseLinkUrl: `https://${host}`,
        baseApiUrl: `https://${host}/rest/api/2`,
        isCloud: true,
        credentialId: 'cred123',
        product: ProductJira,
    });

    const createMockIssue = (
        key: string,
        summary: string,
        siteDetails: DetailedSiteInfo,
    ): MinimalIssue<DetailedSiteInfo> => ({
        id: key,
        key,
        summary,
        self: `${siteDetails.baseApiUrl}/issue/${key}`,
        siteDetails,
        status: {
            name: 'To Do',
            statusCategory: { name: 'To Do', colorName: 'blue-gray', id: 1, key: 'new', self: '' },
            id: '1',
            iconUrl: 'https://example.com/status.png',
            self: '',
            description: 'Status description',
        },
        issuetype: {
            id: '10001',
            name: 'Task',
            description: 'A task',
            iconUrl: 'https://example.com/task.png',
            subtask: false,
            self: '',
            avatarId: 1,
            epic: false,
        },
        priority: {
            id: '3',
            name: 'Medium',
            iconUrl: 'https://example.com/medium.png',
        },
        created: new Date('2023-01-01'),
        updated: new Date('2023-01-02'),
        description: 'Issue description',
        descriptionHtml: '<p>Issue description</p>',
        issuelinks: [],
        transitions: [],
        epicLink: '',
        isEpic: false,
        epicName: '',
        subtasks: [],
        epicChildren: [],
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockMathRandom.mockReset();
        mockSearchJiraHelper.getAssignedIssuesPerSite.mockReturnValue([]);

        mockIsMinimalIssue.mockReturnValue(true);

        mockWebView = {
            postMessage: jest.fn().mockResolvedValue(true),
        };

        mockSiteManager = {
            getSitesAvailable: jest.fn(),
        };

        const mockConfig = {
            rovodev: {
                debugPanelEnabled: false,
            },
        };

        Object.defineProperty(mockContainer, 'siteManager', {
            value: mockSiteManager,
            writable: true,
        });

        Object.defineProperty(mockContainer, 'config', {
            value: mockConfig,
            writable: true,
        });

        // Mock clientManager and jiraSettingsManager for new API logic
        const mockClientManager = {
            jiraClient: jest.fn(),
        };

        const mockJiraSettingsManager = {
            getEpicFieldsForSite: jest.fn().mockResolvedValue({ epicLinkFieldId: 'customfield_10001' }),
            getMinimalIssueFieldIdsForSite: jest.fn().mockReturnValue(['summary', 'status']),
        };

        (mockContainer as any).clientManager = mockClientManager;
        (mockContainer as any).jiraSettingsManager = mockJiraSettingsManager;

        // Create provider instance
        provider = new RovoDevWebviewProvider({} as any, {} as any);

        // Access private _webView property and set it
        (provider as any)._webView = mockWebView;
    });

    afterEach(() => {
        mockMathRandom.mockRestore();
    });

    describe('fetchAndSendJiraWorkItems', () => {
        it('should send empty array when no sites available', async () => {
            mockSiteManager.getSitesAvailable.mockReturnValue([]);

            await (provider as any).fetchAndSendJiraWorkItems();

            expect(mockWebView.postMessage).toHaveBeenCalledWith({
                type: RovoDevProviderMessageType.SetJiraWorkItems,
                issues: [],
            });
        });

        it('should use cached issues when available', async () => {
            const site1 = createMockSite('site1', 'example1.atlassian.net');
            mockSiteManager.getSitesAvailable.mockReturnValue([site1]);

            const cachedIssue = createMockIssue('CACHED-1', 'Cached issue', site1);
            mockSearchJiraHelper.getAssignedIssuesPerSite.mockReturnValue([cachedIssue]);

            await (provider as any).fetchAndSendJiraWorkItems();

            expect(mockWebView.postMessage).toHaveBeenCalledWith({
                type: RovoDevProviderMessageType.SetJiraWorkItems,
                issues: [cachedIssue],
            });
        });

        it('should fetch from API when no cache and return up to 3 issues', async () => {
            const site1 = createMockSite('site1', 'example1.atlassian.net');
            mockSiteManager.getSitesAvailable.mockReturnValue([site1]);
            mockSearchJiraHelper.getAssignedIssuesPerSite.mockReturnValue([]);

            const issues = [
                createMockIssue('PROJ-1', 'Issue 1', site1),
                createMockIssue('PROJ-2', 'Issue 2', site1),
                createMockIssue('PROJ-3', 'Issue 3', site1),
            ];

            const mockJiraClient = {
                searchForIssuesUsingJqlGet: jest.fn().mockResolvedValueOnce({}),
            };
            (mockContainer as any).clientManager.jiraClient.mockResolvedValueOnce(mockJiraClient);
            mockReadSearchResults.mockResolvedValueOnce({ issues, total: 3, maxResults: 10, startAt: 0 });

            await (provider as any).fetchAndSendJiraWorkItems();

            const setItemsCalls = mockWebView.postMessage.mock.calls.filter(
                (call: any) => call[0].type === RovoDevProviderMessageType.SetJiraWorkItems,
            );
            expect(setItemsCalls).toHaveLength(1);
            expect(setItemsCalls[0][0].issues.length).toBeLessThanOrEqual(3);
        });
    });
});
