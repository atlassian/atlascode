import { createIssueUI, editIssueUI } from '@atlassianlabs/jira-metaui-client';
import { DEFAULT_API_VERSION } from '@atlassianlabs/jira-pi-client';
import * as jiraPiCommonModels from '@atlassianlabs/jira-pi-common-models';
import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
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

        // Setup Container mock
        (Container.clientManager as any) = {
            jiraClient: jest.fn().mockResolvedValue(mockClient),
        };

        (Container.jiraSettingsManager as any) = {
            getMinimalIssueFieldIdsForSite: jest.fn().mockReturnValue(mockFieldIds),
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
        it('should call client manager and createIssueUI', async () => {
            const result = await fetchCreateIssueUI(mockSiteDetails, mockProjectKey);

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
        it('should fetch issue data', async () => {
            const result = await fetchMinimalIssue(mockIssueKey, mockSiteDetails);

            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(Container.jiraSettingsManager.getEpicFieldsForSite).toHaveBeenCalledWith(mockSiteDetails);
            expect(Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite).toHaveBeenCalledWith(mockEpicInfo);
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
            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(Container.jiraSettingsManager.getEpicFieldsForSite).toHaveBeenCalledWith(mockSiteDetails);
            expect(Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite).toHaveBeenCalledWith(mockEpicInfo);
            expect(mockClient.getIssue).toHaveBeenCalledWith(mockIssueKey, mockFieldIds);
            expect(result).toBe(mockMinimalIssue);
        });

        it('should fetch issue if cached item is not a MinimalIssue', async () => {
            // Setup isMinimalIssue to return false for this test
            (jiraPiCommonModels.isMinimalIssue as any as jest.Mock).mockReturnValueOnce(false);

            const result = await getCachedOrFetchMinimalIssue(mockIssueKey, mockSiteDetails);

            expect(SearchJiraHelper.findIssue).toHaveBeenCalledWith(mockIssueKey);
            expect(jiraPiCommonModels.isMinimalIssue).toHaveBeenCalledWith(mockMinimalIssue);
            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(Container.jiraSettingsManager.getEpicFieldsForSite).toHaveBeenCalledWith(mockSiteDetails);
            expect(Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite).toHaveBeenCalledWith(mockEpicInfo);
            expect(mockClient.getIssue).toHaveBeenCalledWith(mockIssueKey, mockFieldIds);
            expect(result).toBe(mockMinimalIssue);
        });
    });

    describe('fetchEditIssueUI', () => {
        it('should call client manager and editIssueUI', async () => {
            const result = await fetchEditIssueUI(mockMinimalIssue);

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

        it('should extract project key correctly from issue key', async () => {
            const issueWithComplexKey = expansionCastTo<MinimalIssue<DetailedSiteInfo>>({
                key: 'COMPLEX_PROJECT-999',
                summary: 'Test issue with complex project key',
                siteDetails: mockSiteDetails,
            });

            const result = await fetchEditIssueUI(issueWithComplexKey);

            expect(Container.jiraSettingsManager.getIssueCreateMetadata).toHaveBeenCalledWith(
                'COMPLEX_PROJECT',
                issueWithComplexKey.siteDetails,
            );
            expect(result).toEqual({ fields: [] });
        });
    });

    describe('error handling', () => {
        it('should propagate errors from fetchMinimalIssue', async () => {
            const errorMessage = 'Failed to fetch issue';
            mockClient.getIssue.mockRejectedValue(new Error(errorMessage));

            await expect(fetchMinimalIssue(mockIssueKey, mockSiteDetails)).rejects.toThrow(errorMessage);
        });

        it('should propagate errors from fetchCreateIssueUI', async () => {
            const errorMessage = 'Failed to create issue UI';
            (createIssueUI as jest.Mock).mockRejectedValue(new Error(errorMessage));

            await expect(fetchCreateIssueUI(mockSiteDetails, mockProjectKey)).rejects.toThrow(errorMessage);
        });

        it('should propagate errors from fetchEditIssueUI', async () => {
            const errorMessage = 'Failed to edit issue UI';
            (editIssueUI as jest.Mock).mockRejectedValue(new Error(errorMessage));

            await expect(fetchEditIssueUI(mockMinimalIssue)).rejects.toThrow(errorMessage);
        });
    });

    describe('parallel execution verification', () => {
        it('should call all dependencies in parallel for fetchCreateIssueUI', async () => {
            const startTime = Date.now();

            // Mock all dependencies to take some time
            (Container.jiraSettingsManager.getAllFieldsForSite as jest.Mock).mockImplementation(
                () => new Promise((resolve) => setTimeout(() => resolve(mockFields), 10)),
            );
            (Container.jiraSettingsManager.getIssueLinkTypes as jest.Mock).mockImplementation(
                () => new Promise((resolve) => setTimeout(() => resolve(mockIssueLinkTypes), 10)),
            );
            (Container.jiraSettingsManager.getIssueCreateMetadata as jest.Mock).mockImplementation(
                () => new Promise((resolve) => setTimeout(() => resolve(mockCreateMetadata), 10)),
            );

            await fetchCreateIssueUI(mockSiteDetails, mockProjectKey);

            const endTime = Date.now();
            const executionTime = endTime - startTime;

            // If executed in parallel, should take ~10ms, if sequential would take ~30ms
            expect(executionTime).toBeLessThan(25);
        });

        it('should call dependencies in parallel for fetchMinimalIssue', async () => {
            const startTime = Date.now();

            // Mock dependencies to take some time
            (Container.clientManager.jiraClient as jest.Mock).mockImplementation(
                () => new Promise((resolve) => setTimeout(() => resolve(mockClient), 10)),
            );
            (Container.jiraSettingsManager.getEpicFieldsForSite as jest.Mock).mockImplementation(
                () => new Promise((resolve) => setTimeout(() => resolve(mockEpicInfo), 10)),
            );

            await fetchMinimalIssue(mockIssueKey, mockSiteDetails);

            const endTime = Date.now();
            const executionTime = endTime - startTime;

            // If executed in parallel, should take ~10ms, if sequential would take ~20ms
            expect(executionTime).toBeLessThan(18);
        });
    });
});
