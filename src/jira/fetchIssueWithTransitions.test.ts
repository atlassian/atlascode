import { MinimalIssue, minimalIssueFromJsonObject } from '@atlassianlabs/jira-pi-common-models';
import { expansionCastTo } from 'testsutil';

import { DetailedSiteInfo } from '../atlclients/authInfo';
import { Container } from '../container';
import { fetchIssueWithTransitions, fetchMultipleIssuesWithTransitions } from './fetchIssueWithTransitions';

jest.mock('../container');
jest.mock('@atlassianlabs/jira-pi-common-models');

describe('fetchIssueWithTransitions', () => {
    const mockSiteDetails = expansionCastTo<DetailedSiteInfo>({
        id: 'site-1',
        name: 'Test Site',
        host: 'test.atlassian.net',
        baseLinkUrl: 'https://test.atlassian.net',
        baseApiUrl: 'https://test.atlassian.net/rest',
        product: { key: 'jira', name: 'Jira' },
        isCloud: true,
        userId: 'user123',
        credentialId: 'cred-123',
    });

    const mockEpicInfo = {
        epicLinkFieldId: 'customfield_10001',
        epicNameFieldId: 'customfield_10002',
    };

    const mockFieldIds = ['summary', 'status', 'issuetype', 'priority', 'transitions'];

    const mockIssueResponse = {
        key: 'TEST-123',
        fields: {
            summary: 'Test issue',
            status: {
                id: '1',
                name: 'To Do',
                description: 'This issue is in the To Do status',
                iconUrl: 'https://test.atlassian.net/status-icon.png',
                self: 'https://test.atlassian.net/rest/api/2/status/1',
                statusCategory: {
                    id: 1,
                    key: 'new',
                    colorName: 'blue-gray',
                    name: 'New',
                    self: 'https://test.atlassian.net/rest/api/2/statuscategory/1',
                },
            },
            issuetype: {
                id: '10001',
                name: 'Task',
                iconUrl: 'task-icon.png',
            },
            priority: {
                id: '2',
                name: 'High',
                iconUrl: 'high-priority-icon.png',
            },
        },
        transitions: [
            {
                id: '2',
                name: 'Start Progress',
                hasScreen: false,
                isConditional: false,
                isGlobal: true,
                isInitial: false,
                to: {
                    id: '2',
                    name: 'In Progress',
                    description: 'This issue is in progress',
                    iconUrl: 'https://test.atlassian.net/inprogress-icon.png',
                    self: 'https://test.atlassian.net/rest/api/2/status/2',
                    statusCategory: {
                        id: 2,
                        key: 'indeterminate',
                        colorName: 'blue',
                        name: 'In Progress',
                        self: 'https://test.atlassian.net/rest/api/2/statuscategory/2',
                    },
                },
            },
            {
                id: '3',
                name: 'Complete',
                hasScreen: false,
                isConditional: false,
                isGlobal: true,
                isInitial: false,
                to: {
                    id: '3',
                    name: 'Done',
                    description: 'This issue is complete',
                    iconUrl: 'https://test.atlassian.net/done-icon.png',
                    self: 'https://test.atlassian.net/rest/api/2/status/3',
                    statusCategory: {
                        id: 3,
                        key: 'done',
                        colorName: 'green',
                        name: 'Complete',
                        self: 'https://test.atlassian.net/rest/api/2/statuscategory/3',
                    },
                },
            },
        ],
    };

    const mockMinimalIssue = expansionCastTo<MinimalIssue<DetailedSiteInfo>>({
        key: 'TEST-123',
        summary: 'Test issue',
        siteDetails: mockSiteDetails,
        status: {
            id: '1',
            name: 'To Do',
            description: 'This issue is in the To Do status',
            iconUrl: 'https://test.atlassian.net/status-icon.png',
            self: 'https://test.atlassian.net/rest/api/2/status/1',
            statusCategory: {
                id: 1,
                key: 'new',
                colorName: 'blue-gray',
                name: 'New',
                self: 'https://test.atlassian.net/rest/api/2/statuscategory/1',
            },
        },
        transitions: [
            {
                id: '2',
                name: 'Start Progress',
                hasScreen: false,
                isConditional: false,
                isGlobal: true,
                isInitial: false,
                to: {
                    id: '2',
                    name: 'In Progress',
                    description: 'This issue is in progress',
                    iconUrl: 'https://test.atlassian.net/inprogress-icon.png',
                    self: 'https://test.atlassian.net/rest/api/2/status/2',
                    statusCategory: {
                        id: 2,
                        key: 'indeterminate',
                        colorName: 'blue',
                        name: 'In Progress',
                        self: 'https://test.atlassian.net/rest/api/2/statuscategory/2',
                    },
                },
            },
        ],
    });

    const mockClient = {
        getIssue: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();

        (Container.clientManager as any) = {
            jiraClient: jest.fn().mockResolvedValue(mockClient),
        };

        (Container.jiraSettingsManager as any) = {
            getMinimalIssueFieldIdsForSite: jest.fn().mockReturnValue(mockFieldIds),
            getEpicFieldsForSite: jest.fn().mockResolvedValue(mockEpicInfo),
        };

        (minimalIssueFromJsonObject as jest.Mock).mockImplementation(() => {
            return mockMinimalIssue;
        });

        mockClient.getIssue.mockResolvedValue(mockIssueResponse);
    });

    describe('fetchIssueWithTransitions', () => {
        it('should fetch issue with transitions successfully', async () => {
            const result = await fetchIssueWithTransitions('TEST-123', mockSiteDetails);

            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(mockSiteDetails);
            expect(Container.jiraSettingsManager.getEpicFieldsForSite).toHaveBeenCalledWith(mockSiteDetails);
            expect(Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite).toHaveBeenCalledWith(mockEpicInfo);
            expect(mockClient.getIssue).toHaveBeenCalledWith(
                'TEST-123',
                mockFieldIds,
                'transitions,renderedFields,transitions.fields',
            );
            expect(minimalIssueFromJsonObject).toHaveBeenCalledWith(mockIssueResponse, mockSiteDetails, mockEpicInfo);
            expect(result).toBe(mockMinimalIssue);
        });

        it('should handle client errors gracefully', async () => {
            const error = new Error('Network error');
            mockClient.getIssue.mockRejectedValue(error);

            await expect(fetchIssueWithTransitions('TEST-123', mockSiteDetails)).rejects.toThrow('Network error');
        });

        it('should handle container client manager errors', async () => {
            const error = new Error('Client manager error');
            (Container.clientManager.jiraClient as jest.Mock).mockRejectedValue(error);

            await expect(fetchIssueWithTransitions('TEST-123', mockSiteDetails)).rejects.toThrow(
                'Client manager error',
            );
        });

        it('should handle epic fields retrieval errors', async () => {
            const error = new Error('Epic fields error');
            (Container.jiraSettingsManager.getEpicFieldsForSite as jest.Mock).mockRejectedValue(error);

            await expect(fetchIssueWithTransitions('TEST-123', mockSiteDetails)).rejects.toThrow('Epic fields error');
        });

        it('should handle minimalIssueFromJsonObject errors', async () => {
            const error = new Error('Parsing error');
            (minimalIssueFromJsonObject as jest.Mock).mockImplementation(() => {
                throw error;
            });

            await expect(fetchIssueWithTransitions('TEST-123', mockSiteDetails)).rejects.toThrow('Parsing error');
        });

        it('should fetch issue with different issue key', async () => {
            const differentIssueKey = 'PROJ-456';
            await fetchIssueWithTransitions(differentIssueKey, mockSiteDetails);

            expect(mockClient.getIssue).toHaveBeenCalledWith(
                differentIssueKey,
                mockFieldIds,
                'transitions,renderedFields,transitions.fields',
            );
        });

        it('should work with different site details', async () => {
            const differentSiteDetails = expansionCastTo<DetailedSiteInfo>({
                ...mockSiteDetails,
                id: 'different-site',
                host: 'different.atlassian.net',
            });

            await fetchIssueWithTransitions('TEST-123', differentSiteDetails);

            expect(Container.clientManager.jiraClient).toHaveBeenCalledWith(differentSiteDetails);
            expect(Container.jiraSettingsManager.getEpicFieldsForSite).toHaveBeenCalledWith(differentSiteDetails);
            expect(minimalIssueFromJsonObject).toHaveBeenCalledWith(
                mockIssueResponse,
                differentSiteDetails,
                mockEpicInfo,
            );
        });

        it('should handle empty transitions in response', async () => {
            const responseWithoutTransitions = {
                ...mockIssueResponse,
                transitions: [],
            };
            mockClient.getIssue.mockResolvedValue(responseWithoutTransitions);

            const result = await fetchIssueWithTransitions('TEST-123', mockSiteDetails);

            expect(minimalIssueFromJsonObject).toHaveBeenCalledWith(
                responseWithoutTransitions,
                mockSiteDetails,
                mockEpicInfo,
            );
            expect(result).toBe(mockMinimalIssue);
        });

        it('should handle response with missing transitions property', async () => {
            const responseWithoutTransitions = {
                ...mockIssueResponse,
            };
            delete (responseWithoutTransitions as any).transitions;
            mockClient.getIssue.mockResolvedValue(responseWithoutTransitions);

            const result = await fetchIssueWithTransitions('TEST-123', mockSiteDetails);

            expect(minimalIssueFromJsonObject).toHaveBeenCalledWith(
                responseWithoutTransitions,
                mockSiteDetails,
                mockEpicInfo,
            );
            expect(result).toBe(mockMinimalIssue);
        });
    });

    describe('fetchMultipleIssuesWithTransitions', () => {
        it('should fetch multiple issues successfully', async () => {
            const issueKeys = ['TEST-123', 'TEST-456', 'TEST-789'];
            const mockIssues = [
                { ...mockMinimalIssue, key: 'TEST-123' },
                { ...mockMinimalIssue, key: 'TEST-456' },
                { ...mockMinimalIssue, key: 'TEST-789' },
            ];

            mockClient.getIssue
                .mockResolvedValueOnce({ ...mockIssueResponse, key: 'TEST-123' })
                .mockResolvedValueOnce({ ...mockIssueResponse, key: 'TEST-456' })
                .mockResolvedValueOnce({ ...mockIssueResponse, key: 'TEST-789' });

            (minimalIssueFromJsonObject as jest.Mock)
                .mockReturnValueOnce(mockIssues[0])
                .mockReturnValueOnce(mockIssues[1])
                .mockReturnValueOnce(mockIssues[2]);

            const result = await fetchMultipleIssuesWithTransitions(issueKeys, mockSiteDetails);

            expect(result).toHaveLength(3);
            expect(result[0].key).toBe('TEST-123');
            expect(result[1].key).toBe('TEST-456');
            expect(result[2].key).toBe('TEST-789');

            expect(mockClient.getIssue).toHaveBeenCalledTimes(3);
            expect(mockClient.getIssue).toHaveBeenNthCalledWith(
                1,
                'TEST-123',
                mockFieldIds,
                'transitions,renderedFields,transitions.fields',
            );
            expect(mockClient.getIssue).toHaveBeenNthCalledWith(
                2,
                'TEST-456',
                mockFieldIds,
                'transitions,renderedFields,transitions.fields',
            );
            expect(mockClient.getIssue).toHaveBeenNthCalledWith(
                3,
                'TEST-789',
                mockFieldIds,
                'transitions,renderedFields,transitions.fields',
            );
        });

        it('should return empty array when no issue keys provided', async () => {
            const result = await fetchMultipleIssuesWithTransitions([], mockSiteDetails);

            expect(result).toEqual([]);
            expect(mockClient.getIssue).not.toHaveBeenCalled();
            expect(Container.clientManager.jiraClient).not.toHaveBeenCalled();
        });

        it('should handle single issue in array', async () => {
            const issueKeys = ['TEST-123'];
            const result = await fetchMultipleIssuesWithTransitions(issueKeys, mockSiteDetails);

            expect(result).toHaveLength(1);
            expect(result[0]).toBe(mockMinimalIssue);
            expect(mockClient.getIssue).toHaveBeenCalledTimes(1);
        });

        it('should handle partial failures gracefully', async () => {
            const issueKeys = ['TEST-123', 'INVALID-KEY', 'TEST-789'];

            mockClient.getIssue
                .mockResolvedValueOnce({ ...mockIssueResponse, key: 'TEST-123' })
                .mockRejectedValueOnce(new Error('Issue not found'))
                .mockResolvedValueOnce({ ...mockIssueResponse, key: 'TEST-789' });

            await expect(fetchMultipleIssuesWithTransitions(issueKeys, mockSiteDetails)).rejects.toThrow(
                'Issue not found',
            );
        });

        it('should handle all requests failing', async () => {
            const issueKeys = ['INVALID-1', 'INVALID-2'];
            const error = new Error('Network error');

            mockClient.getIssue.mockRejectedValue(error);

            await expect(fetchMultipleIssuesWithTransitions(issueKeys, mockSiteDetails)).rejects.toThrow(
                'Network error',
            );
        });

        it('should maintain order of results matching input order', async () => {
            const issueKeys = ['TEST-C', 'TEST-A', 'TEST-B'];
            const mockIssues = [
                { ...mockMinimalIssue, key: 'TEST-C' },
                { ...mockMinimalIssue, key: 'TEST-A' },
                { ...mockMinimalIssue, key: 'TEST-B' },
            ];

            mockClient.getIssue
                .mockResolvedValueOnce({ ...mockIssueResponse, key: 'TEST-C' })
                .mockResolvedValueOnce({ ...mockIssueResponse, key: 'TEST-A' })
                .mockResolvedValueOnce({ ...mockIssueResponse, key: 'TEST-B' });

            (minimalIssueFromJsonObject as jest.Mock)
                .mockReturnValueOnce(mockIssues[0])
                .mockReturnValueOnce(mockIssues[1])
                .mockReturnValueOnce(mockIssues[2]);

            const result = await fetchMultipleIssuesWithTransitions(issueKeys, mockSiteDetails);

            expect(result).toHaveLength(3);
            expect(result[0].key).toBe('TEST-C');
            expect(result[1].key).toBe('TEST-A');
            expect(result[2].key).toBe('TEST-B');
        });

        it('should handle concurrent requests with same site details', async () => {
            const issueKeys = ['TEST-1', 'TEST-2'];

            const result = await fetchMultipleIssuesWithTransitions(issueKeys, mockSiteDetails);

            expect(result).toHaveLength(2);
            expect(Container.clientManager.jiraClient).toHaveBeenCalledTimes(2);
            expect(Container.jiraSettingsManager.getEpicFieldsForSite).toHaveBeenCalledTimes(2);
        });
    });
});
