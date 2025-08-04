import {
    AutocompleteSuggestionsResult,
    GroupPickerResult,
    IssuePickerResult,
    Project,
} from '@atlassianlabs/jira-pi-common-models';
import { ValueType } from '@atlassianlabs/jira-pi-meta-models';
import { expansionCastTo } from 'testsutil/miscFunctions';

import { DetailedSiteInfo, emptySiteInfo, ProductJira } from '../atlclients/authInfo';
import { Container } from '../container';
import { FetchQueryAction } from '../ipc/issueActions';
import { Logger } from '../logger';
import { AbstractIssueEditorWebview } from './abstractIssueEditorWebview';

// Mock all dependencies
jest.mock('../container', () => ({
    Container: {
        clientManager: {
            jiraClient: jest.fn(),
        },
    },
}));

jest.mock('../commands/jira/showIssue', () => ({
    showIssue: jest.fn(),
}));

jest.mock('../logger', () => ({
    Logger: {
        error: jest.fn(),
    },
}));

// Create a concrete implementation of the abstract class for testing
class TestIssueEditorWebview extends AbstractIssueEditorWebview {
    constructor() {
        super('/mock/extension/path');
    }

    async handleSelectOptionCreated(fieldKey: string, newValue: any, nonce?: string): Promise<void> {
        // Mock implementation for testing
        this.postMessage({ type: 'selectOptionCreated', fieldKey, newValue, nonce });
    }

    // Required abstract properties and methods
    get title(): string {
        return 'Test Issue Editor';
    }
    get id(): string {
        return 'test-issue-editor';
    }
    async invalidate(): Promise<void> {
        /* mock implementation */
    }
    get siteOrUndefined(): DetailedSiteInfo | undefined {
        return undefined;
    }
    get productOrUndefined(): any {
        return undefined;
    }

    // Add mock methods for abstract webview functionality
    override postMessage = jest.fn();
    override formatErrorReason = jest.fn((error: any, defaultMessage: string) => defaultMessage);

    // Expose protected methods for testing
    public testFormatSelectOptions(msg: FetchQueryAction, result: any, valueType?: ValueType): any[] {
        return this.formatSelectOptions(msg, result, valueType);
    }

    public async testOnMessageReceived(msg: any): Promise<boolean> {
        return this.onMessageReceived(msg);
    }
}

describe('AbstractIssueEditorWebview', () => {
    let webview: TestIssueEditorWebview;
    let mockJiraClient: any;
    let mockSiteInfo: DetailedSiteInfo;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSiteInfo = {
            ...emptySiteInfo,
            id: 'test-site',
            name: 'Test Site',
            host: 'test.atlassian.net',
            isCloud: true,
            product: ProductJira,
        };

        mockJiraClient = {
            getAutocompleteDataFromUrl: jest.fn(),
            getIssuePickerSuggestions: jest.fn(),
            postCreateUrl: jest.fn(),
        };

        (Container.clientManager.jiraClient as jest.Mock).mockResolvedValue(mockJiraClient);

        webview = new TestIssueEditorWebview();
    });

    describe('formatSelectOptions', () => {
        let mockMsg: FetchQueryAction;

        beforeEach(() => {
            mockMsg = {
                action: 'fetchSelectOptions',
                query: 'test',
                site: mockSiteInfo,
                autocompleteUrl: 'https://test.atlassian.net/rest/api/2/autocomplete',
                nonce: 'test-nonce',
                valueType: ValueType.String,
            };
        });

        it('should format issue picker results correctly', () => {
            const mockResult: IssuePickerResult = {
                sections: [
                    {
                        issues: [
                            {
                                key: 'TEST-1',
                                keyHtml: 'TEST-1',
                                summaryText: 'Test Issue 1',
                                img: '',
                                summary: 'Test Issue 1',
                            },
                            {
                                key: 'TEST-2',
                                keyHtml: 'TEST-2',
                                summaryText: 'Test Issue 2',
                                img: '',
                                summary: 'Test Issue 2',
                            },
                        ],
                    },
                    {
                        issues: [
                            {
                                key: 'TEST-3',
                                keyHtml: 'TEST-3',
                                summaryText: 'Test Issue 3',
                                img: '',
                                summary: 'Test Issue 3',
                            },
                        ],
                    },
                ],
            };

            const result = webview.testFormatSelectOptions(mockMsg, mockResult);

            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({
                key: 'TEST-1',
                keyHtml: 'TEST-1',
                summaryText: 'Test Issue 1',
                img: '',
                summary: 'Test Issue 1',
            });
            expect(result[1]).toEqual({
                key: 'TEST-2',
                keyHtml: 'TEST-2',
                summaryText: 'Test Issue 2',
                img: '',
                summary: 'Test Issue 2',
            });
            expect(result[2]).toEqual({
                key: 'TEST-3',
                keyHtml: 'TEST-3',
                summaryText: 'Test Issue 3',
                img: '',
                summary: 'Test Issue 3',
            });
        });

        it('should format group picker results correctly', () => {
            const mockResult: GroupPickerResult = {
                groups: [
                    { name: 'group1', html: 'Group 1' },
                    { name: 'group2', html: 'Group 2' },
                ],
            };

            const result = webview.testFormatSelectOptions(mockMsg, mockResult);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({ label: 'Group 1', value: 'group1' });
            expect(result[1]).toEqual({ label: 'Group 2', value: 'group2' });
        });

        it('should format autocomplete suggestions results correctly', () => {
            const mockResult: AutocompleteSuggestionsResult = {
                results: [
                    { displayName: 'Option 1', value: 'option1' },
                    { displayName: 'Option 2', value: 'option2' },
                ],
            };

            const result = webview.testFormatSelectOptions(mockMsg, mockResult);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({ label: 'Option 1', value: 'option1' });
            expect(result[1]).toEqual({ label: 'Option 2', value: 'option2' });
        });

        it('should format projects results for cloud correctly', () => {
            const mockResult = {
                values: [
                    {
                        key: 'PROJ1',
                        name: 'Project 1',
                        id: '1',
                        avatarUrls: {},
                        projectTypeKey: 'software',
                        self: 'url1',
                        simplified: false,
                        style: 'classic',
                    },
                    {
                        key: 'PROJ2',
                        name: 'Project 2',
                        id: '2',
                        avatarUrls: {},
                        projectTypeKey: 'software',
                        self: 'url2',
                        simplified: false,
                        style: 'classic',
                    },
                ],
            };

            const result = webview.testFormatSelectOptions(mockMsg, mockResult);

            expect(result).toHaveLength(2);
            expect(result).toEqual(mockResult.values);
        });

        it('should filter projects results for server based on query', () => {
            const serverMsg = { ...mockMsg, site: { ...mockSiteInfo, isCloud: false } };
            const mockResult = {
                values: [
                    {
                        key: 'PROJ1',
                        name: 'Project One',
                        id: '1',
                        avatarUrls: {},
                        projectTypeKey: 'software',
                        self: 'url1',
                        simplified: false,
                        style: 'classic',
                    },
                    {
                        key: 'PROJ2',
                        name: 'Project Two',
                        id: '2',
                        avatarUrls: {},
                        projectTypeKey: 'software',
                        self: 'url2',
                        simplified: false,
                        style: 'classic',
                    },
                    {
                        key: 'TEST',
                        name: 'Test Project',
                        id: '3',
                        avatarUrls: {},
                        projectTypeKey: 'software',
                        self: 'url3',
                        simplified: false,
                        style: 'classic',
                    },
                ],
            };

            const result = webview.testFormatSelectOptions(serverMsg, mockResult);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                key: 'TEST',
                name: 'Test Project',
                id: '3',
                avatarUrls: {},
                projectTypeKey: 'software',
                self: 'url3',
                simplified: false,
                style: 'classic',
            });
        });

        it('should filter projects array for server based on query', () => {
            const serverMsg = { ...mockMsg, site: { ...mockSiteInfo, isCloud: false } };
            const mockResult: Project[] = [
                expansionCastTo<Project>({
                    key: 'PROJ1',
                    name: 'Project One',
                    id: '1',
                    avatarUrls: {},
                    projectTypeKey: 'software',
                    self: 'url1',
                    simplified: false,
                    style: 'classic',
                }),
                expansionCastTo<Project>({
                    key: 'PROJ2',
                    name: 'Project Two',
                    id: '2',
                    avatarUrls: {},
                    projectTypeKey: 'software',
                    self: 'url2',
                    simplified: false,
                    style: 'classic',
                }),
                expansionCastTo<Project>({
                    key: 'TEST',
                    name: 'Test Project',
                    id: '3',
                    avatarUrls: {},
                    projectTypeKey: 'software',
                    self: 'url3',
                    simplified: false,
                    style: 'classic',
                }),
            ];

            const result = webview.testFormatSelectOptions(serverMsg, mockResult);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                key: 'TEST',
                name: 'Test Project',
                id: '3',
                avatarUrls: {},
                projectTypeKey: 'software',
                self: 'url3',
                simplified: false,
                style: 'classic',
            });
        });

        it('should return array results as-is', () => {
            const mockResult = [
                { id: 1, name: 'Item 1' },
                { id: 2, name: 'Item 2' },
            ];

            const result = webview.testFormatSelectOptions(mockMsg, mockResult);

            expect(result).toEqual(mockResult);
        });

        it('should return empty array for unknown result types', () => {
            const mockResult = { unknown: 'format' };

            const result = webview.testFormatSelectOptions(mockMsg, mockResult);

            expect(result).toEqual([]);
        });
    });

    describe('onMessageReceived', () => {
        it('should handle fetchIssues action with autocomplete URL', async () => {
            const mockMessage = {
                action: 'fetchIssues',
                query: 'test',
                site: mockSiteInfo,
                autocompleteUrl: 'https://test.atlassian.net/rest/api/2/autocomplete?query=',
                nonce: 'test-nonce',
            };

            const mockResult: IssuePickerResult = {
                sections: [
                    {
                        issues: [
                            {
                                key: 'TEST-1',
                                keyHtml: 'TEST-1',
                                summaryText: 'Test Issue 1',
                                img: '',
                                summary: 'Test Issue 1',
                            },
                        ],
                    },
                ],
            };

            mockJiraClient.getAutocompleteDataFromUrl.mockResolvedValue(mockResult);

            const handled = await webview.testOnMessageReceived(mockMessage);

            expect(handled).toBe(true);
            expect(mockJiraClient.getAutocompleteDataFromUrl).toHaveBeenCalledWith(
                'https://test.atlassian.net/rest/api/2/autocomplete?query=test',
            );
            expect(webview.postMessage).toHaveBeenCalledWith({
                type: 'issueSuggestionsList',
                issues: [
                    { key: 'TEST-1', keyHtml: 'TEST-1', summaryText: 'Test Issue 1', img: '', summary: 'Test Issue 1' },
                ],
                nonce: 'test-nonce',
            });
        });

        it('should handle fetchIssues action without autocomplete URL', async () => {
            const mockMessage = {
                action: 'fetchIssues',
                query: 'test',
                site: mockSiteInfo,
                nonce: 'test-nonce',
            };

            const mockSuggestions = [
                { key: 'TEST-1', keyHtml: 'TEST-1', summaryText: 'Test Issue 1', img: '', summary: 'Test Issue 1' },
            ];

            mockJiraClient.getIssuePickerSuggestions.mockResolvedValue(mockSuggestions);

            const handled = await webview.testOnMessageReceived(mockMessage);

            expect(handled).toBe(true);
            expect(mockJiraClient.getIssuePickerSuggestions).toHaveBeenCalledWith('test');
            expect(webview.postMessage).toHaveBeenCalledWith({
                type: 'issueSuggestionsList',
                issues: mockSuggestions,
                nonce: 'test-nonce',
            });
        });

        it('should handle fetchIssues action error', async () => {
            const mockMessage = {
                action: 'fetchIssues',
                query: 'test',
                site: mockSiteInfo,
                nonce: 'test-nonce',
            };

            const mockError = new Error('Network error');
            mockJiraClient.getIssuePickerSuggestions.mockRejectedValue(mockError);

            const handled = await webview.testOnMessageReceived(mockMessage);

            expect(handled).toBe(true);
            expect(Logger.error).toHaveBeenCalledWith(mockError, 'Error fetching issues');
            expect(webview.postMessage).toHaveBeenCalledWith({
                type: 'error',
                reason: 'Error fetching issues',
                nonce: 'test-nonce',
            });
        });

        it('should handle fetchSelectOptions action', async () => {
            const mockMessage = {
                action: 'fetchSelectOptions',
                query: 'test',
                site: mockSiteInfo,
                autocompleteUrl: 'https://test.atlassian.net/rest/api/2/autocomplete?query=',
                nonce: 'test-nonce',
            };

            const mockResult = {
                results: [{ displayName: 'Option 1', value: 'option1' }],
            };

            mockJiraClient.getAutocompleteDataFromUrl.mockResolvedValue(mockResult);

            const handled = await webview.testOnMessageReceived(mockMessage);

            expect(handled).toBe(true);
            expect(mockJiraClient.getAutocompleteDataFromUrl).toHaveBeenCalledWith(
                'https://test.atlassian.net/rest/api/2/autocomplete?query=test',
            );
            expect(webview.postMessage).toHaveBeenCalledWith({
                type: 'selectOptionsList',
                options: [{ label: 'Option 1', value: 'option1' }],
                nonce: 'test-nonce',
            });
        });

        it('should handle fetchSelectOptions action error', async () => {
            const mockMessage = {
                action: 'fetchSelectOptions',
                query: 'test',
                site: mockSiteInfo,
                autocompleteUrl: 'https://test.atlassian.net/rest/api/2/autocomplete?query=',
                nonce: 'test-nonce',
            };

            const mockError = new Error('Network error');
            mockJiraClient.getAutocompleteDataFromUrl.mockRejectedValue(mockError);

            const handled = await webview.testOnMessageReceived(mockMessage);

            expect(handled).toBe(true);
            expect(Logger.error).toHaveBeenCalledWith(mockError, 'Error fetching options');
            expect(webview.postMessage).toHaveBeenCalledWith({
                type: 'error',
                reason: 'Error fetching options',
                nonce: 'test-nonce',
            });
        });

        it('should handle openJiraIssue action', async () => {
            const { showIssue } = require('../commands/jira/showIssue');
            const mockMessage = {
                action: 'openJiraIssue',
                issueOrKey: 'TEST-1',
            };

            const handled = await webview.testOnMessageReceived(mockMessage);

            expect(handled).toBe(true);
            expect(showIssue).toHaveBeenCalledWith('TEST-1');
        });

        it('should handle createOption action', async () => {
            const mockMessage = {
                action: 'createOption',
                fieldKey: 'customfield_10000',
                siteDetails: mockSiteInfo,
                createUrl: 'https://test.atlassian.net/rest/api/2/customFieldOption',
                createData: { value: 'New Option' },
                nonce: 'test-nonce',
            };

            const mockResult = { id: '123', value: 'New Option' };
            mockJiraClient.postCreateUrl.mockResolvedValue(mockResult);

            const handled = await webview.testOnMessageReceived(mockMessage);

            expect(handled).toBe(true);
            expect(mockJiraClient.postCreateUrl).toHaveBeenCalledWith(
                'https://test.atlassian.net/rest/api/2/customFieldOption',
                { value: 'New Option' },
            );
            expect(webview.postMessage).toHaveBeenCalledWith({
                type: 'selectOptionCreated',
                fieldKey: 'customfield_10000',
                newValue: mockResult,
                nonce: 'test-nonce',
            });
        });

        it('should handle createOption action error', async () => {
            const mockMessage = {
                action: 'createOption',
                fieldKey: 'customfield_10000',
                siteDetails: mockSiteInfo,
                createUrl: 'https://test.atlassian.net/rest/api/2/customFieldOption',
                createData: { value: 'New Option' },
                nonce: 'test-nonce',
            };

            const mockError = new Error('Create failed');
            mockJiraClient.postCreateUrl.mockRejectedValue(mockError);

            const handled = await webview.testOnMessageReceived(mockMessage);

            expect(handled).toBe(true);
            expect(Logger.error).toHaveBeenCalledWith(mockError, 'Error creating select option');
            expect(webview.postMessage).toHaveBeenCalledWith({
                type: 'error',
                reason: 'Error creating select option',
                nonce: 'test-nonce',
            });
        });

        it('should not handle unknown actions', async () => {
            const mockMessage = {
                action: 'unknownAction',
                someData: 'test',
            };

            const handled = await webview.testOnMessageReceived(mockMessage);

            expect(handled).toBe(false);
        });

        it('should not handle invalid message format', async () => {
            const mockMessage = {
                action: 'fetchIssues',
                // Missing required fields
            };

            const handled = await webview.testOnMessageReceived(mockMessage);

            expect(handled).toBe(true);
            expect(webview.postMessage).not.toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        it('should handle empty autocomplete URL in fetchSelectOptions', async () => {
            const mockMessage = {
                action: 'fetchSelectOptions',
                query: 'test',
                site: mockSiteInfo,
                autocompleteUrl: '',
                nonce: 'test-nonce',
            };

            const handled = await webview.testOnMessageReceived(mockMessage);

            expect(handled).toBe(true);
            expect(mockJiraClient.getAutocompleteDataFromUrl).not.toHaveBeenCalled();
            expect(webview.postMessage).toHaveBeenCalledWith({
                type: 'selectOptionsList',
                options: [],
                nonce: 'test-nonce',
            });
        });

        it('should handle issue picker result with no sections', () => {
            const mockMsg: FetchQueryAction = {
                action: 'fetchSelectOptions',
                query: 'test',
                site: mockSiteInfo,
                autocompleteUrl: 'https://test.atlassian.net/rest/api/2/autocomplete',
                nonce: 'test-nonce',
                valueType: ValueType.String,
            };

            const mockResult: IssuePickerResult = {
                sections: undefined as any,
            };

            const result = webview.testFormatSelectOptions(mockMsg, mockResult);

            expect(result).toEqual([]);
        });

        it('should handle project filtering with partial matches', () => {
            const serverMsg: FetchQueryAction = {
                action: 'fetchSelectOptions',
                query: 'proj',
                site: { ...mockSiteInfo, isCloud: false },
                autocompleteUrl: 'https://test.atlassian.net/rest/api/2/autocomplete',
                nonce: 'test-nonce',
                valueType: ValueType.String,
            };

            const mockResult: Project[] = [
                expansionCastTo<Project>({
                    key: 'PROJ1',
                    name: 'My Project',
                    id: '1',
                    avatarUrls: {},
                    projectTypeKey: 'software',
                    self: 'url1',
                    simplified: false,
                    style: 'classic',
                }),
                expansionCastTo<Project>({
                    key: 'TEST',
                    name: 'Test Suite',
                    id: '2',
                    avatarUrls: {},
                    projectTypeKey: 'software',
                    self: 'url2',
                    simplified: false,
                    style: 'classic',
                }),
                expansionCastTo<Project>({
                    key: 'PROJ2',
                    name: 'Another Project',
                    id: '3',
                    avatarUrls: {},
                    projectTypeKey: 'software',
                    self: 'url3',
                    simplified: false,
                    style: 'classic',
                }),
            ];

            const result = webview.testFormatSelectOptions(serverMsg, mockResult);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                key: 'PROJ1',
                name: 'My Project',
                id: '1',
                avatarUrls: {},
                projectTypeKey: 'software',
                self: 'url1',
                simplified: false,
                style: 'classic',
            });
            expect(result[1]).toEqual({
                key: 'PROJ2',
                name: 'Another Project',
                id: '3',
                avatarUrls: {},
                projectTypeKey: 'software',
                self: 'url3',
                simplified: false,
                style: 'classic',
            });
        });
    });
});
