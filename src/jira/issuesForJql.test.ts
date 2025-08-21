import { MinimalIssue, readSearchResults } from '@atlassianlabs/jira-pi-common-models';
import { Experiments, FeatureFlagClient } from 'src/util/featureFlags';
import { expansionCastTo, forceCastTo } from 'testsutil';

import { DetailedSiteInfo } from '../atlclients/authInfo';
import { Container } from '../container';
import { issuesForJQL, MAX_RESULTS } from './issuesForJql';

jest.mock('@atlassianlabs/jira-pi-common-models', () => ({
    readSearchResults: jest.fn(),
}));

jest.mock('../container', () => ({
    Container: {
        clientManager: {
            jiraClient: jest.fn(),
        },
        jiraSettingsManager: {
            getMinimalIssueFieldIdsForSite: jest.fn(),
            getEpicFieldsForSite: jest.fn(),
            getIssueLinkTypes: jest.fn(),
            getIssueCreateMetadata: jest.fn(),
        },
        analyticsClient: {
            sendTrackEvent: jest.fn(),
        },
        config: {
            jira: {
                explorer: {
                    fetchAllQueryResults: false, // Set default to false for tests
                },
            },
        },
    },
}));

jest.mock('src/util/featureFlags', () => ({
    FeatureFlagClient: {
        checkExperimentValue: jest.fn(),
    },
    Experiments: {
        AtlascodePerformanceExperiment: 'atlascode-performance-experiment',
    },
}));

jest.mock('src/analytics', () => ({
    jiraIssuePerformanceEvent: jest.fn().mockResolvedValue({}),
}));

describe('issuesForJQL', () => {
    const mockJql = 'project = TEST';
    const mockSite = expansionCastTo<DetailedSiteInfo>({
        id: 'site-id',
        host: 'test.atlassian.com',
    });
    const mockFields = ['field1', 'field2'];
    const mockEpicFieldInfo = { epicLinkFieldId: 'customfield_10001', epicNameFieldId: 'customfield_10002' };
    const mockClient = {
        searchForIssuesUsingJqlGet: jest.fn(),
    };
    const mockIssues = [
        forceCastTo<MinimalIssue<DetailedSiteInfo>>({
            key: 'TEST-1',
            summary: 'Test Issue 1',
        }),
        forceCastTo<MinimalIssue<DetailedSiteInfo>>({
            key: 'TEST-2',
            summary: 'Test Issue 2',
        }),
    ];
    const mockSearchResult = {
        issues: mockIssues,
        total: mockIssues.length,
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock FeatureFlagClient to return false by default (performance disabled)
        (FeatureFlagClient.checkExperimentValue as jest.Mock).mockReturnValue(false);

        // Setup default mock implementations
        mockClient.searchForIssuesUsingJqlGet.mockResolvedValue({});
        (Container.clientManager.jiraClient as jest.Mock).mockResolvedValue(mockClient);
        (Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite as jest.Mock).mockReturnValue(mockFields);
        (Container.jiraSettingsManager.getEpicFieldsForSite as jest.Mock).mockResolvedValue(mockEpicFieldInfo);
        (Container.jiraSettingsManager.getIssueLinkTypes as jest.Mock).mockResolvedValue([]);
        (Container.jiraSettingsManager.getIssueCreateMetadata as jest.Mock).mockResolvedValue({});
        (readSearchResults as jest.Mock).mockResolvedValue(mockSearchResult);
    });

    it('should fetch issues using JQL query with parallel calls when performance is enabled', async () => {
        // Enable performance mode
        (FeatureFlagClient.checkExperimentValue as jest.Mock).mockReturnValue(true);

        // Execute the function
        const result = await issuesForJQL(mockJql, mockSite);

        // Verify feature flag was checked
        expect(FeatureFlagClient.checkExperimentValue).toHaveBeenCalledWith(Experiments.AtlascodePerformanceExperiment);

        // Verify dependencies were called with correct parameters
        expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSite);
        expect(Container.jiraSettingsManager.getEpicFieldsForSite).toHaveBeenCalledWith(mockSite);
        expect(Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite).toHaveBeenCalledWith(mockEpicFieldInfo);
        expect(Container.jiraSettingsManager.getIssueLinkTypes).toHaveBeenCalledWith(mockSite);
        expect(Container.jiraSettingsManager.getIssueCreateMetadata).toHaveBeenCalledWith('TEST', mockSite);
        expect(mockClient.searchForIssuesUsingJqlGet).toHaveBeenCalledWith(mockJql, mockFields, MAX_RESULTS, 0);
        expect(readSearchResults).toHaveBeenCalledWith({}, mockSite, mockEpicFieldInfo);

        // Verify correct data is returned
        expect(result).toEqual(mockIssues);
    });

    it('should fetch issues using JQL query with sequential calls when performance is disabled', async () => {
        // Performance mode is disabled by default in beforeEach

        // Execute the function
        const result = await issuesForJQL(mockJql, mockSite);

        // Verify feature flag was checked
        expect(FeatureFlagClient.checkExperimentValue).toHaveBeenCalledWith(Experiments.AtlascodePerformanceExperiment);

        // Verify dependencies were called with correct parameters
        expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSite);
        expect(Container.jiraSettingsManager.getEpicFieldsForSite).toHaveBeenCalledWith(mockSite);
        expect(Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite).toHaveBeenCalledWith(mockEpicFieldInfo);
        expect(mockClient.searchForIssuesUsingJqlGet).toHaveBeenCalledWith(mockJql, mockFields, MAX_RESULTS, 0);
        expect(readSearchResults).toHaveBeenCalledWith({}, mockSite, mockEpicFieldInfo);

        // Verify correct data is returned
        expect(result).toEqual(mockIssues);
    });

    it('should only fetch one page of results when fetchAllQueryResults is false', async () => {
        // Set up mock with more results than a single page
        const totalResults = MAX_RESULTS + 50;
        (readSearchResults as jest.Mock).mockResolvedValue({
            issues: mockIssues,
            total: totalResults,
        });

        // Execute the function
        const result = await issuesForJQL(mockJql, mockSite);

        // Verify search was only called once
        expect(mockClient.searchForIssuesUsingJqlGet).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockIssues);
    });

    it('should fetch all pages when fetchAllQueryResults is true', async () => {
        // Setup multi-page results scenario
        Container.config.jira.explorer.fetchAllQueryResults = true;

        const page1Issues = [
            forceCastTo<MinimalIssue<DetailedSiteInfo>>({ key: 'TEST-1' }),
            forceCastTo<MinimalIssue<DetailedSiteInfo>>({ key: 'TEST-2' }),
        ];

        const page2Issues = [
            forceCastTo<MinimalIssue<DetailedSiteInfo>>({ key: 'TEST-3' }),
            forceCastTo<MinimalIssue<DetailedSiteInfo>>({ key: 'TEST-4' }),
        ];

        // First call returns page 1
        (readSearchResults as jest.Mock).mockResolvedValueOnce({
            issues: page1Issues,
            total: 4,
        });

        // Second call returns page 2
        (readSearchResults as jest.Mock).mockResolvedValueOnce({
            issues: page2Issues,
            total: 4,
        });

        // Execute the function
        const result = await issuesForJQL(mockJql, mockSite);

        // Verify search was called twice
        expect(mockClient.searchForIssuesUsingJqlGet).toHaveBeenCalledTimes(2);
        expect(mockClient.searchForIssuesUsingJqlGet).toHaveBeenCalledWith(mockJql, mockFields, MAX_RESULTS, 0);
        expect(mockClient.searchForIssuesUsingJqlGet).toHaveBeenCalledWith(mockJql, mockFields, MAX_RESULTS, 2);

        // Verify we got all issues from both pages
        expect(result).toHaveLength(4);
        expect(result).toEqual([...page1Issues, ...page2Issues]);
    });

    it('should handle server instances with lower page size limits', async () => {
        // Setup scenario where server returns fewer results than requested
        Container.config.jira.explorer.fetchAllQueryResults = true;

        const totalResults = 25;
        const serverPageSize = 10; // Server returns 10 results at a time instead of MAX_RESULTS

        // Create mock issues for each page
        const page1Issues = Array(serverPageSize)
            .fill(null)
            .map((_, i) => forceCastTo<MinimalIssue<DetailedSiteInfo>>({ key: `TEST-${i + 1}` }));

        const page2Issues = Array(serverPageSize)
            .fill(null)
            .map((_, i) => forceCastTo<MinimalIssue<DetailedSiteInfo>>({ key: `TEST-${i + serverPageSize + 1}` }));

        const page3Issues = Array(totalResults - 2 * serverPageSize)
            .fill(null)
            .map((_, i) => forceCastTo<MinimalIssue<DetailedSiteInfo>>({ key: `TEST-${i + 2 * serverPageSize + 1}` }));

        // Setup mock responses
        (readSearchResults as jest.Mock).mockResolvedValueOnce({
            issues: page1Issues,
            total: totalResults,
        });

        (readSearchResults as jest.Mock).mockResolvedValueOnce({
            issues: page2Issues,
            total: totalResults,
        });

        (readSearchResults as jest.Mock).mockResolvedValueOnce({
            issues: page3Issues,
            total: totalResults,
        });

        // Execute the function
        const result = await issuesForJQL(mockJql, mockSite);

        // Verify search was called three times with correct offsets
        expect(mockClient.searchForIssuesUsingJqlGet).toHaveBeenCalledTimes(3);
        expect(mockClient.searchForIssuesUsingJqlGet).toHaveBeenCalledWith(mockJql, mockFields, MAX_RESULTS, 0);
        expect(mockClient.searchForIssuesUsingJqlGet).toHaveBeenCalledWith(mockJql, mockFields, MAX_RESULTS, 10);
        expect(mockClient.searchForIssuesUsingJqlGet).toHaveBeenCalledWith(mockJql, mockFields, MAX_RESULTS, 20);

        // Verify we got all issues from all pages
        expect(result).toHaveLength(totalResults);
        expect(result).toEqual([...page1Issues, ...page2Issues, ...page3Issues]);
    });

    it('should handle errors gracefully by rejecting with the error', async () => {
        // Setup error scenario
        const errorMessage = 'API Error';
        mockClient.searchForIssuesUsingJqlGet.mockRejectedValue(new Error(errorMessage));

        // Execute the function and verify it rejects with the error
        await expect(issuesForJQL(mockJql, mockSite)).rejects.toThrow(errorMessage);
    });

    it('should correctly extract project keys from different issues and cache metadata calls when performance is enabled', async () => {
        // Enable performance mode
        (FeatureFlagClient.checkExperimentValue as jest.Mock).mockReturnValue(true);

        // Setup issues from multiple projects
        const multiProjectIssues = [
            forceCastTo<MinimalIssue<DetailedSiteInfo>>({ key: 'PROJ1-123' }),
            forceCastTo<MinimalIssue<DetailedSiteInfo>>({ key: 'PROJ2-456' }),
            forceCastTo<MinimalIssue<DetailedSiteInfo>>({ key: 'PROJ1-789' }), // Duplicate project
            forceCastTo<MinimalIssue<DetailedSiteInfo>>({ key: 'PROJ3-101' }),
        ];

        (readSearchResults as jest.Mock).mockResolvedValue({
            issues: multiProjectIssues,
            total: multiProjectIssues.length,
        });

        // Execute the function
        const result = await issuesForJQL(mockJql, mockSite);

        // Verify getIssueCreateMetadata was called for each unique project
        expect(Container.jiraSettingsManager.getIssueCreateMetadata).toHaveBeenCalledTimes(3);
        expect(Container.jiraSettingsManager.getIssueCreateMetadata).toHaveBeenCalledWith('PROJ1', mockSite);
        expect(Container.jiraSettingsManager.getIssueCreateMetadata).toHaveBeenCalledWith('PROJ2', mockSite);
        expect(Container.jiraSettingsManager.getIssueCreateMetadata).toHaveBeenCalledWith('PROJ3', mockSite);

        // Verify correct data is returned
        expect(result).toEqual(multiProjectIssues);
    });

    it('should not cache metadata calls when performance is disabled', async () => {
        // Performance mode is disabled by default in beforeEach

        // Setup issues from multiple projects
        const multiProjectIssues = [
            forceCastTo<MinimalIssue<DetailedSiteInfo>>({ key: 'PROJ1-123' }),
            forceCastTo<MinimalIssue<DetailedSiteInfo>>({ key: 'PROJ2-456' }),
        ];

        (readSearchResults as jest.Mock).mockResolvedValue({
            issues: multiProjectIssues,
            total: multiProjectIssues.length,
        });

        // Execute the function
        const result = await issuesForJQL(mockJql, mockSite);

        // Verify getIssueCreateMetadata was not called when performance is disabled
        expect(Container.jiraSettingsManager.getIssueCreateMetadata).not.toHaveBeenCalled();

        // Verify correct data is returned
        expect(result).toEqual(multiProjectIssues);
    });

    it('should handle empty results without calling metadata functions', async () => {
        // Setup empty results
        (readSearchResults as jest.Mock).mockResolvedValue({
            issues: [],
            total: 0,
        });

        // Execute the function
        const result = await issuesForJQL(mockJql, mockSite);

        // Verify metadata functions were not called for empty results
        expect(Container.jiraSettingsManager.getIssueLinkTypes).not.toHaveBeenCalled();
        expect(Container.jiraSettingsManager.getIssueCreateMetadata).not.toHaveBeenCalled();

        // Verify empty array is returned
        expect(result).toEqual([]);
    });
});
