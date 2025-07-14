import { createIssueUI, editIssueUI } from '@atlassianlabs/jira-metaui-client';
import { DEFAULT_API_VERSION } from '@atlassianlabs/jira-pi-client';
import * as jiraPiCommonModels from '@atlassianlabs/jira-pi-common-models';
import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { Experiments, FeatureFlagClient } from 'src/util/featureFlags';
import { expansionCastTo } from 'testsutil';

import { DetailedSiteInfo } from '../atlclients/authInfo';
import { Container } from '../container';
import { SearchJiraHelper } from '../views/jira/searchJiraHelper';
import {
    fetchCreateIssueUI,
    fetchEditIssueUI,
    fetchMinimalIssue,
    getCachedIssue,
    getCachedOrFetchMinimalIssue,
} from './fetchIssue';

// Mock dependencies
jest.mock('@atlassianlabs/jira-metaui-client');
jest.mock('@atlassianlabs/jira-pi-common-models');
jest.mock('../container');
jest.mock('../views/jira/searchJiraHelper');
jest.mock('src/util/featureFlags', () => ({
    FeatureFlagClient: {
        checkExperimentValue: jest.fn(),
    },
    Experiments: {
        AtlascodePerformanceExperiment: 'atlascode-performance-experiment',
    },
}));

describe('fetchIssue', () => {
    // Mock data
    const mockSiteDetails = expansionCastTo<DetailedSiteInfo>({
        id: 'site-1',
        name: 'Test Site',
    });

    const mockProjectKey = 'TEST';
    const mockIssueKey = 'TEST-123';

    const mockMinimalIssue = expansionCastTo<MinimalIssue<DetailedSiteInfo>>({
        key: mockIssueKey,
        summary: 'Test issue',
        siteDetails: mockSiteDetails,
    });

    const mockClient = {
        getIssue: jest.fn(),
    };

    const mockFieldIds = ['field1', 'field2'];
    const mockEpicInfo = { epicNameField: 'customfield_10001', epicLinkField: 'customfield_10002' };
    const mockIssueResponse = { id: '123', key: mockIssueKey, fields: { summary: 'Test issue' } };
    const mockFields = { field1: { id: 'field1', name: 'Field 1' }, field2: { id: 'field2', name: 'Field 2' } };
    const mockIssueLinkTypes = [{ id: '1', name: 'Blocks' }];
    const mockCreateMetadata = { projects: [{ key: mockProjectKey, issuetypes: [] }] };

    // Setup mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock FeatureFlagClient to return false by default
        (FeatureFlagClient.checkExperimentValue as jest.Mock).mockReturnValue(false);

        // Setup Container mock
        (Container.clientManager as any) = {
            jiraClient: jest.fn().mockResolvedValue(mockClient),
        };

        (Container.jiraSettingsManager as any) = {
            getMinimalIssueFieldIdsForSite: jest.fn().mockResolvedValue(mockFieldIds),
            getEpicFieldsForSite: jest.fn().mockResolvedValue(mockEpicInfo),
            getAllFieldsForSite: jest.fn().mockResolvedValue(mockFields),
            getIssueLinkTypes: jest.fn().mockResolvedValue(mockIssueLinkTypes),
            getIssueCreateMetadata: jest.fn().mockResolvedValue(mockCreateMetadata),
        };

        // Setup SearchJiraHelper mock
        (SearchJiraHelper.findIssue as jest.Mock).mockImplementation((key) => {
            return key === mockIssueKey ? mockMinimalIssue : undefined;
        });

        // Setup jira-pi-common-models mocks
        jest.spyOn(jiraPiCommonModels, 'isMinimalIssue').mockImplementation((issue) => {
            return issue === mockMinimalIssue;
        });

        jest.spyOn(jiraPiCommonModels, 'minimalIssueFromJsonObject').mockImplementation(() => {
            return mockMinimalIssue;
        });

        // Setup jira-metaui-client mocks
        (createIssueUI as jest.Mock).mockResolvedValue({
            fields: [],
            issuetypes: [],
            projectKey: mockProjectKey,
        });

        (editIssueUI as jest.Mock).mockResolvedValue({
            fields: [],
        });

        // Setup client mock responses
        mockClient.getIssue.mockResolvedValue(mockIssueResponse);
    });

    describe('fetchCreateIssueUI', () => {
        it('should call client manager and createIssueUI with parallel fetching when performance is enabled', async () => {
            // Enable performance mode
            (FeatureFlagClient.checkExperimentValue as jest.Mock).mockReturnValue(true);

            const result = await fetchCreateIssueUI(mockSiteDetails, mockProjectKey);

            expect(FeatureFlagClient.checkExperimentValue).toHaveBeenCalledWith(
                Experiments.AtlascodePerformanceExperiment,
            );
            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(Container.jiraSettingsManager.getAllFieldsForSite).toHaveBeenCalledWith(mockSiteDetails);
            expect(Container.jiraSettingsManager.getIssueLinkTypes).toHaveBeenCalledWith(mockSiteDetails);
            expect(Container.jiraSettingsManager.getIssueCreateMetadata).toHaveBeenCalledWith(
                mockProjectKey,
                mockSiteDetails,
            );
            expect(createIssueUI).toHaveBeenCalledWith(
                mockProjectKey,
                mockClient,
                DEFAULT_API_VERSION,
                mockFields,
                mockIssueLinkTypes,
                mockCreateMetadata,
                true,
            );
            expect(result).toEqual({
                fields: [],
                issuetypes: [],
                projectKey: mockProjectKey,
            });
        });

        it('should call client manager and createIssueUI without parallel fetching when performance is disabled', async () => {
            // Performance mode is disabled by default in beforeEach
            const result = await fetchCreateIssueUI(mockSiteDetails, mockProjectKey);

            expect(FeatureFlagClient.checkExperimentValue).toHaveBeenCalledWith(
                Experiments.AtlascodePerformanceExperiment,
            );
            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(createIssueUI).toHaveBeenCalledWith(mockProjectKey, mockClient);
            expect(result).toEqual({
                fields: [],
                issuetypes: [],
                projectKey: mockProjectKey,
            });
        });
    });

    describe('getCachedIssue', () => {
        it('should call SearchJiraHelper.findIssue', async () => {
            const result = await getCachedIssue(mockIssueKey);

            expect(SearchJiraHelper.findIssue).toHaveBeenCalledWith(mockIssueKey);
            expect(result).toBe(mockMinimalIssue);
        });

        it('should return undefined for non-existent issue', async () => {
            const result = await getCachedIssue('NON-EXISTENT');

            expect(SearchJiraHelper.findIssue).toHaveBeenCalledWith('NON-EXISTENT');
            expect(result).toBeUndefined();
        });
    });

    describe('fetchMinimalIssue', () => {
        it('should fetch issue data with parallel calls when performance is enabled', async () => {
            // Enable performance mode
            (FeatureFlagClient.checkExperimentValue as jest.Mock).mockReturnValue(true);

            const result = await fetchMinimalIssue(mockIssueKey, mockSiteDetails);

            expect(FeatureFlagClient.checkExperimentValue).toHaveBeenCalledWith(
                Experiments.AtlascodePerformanceExperiment,
            );
            expect(Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite).toHaveBeenCalledWith(mockSiteDetails);
            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(Container.jiraSettingsManager.getEpicFieldsForSite).toHaveBeenCalledWith(mockSiteDetails);
            expect(mockClient.getIssue).toHaveBeenCalledWith(mockIssueKey, mockFieldIds);
            expect(jiraPiCommonModels.minimalIssueFromJsonObject).toHaveBeenCalledWith(
                mockIssueResponse,
                mockSiteDetails,
                mockEpicInfo,
            );
            expect(result).toBe(mockMinimalIssue);
        });

        it('should fetch issue data sequentially when performance is disabled', async () => {
            // Performance mode is disabled by default in beforeEach
            const result = await fetchMinimalIssue(mockIssueKey, mockSiteDetails);

            expect(FeatureFlagClient.checkExperimentValue).toHaveBeenCalledWith(
                Experiments.AtlascodePerformanceExperiment,
            );
            expect(Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite).toHaveBeenCalledWith(mockSiteDetails);
            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(Container.jiraSettingsManager.getEpicFieldsForSite).toHaveBeenCalledWith(mockSiteDetails);
            expect(mockClient.getIssue).toHaveBeenCalledWith(mockIssueKey, mockFieldIds);
            expect(jiraPiCommonModels.minimalIssueFromJsonObject).toHaveBeenCalledWith(
                mockIssueResponse,
                mockSiteDetails,
                mockEpicInfo,
            );
            expect(result).toBe(mockMinimalIssue);
        });
    });

    describe('getCachedOrFetchMinimalIssue', () => {
        it('should return cached issue if it exists and is a MinimalIssue', async () => {
            const result = await getCachedOrFetchMinimalIssue(mockIssueKey, mockSiteDetails);

            expect(SearchJiraHelper.findIssue).toHaveBeenCalledWith(mockIssueKey);
            expect(jiraPiCommonModels.isMinimalIssue).toHaveBeenCalledWith(mockMinimalIssue);
            expect(result).toBe(mockMinimalIssue);
            // Ensure fetch was not called
            expect(mockClient.getIssue).not.toHaveBeenCalled();
        });

        it('should fetch issue if not in cache', async () => {
            // Setup findIssue to return undefined for this test
            (SearchJiraHelper.findIssue as jest.Mock).mockReturnValueOnce(undefined);

            const result = await getCachedOrFetchMinimalIssue(mockIssueKey, mockSiteDetails);

            expect(SearchJiraHelper.findIssue).toHaveBeenCalledWith(mockIssueKey);
            expect(Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite).toHaveBeenCalledWith(mockSiteDetails);
            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(mockClient.getIssue).toHaveBeenCalledWith(mockIssueKey, mockFieldIds);
            expect(result).toBe(mockMinimalIssue);
        });

        it('should fetch issue if cached item is not a MinimalIssue', async () => {
            // Setup isMinimalIssue to return false for this test
            (jiraPiCommonModels.isMinimalIssue as any as jest.Mock).mockReturnValueOnce(false);

            const result = await getCachedOrFetchMinimalIssue(mockIssueKey, mockSiteDetails);

            expect(SearchJiraHelper.findIssue).toHaveBeenCalledWith(mockIssueKey);
            expect(jiraPiCommonModels.isMinimalIssue).toHaveBeenCalledWith(mockMinimalIssue);
            expect(Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite).toHaveBeenCalledWith(mockSiteDetails);
            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(mockClient.getIssue).toHaveBeenCalledWith(mockIssueKey, mockFieldIds);
            expect(result).toBe(mockMinimalIssue);
        });
    });

    describe('fetchEditIssueUI', () => {
        it('should call client manager and editIssueUI with parallel fetching when performance is enabled', async () => {
            // Enable performance mode
            (FeatureFlagClient.checkExperimentValue as jest.Mock).mockReturnValue(true);

            const result = await fetchEditIssueUI(mockMinimalIssue);

            expect(FeatureFlagClient.checkExperimentValue).toHaveBeenCalledWith(
                Experiments.AtlascodePerformanceExperiment,
            );
            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockMinimalIssue.siteDetails);
            expect(Container.jiraSettingsManager.getAllFieldsForSite).toHaveBeenCalledWith(
                mockMinimalIssue.siteDetails,
            );
            expect(Container.jiraSettingsManager.getIssueLinkTypes).toHaveBeenCalledWith(mockMinimalIssue.siteDetails);
            expect(Container.jiraSettingsManager.getIssueCreateMetadata).toHaveBeenCalledWith(
                mockProjectKey,
                mockMinimalIssue.siteDetails,
            );
            expect(editIssueUI).toHaveBeenCalledWith(
                mockMinimalIssue,
                mockClient,
                DEFAULT_API_VERSION,
                mockFields,
                mockIssueLinkTypes,
                mockCreateMetadata,
                true,
            );
            expect(result).toEqual({ fields: [] });
        });

        it('should call client manager and editIssueUI without parallel fetching when performance is disabled', async () => {
            // Performance mode is disabled by default in beforeEach
            const result = await fetchEditIssueUI(mockMinimalIssue);

            expect(FeatureFlagClient.checkExperimentValue).toHaveBeenCalledWith(
                Experiments.AtlascodePerformanceExperiment,
            );
            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockMinimalIssue.siteDetails);
            expect(editIssueUI).toHaveBeenCalledWith(mockMinimalIssue, mockClient);
            expect(result).toEqual({ fields: [] });
        });
    });
});
