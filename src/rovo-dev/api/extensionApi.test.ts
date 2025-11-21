import { Container } from 'src/container';

import { ExtensionApi, JiraApi, ProductJira } from './extensionApi';

// Create a mutable primarySite property for testing
const mockSiteManager = {
    _primarySite: undefined as any,
    get primarySite() {
        return this._primarySite;
    },
    getSitesAvailable: jest.fn(),
};

// Mock Container
jest.mock('src/container', () => ({
    Container: {
        analyticsClient: { sendTrackEvent: jest.fn() },
        isDebugging: false,
        isBoysenberryMode: false,
        isRovoDevEnabled: true,
        version: '1.0.0',
        appInstanceId: 'test-app-id',
        config: { rovodev: { debugPanelEnabled: false, thinkingBlockEnabled: false } },
        get siteManager() {
            return mockSiteManager;
        },
        credentialManager: {
            getAuthInfo: jest.fn(),
        },
        clientManager: {
            getCloudPrimarySite: jest.fn(),
            jiraClient: jest.fn(),
        },
        jiraSettingsManager: {
            getEpicFieldsForSite: jest.fn(),
            getMinimalIssueFieldIdsForSite: jest.fn(),
        },
    },
}));

// Mock SearchJiraHelper
jest.mock('src/views/jira/searchJiraHelper', () => ({
    SearchJiraHelper: {
        getAssignedIssuesPerSite: jest.fn(),
    },
}));

// Mock jira-pi-common-models
jest.mock('@atlassianlabs/jira-pi-common-models', () => ({
    isMinimalIssue: jest.fn((issue) => true),
    readSearchResults: jest.fn().mockResolvedValue({ issues: [] }),
}));

describe('ExtensionApi', () => {
    let api: ExtensionApi;

    beforeEach(() => {
        jest.clearAllMocks();
        api = new ExtensionApi();
    });

    describe('analytics', () => {
        it('should send track event through Container', async () => {
            const mockEvent = { type: 'test', data: 'value' };
            await api.analytics.sendTrackEvent(mockEvent);

            expect(Container.analyticsClient.sendTrackEvent).toHaveBeenCalledWith(mockEvent);
        });
    });

    describe('metadata', () => {
        it('should return isDebugging from Container', () => {
            expect(api.metadata.isDebugging()).toBe(false);
        });

        it('should return isBoysenberry from Container', () => {
            expect(api.metadata.isBoysenberry()).toBe(false);
        });

        it('should return isRovoDevEnabled from Container', () => {
            expect(api.metadata.isRovoDevEnabled()).toBe(true);
        });

        it('should return version from Container', () => {
            expect(api.metadata.version()).toBe('1.0.0');
        });

        it('should return appInstanceId from Container', () => {
            expect(api.metadata.appInstanceId()).toBe('test-app-id');
        });
    });

    describe('config', () => {
        it('should return isDebugPanelEnabled from Container config', () => {
            expect(api.config.isDebugPanelEnabled()).toBe(false);
        });

        it('should return isThinkingBlockEnabled from Container config', () => {
            expect(api.config.isThinkingBlockEnabled()).toBe(false);
        });
    });

    describe('auth', () => {
        describe('getCloudPrimaryAuthInfo', () => {
            it('should call Container.clientManager.getCloudPrimarySite', async () => {
                const mockAuthData = {
                    authInfo: { user: { email: 'test@example.com' } },
                    host: 'test.atlassian.net',
                    siteCloudId: 'site-123',
                    isValid: true,
                    isStaging: false,
                };
                (Container.clientManager.getCloudPrimarySite as jest.Mock).mockResolvedValue(mockAuthData);

                const result = await api.auth.getCloudPrimaryAuthSite();

                expect(Container.clientManager.getCloudPrimarySite).toHaveBeenCalled();
                expect(result).toBe(mockAuthData);
            });

            it('should return undefined when no cloud primary site exists', async () => {
                (Container.clientManager.getCloudPrimarySite as jest.Mock).mockResolvedValue(undefined);

                const result = await api.auth.getCloudPrimaryAuthSite();

                expect(result).toBeUndefined();
            });
        });

        describe('getPrimaryAuthInfo', () => {
            it('should return auth info for primary site', async () => {
                const mockSite = { id: 'site-1', name: 'Test Site' };
                const mockAuthInfo = { user: { email: 'test@example.com' } };

                mockSiteManager._primarySite = mockSite as any;
                (Container.credentialManager.getAuthInfo as jest.Mock).mockResolvedValue(mockAuthInfo);

                const result = await api.auth.getPrimaryAuthInfo();

                expect(Container.credentialManager.getAuthInfo).toHaveBeenCalledWith(mockSite);
                expect(result).toBe(mockAuthInfo);
            });

            it('should return undefined when no primary site exists', async () => {
                mockSiteManager._primarySite = undefined;

                const result = await api.auth.getPrimaryAuthInfo();

                expect(Container.credentialManager.getAuthInfo).not.toHaveBeenCalled();
                expect(result).toBeUndefined();
            });
        });

        describe('validateJiraCredentials', () => {
            it('should return true when credentials are valid', async () => {
                const mockSite = { id: 'site-1', name: 'Test Site' };
                (Container.clientManager.jiraClient as jest.Mock).mockResolvedValue({});

                const result = await api.auth.validateJiraCredentials(mockSite as any);

                expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSite);
                expect(result).toBe(true);
            });

            it('should return false when credentials are invalid', async () => {
                const mockSite = { id: 'site-1', name: 'Test Site' };
                (Container.clientManager.jiraClient as jest.Mock).mockRejectedValue(new Error('Auth failed'));

                const result = await api.auth.validateJiraCredentials(mockSite as any);

                expect(result).toBe(false);
            });
        });
    });

    describe('jira', () => {
        it('should expose JiraApi instance', () => {
            expect(api.jira).toBeInstanceOf(JiraApi);
        });
    });

    describe('JiraApi', () => {
        let jiraApi: JiraApi;

        beforeEach(() => {
            jest.clearAllMocks();
            jiraApi = new JiraApi();
        });

        describe('getSites', () => {
            it('should return Jira sites from siteManager', () => {
                const mockSites = [
                    { id: 'site-1', name: 'Site 1' },
                    { id: 'site-2', name: 'Site 2' },
                ];
                (Container.siteManager.getSitesAvailable as jest.Mock).mockReturnValue(mockSites);

                const result = jiraApi.getSites();

                expect(Container.siteManager.getSitesAvailable).toHaveBeenCalledWith(ProductJira);
                expect(result).toBe(mockSites);
            });
        });

        describe('fetchWorkItems', () => {
            const mockSite = { id: 'site-1', name: 'Test Site' } as any;
            const { SearchJiraHelper } = require('src/views/jira/searchJiraHelper');
            const { isMinimalIssue, readSearchResults } = require('@atlassianlabs/jira-pi-common-models');

            beforeEach(() => {
                // Reset all mocks for each test
                jest.clearAllMocks();
            });

            it('should return cached work items if available', async () => {
                const mockIssues = [
                    { key: 'TEST-1', summary: 'Issue 1' },
                    { key: 'TEST-2', summary: 'Issue 2' },
                ];

                // Mock SearchJiraHelper to return cached issues
                SearchJiraHelper.getAssignedIssuesPerSite.mockReturnValue(mockIssues);
                // Make sure isMinimalIssue returns true so the filter doesn't remove them
                isMinimalIssue.mockImplementation((issue: any) => issue.key.startsWith('TEST'));

                const result = await jiraApi.fetchWorkItems(mockSite);

                expect(SearchJiraHelper.getAssignedIssuesPerSite).toHaveBeenCalledWith('site-1');
                expect(result).toEqual(mockIssues);
                expect(Container.clientManager.jiraClient).not.toHaveBeenCalled();
            });

            it('should fetch from API when cache is empty', async () => {
                const mockIssues = [{ key: 'TEST-1', summary: 'Issue 1' }];
                const mockClient = {
                    searchForIssuesUsingJqlGet: jest.fn().mockResolvedValue({
                        issues: mockIssues,
                    }),
                };
                const mockEpicFieldInfo = { epicLinkField: 'customfield_10001' };
                const mockFields = ['summary', 'status'];

                // Mock empty cache
                SearchJiraHelper.getAssignedIssuesPerSite.mockReturnValue([]);
                isMinimalIssue.mockReturnValue(true);
                readSearchResults.mockResolvedValue({ issues: mockIssues });

                // Mock API calls
                (Container.clientManager.jiraClient as jest.Mock).mockResolvedValue(mockClient);
                (Container.jiraSettingsManager.getEpicFieldsForSite as jest.Mock).mockResolvedValue(mockEpicFieldInfo);
                (Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite as jest.Mock).mockReturnValue(mockFields);

                const result = await jiraApi.fetchWorkItems(mockSite);

                expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSite);
                expect(Container.jiraSettingsManager.getEpicFieldsForSite).toHaveBeenCalledWith(mockSite);
                expect(mockClient.searchForIssuesUsingJqlGet).toHaveBeenCalledWith(
                    'assignee = currentUser() AND StatusCategory = "To Do" ORDER BY updated DESC',
                    mockFields,
                    30,
                    0,
                );
                expect(result).toEqual(mockIssues);
            });
        });
    });
});
