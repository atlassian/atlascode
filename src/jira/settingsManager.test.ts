import { EpicFieldInfo, IssueLinkType } from '@atlassianlabs/jira-pi-common-models';
import { Fields } from '@atlassianlabs/jira-pi-meta-models';
import { expansionCastTo } from 'testsutil';

import { DetailedSiteInfo } from '../atlclients/authInfo';
import { Container } from '../container';
import { Logger } from '../logger';
import { JiraSettingsManager } from './settingsManager';

// Mock dependencies
jest.mock('../container');
jest.mock('../logger');

describe('JiraSettingsManager', () => {
    // Mock data
    const mockSiteDetails = expansionCastTo<DetailedSiteInfo>({
        id: 'site-1',
        name: 'Test Site',
    });

    const mockIssueLinkTypes: IssueLinkType[] = [
        {
            id: 'link-1',
            name: 'Blocks',
            inward: 'is blocked by',
            outward: 'blocks',
        },
        {
            id: 'link-2',
            name: 'Relates',
            inward: 'relates to',
            outward: 'relates to',
        },
    ];

    const mockFields = {
        summary: { id: 'summary', name: 'Summary' },
        description: { id: 'description', name: 'Description' },
        'custom-epic-link': { id: 'custom-epic-link', name: 'Epic Link' },
        'custom-epic-name': { id: 'custom-epic-name', name: 'Epic Name' },
    } as unknown as Fields;

    const mockJiraClient = {
        getIssueLinkTypes: jest.fn(),
        getFields: jest.fn(),
    };

    let settingsManager: JiraSettingsManager;

    // Setup before each test
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Container mock
        (Container.clientManager as any) = {
            jiraClient: jest.fn().mockResolvedValue(mockJiraClient),
        };

        settingsManager = new JiraSettingsManager();
    });

    describe('getIssueLinkTypes', () => {
        it('should return issue link types when available', async () => {
            mockJiraClient.getIssueLinkTypes.mockResolvedValueOnce(mockIssueLinkTypes);

            const result = await settingsManager.getIssueLinkTypes(mockSiteDetails);

            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(mockJiraClient.getIssueLinkTypes).toHaveBeenCalled();
            expect(result).toEqual(mockIssueLinkTypes);
        });

        it('should return empty array when error occurs', async () => {
            mockJiraClient.getIssueLinkTypes.mockRejectedValueOnce(new Error('Test error'));

            const result = await settingsManager.getIssueLinkTypes(mockSiteDetails);

            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(Logger.error).toHaveBeenCalled();
            expect(result).toEqual([]);
        });

        it('should return empty array when result is not an array', async () => {
            mockJiraClient.getIssueLinkTypes.mockResolvedValueOnce(null);

            const result = await settingsManager.getIssueLinkTypes(mockSiteDetails);

            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(result).toEqual([]);
        });

        it('should cache results for the same site', async () => {
            mockJiraClient.getIssueLinkTypes.mockResolvedValueOnce(mockIssueLinkTypes);

            // First call - should fetch from API
            await settingsManager.getIssueLinkTypes(mockSiteDetails);

            // Second call - should use cached data
            const result = await settingsManager.getIssueLinkTypes(mockSiteDetails);

            expect(Container.clientManager.jiraClient).toHaveBeenCalledTimes(1);
            expect(mockJiraClient.getIssueLinkTypes).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockIssueLinkTypes);
        });
    });

    describe('getMinimalIssueFieldIdsForSite', () => {
        beforeEach(() => {
            // Mock getEpicFieldsForSite for tests
            jest.spyOn(settingsManager, 'getEpicFieldsForSite').mockImplementation(async () => {
                return {
                    epicsEnabled: true,
                    epicLink: { id: 'custom-epic-link', name: 'Epic Link' },
                    epicName: { id: 'custom-epic-name', name: 'Epic Name' },
                } as EpicFieldInfo;
            });
        });

        it('should return minimal issue fields including epic fields when epics are enabled', async () => {
            const result = await settingsManager.getMinimalIssueFieldIdsForSite(mockSiteDetails);

            // Check that all default fields are included
            expect(result).toContain('summary');
            expect(result).toContain('issuetype');
            expect(result).toContain('status');
            expect(result).toContain('priority');
            expect(result).toContain('description');
            expect(result).toContain('created');
            expect(result).toContain('updated');
            expect(result).toContain('parent');
            expect(result).toContain('subtasks');
            expect(result).toContain('issuelinks');

            // Check that epic fields are included
            expect(result).toContain('custom-epic-link');
            expect(result).toContain('custom-epic-name');
        });

        it('should return minimal issue fields without epic fields when epics are disabled', async () => {
            jest.spyOn(settingsManager, 'getEpicFieldsForSite').mockImplementation(async () => {
                return {
                    epicsEnabled: false,
                    epicLink: { id: 'custom-epic-link', name: 'Epic Link' },
                    epicName: { id: 'custom-epic-name', name: 'Epic Name' },
                } as EpicFieldInfo;
            });

            const result = await settingsManager.getMinimalIssueFieldIdsForSite(mockSiteDetails);

            // Check that all default fields are included
            expect(result).toContain('summary');
            expect(result).toContain('issuetype');

            // Check that epic fields are not included
            expect(result).not.toContain('custom-epic-link');
            expect(result).not.toContain('custom-epic-name');
        });
    });

    describe('getDetailedIssueFieldIdsForSite', () => {
        beforeEach(() => {
            // Mock getEpicFieldsForSite for tests
            jest.spyOn(settingsManager, 'getEpicFieldsForSite').mockImplementation(async () => {
                return {
                    epicsEnabled: true,
                    epicLink: { id: 'custom-epic-link', name: 'Epic Link' },
                    epicName: { id: 'custom-epic-name', name: 'Epic Name' },
                } as EpicFieldInfo;
            });
        });

        it('should return detailed issue fields including epic fields when epics are enabled', async () => {
            const result = await settingsManager.getDetailedIssueFieldIdsForSite(mockSiteDetails);

            // Check that detailed fields are included
            expect(result).toContain('summary');
            expect(result).toContain('description');
            expect(result).toContain('comment');
            expect(result).toContain('issuetype');
            expect(result).toContain('labels');
            expect(result).toContain('attachment');
            expect(result).toContain('priority');
            expect(result).toContain('components');
            expect(result).toContain('fixVersions');

            // Check that epic fields are included
            expect(result).toContain('custom-epic-link');
            expect(result).toContain('custom-epic-name');
        });

        it('should return detailed issue fields without epic fields when epics are disabled', async () => {
            jest.spyOn(settingsManager, 'getEpicFieldsForSite').mockImplementation(async () => {
                return {
                    epicsEnabled: false,
                    epicLink: { id: 'custom-epic-link', name: 'Epic Link' },
                    epicName: { id: 'custom-epic-name', name: 'Epic Name' },
                } as EpicFieldInfo;
            });

            const result = await settingsManager.getDetailedIssueFieldIdsForSite(mockSiteDetails);

            // Check that detailed fields are included
            expect(result).toContain('summary');
            expect(result).toContain('description');

            // Check that epic fields are not included
            expect(result).not.toContain('custom-epic-link');
            expect(result).not.toContain('custom-epic-name');
        });
    });

    describe('getEpicFieldsForSite', () => {
        it('should return epic field info from all fields', async () => {
            jest.spyOn(settingsManager, 'getAllFieldsForSite').mockResolvedValueOnce(mockFields);

            const result = await settingsManager.getEpicFieldsForSite(mockSiteDetails);

            expect(settingsManager.getAllFieldsForSite).toHaveBeenCalledWith(mockSiteDetails);
            // Since we're mocking getEpicFieldInfo indirectly, we just check that it returns something
            expect(result).toBeDefined();
        });
    });

    describe('getAllFieldsForSite', () => {
        it('should fetch and return all fields for a site', async () => {
            mockJiraClient.getFields.mockResolvedValueOnce([
                { id: 'summary', name: 'Summary', key: 'summary' },
                { id: 'description', name: 'Description', key: 'description' },
            ]);

            const result = await settingsManager.getAllFieldsForSite(mockSiteDetails);

            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(mockJiraClient.getFields).toHaveBeenCalled();
            expect(result).toHaveProperty('summary');
            expect(result).toHaveProperty('description');
        });

        it('should handle fields with no key property', async () => {
            mockJiraClient.getFields.mockResolvedValueOnce([
                { id: 'summary', name: 'Summary' },
                { id: 'description', name: 'Description' },
            ]);

            const result = await settingsManager.getAllFieldsForSite(mockSiteDetails);

            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(mockJiraClient.getFields).toHaveBeenCalled();
            expect(result).toHaveProperty('summary');
            expect(result).toHaveProperty('description');
        });

        it('should cache fields for the same site', async () => {
            mockJiraClient.getFields.mockResolvedValueOnce([
                { id: 'summary', name: 'Summary', key: 'summary' },
                { id: 'description', name: 'Description', key: 'description' },
            ]);

            // First call - should fetch from API
            await settingsManager.getAllFieldsForSite(mockSiteDetails);

            // Second call - should use cached data
            await settingsManager.getAllFieldsForSite(mockSiteDetails);

            expect(Container.clientManager.jiraClient).toHaveBeenCalledTimes(1);
            expect(mockJiraClient.getFields).toHaveBeenCalledTimes(1);
        });

        it('should return empty object if fields is null', async () => {
            mockJiraClient.getFields.mockResolvedValueOnce(null);

            const result = await settingsManager.getAllFieldsForSite(mockSiteDetails);

            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(result).toEqual({});
        });
    });
});
