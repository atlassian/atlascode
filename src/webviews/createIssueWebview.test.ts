import { IssueType, MinimalORIssueLink, Project } from '@atlassianlabs/jira-pi-common-models';
import { CreateMetaTransformerResult, FieldUI, IssueTypeUI, ValueType } from '@atlassianlabs/jira-pi-meta-models';
import { expansionCastTo } from 'testsutil';
import { Position, Uri, window } from 'vscode';

import { DetailedSiteInfo, emptySiteInfo, ProductJira } from '../atlclients/authInfo';
import { configuration } from '../config/configuration';
import { Container } from '../container';
import * as fetchIssue from '../jira/fetchIssue';
import { WebViewID } from '../lib/ipc/models/common';
import { Logger } from '../logger';
import { SearchJiraHelper } from '../views/jira/searchJiraHelper';
import { CreateIssueWebview, PartialIssue } from './createIssueWebview';

jest.mock('../container', () => ({
    Container: {
        clientManager: {
            jiraClient: jest.fn(),
        },
        siteManager: {
            getSiteForId: jest.fn(),
            getFirstSite: jest.fn(),
            getSitesAvailable: jest.fn(),
            getFirstAAID: jest.fn(),
        },
        jiraProjectManager: {
            getFirstProject: jest.fn(),
            getProjectForKey: jest.fn(),
            getProjects: jest.fn(),
            filterProjectsByPermission: jest.fn(),
        },
        pmfStats: {
            touchActivity: jest.fn(),
        },
        config: {
            jira: {
                lastCreateSiteAndProject: {
                    siteId: '',
                    projectKey: '',
                },
                showCreateIssueProblems: false,
            },
        },
        analyticsClient: {
            sendTrackEvent: jest.fn(),
        },
        createIssueProblemsWebview: {
            createOrShow: jest.fn(),
        },
        machineId: 'test-machine-id',
    },
}));

jest.mock('../config/configuration', () => ({
    ...jest.requireActual('../config/configuration'),
    configuration: {
        setLastCreateSiteAndProject: jest.fn().mockResolvedValue(undefined),
    },
}));

jest.mock('../jira/fetchIssue', () => ({
    fetchCreateIssueUI: jest.fn(),
}));

jest.mock('base64-arraybuffer-es6', () => ({
    decode: jest.fn(),
}));

jest.mock('../logger', () => ({
    Logger: {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('form-data', () => ({
    default: jest.fn(() => ({ append: jest.fn() })),
}));

jest.mock('../commands/jira/showIssue', () => ({
    showIssue: jest.fn(),
}));
// Added feature flag mock as with jiraIssueWebview.test.ts
jest.mock('src/util/featureFlags', () => ({
    FeatureFlagClient: {
        checkExperimentValue: jest.fn(),
    },
    Experiments: {
        AtlascodePerformanceExperiment: 'atlascode-performance-experiment',
    },
}));

jest.mock('../views/jira/searchJiraHelper', () => ({
    SearchJiraHelper: {
        getAssignedIssuesPerSite: jest.fn().mockReturnValue([]),
    },
}));

jest.mock('../analytics', () => ({
    authenticatedEvent: jest.fn(),
    editedEvent: jest.fn(),
    loggedOutEvent: jest.fn(),
    issueCreatedEvent: jest.fn().mockResolvedValue({}),
    jiraIssuePerformanceEvent: jest.fn().mockResolvedValue({}),
}));

const mockWindow = window as jest.Mocked<typeof window>;
describe('CreateIssueWebview', () => {
    // Mock data
    const extensionPath = '/path/to/extension';
    const mockSiteDetails = expansionCastTo<DetailedSiteInfo>({
        id: 'site-1',
        name: 'Test Site',
        avatarUrl: '',
        baseLinkUrl: 'https://test-site.atlassian.net',
        baseApiUrl: 'https://test-site.atlassian.net/api',
        product: ProductJira,
    });

    const mockProject = expansionCastTo<Project>({
        key: 'TEST',
        name: 'Test Project',
    });

    const mockIssueType = expansionCastTo<IssueType>({
        id: 'issueType-1',
        name: 'Bug',
        iconUrl: 'bug-icon-url',
    });

    const mockCreateMetaResult: CreateMetaTransformerResult<DetailedSiteInfo> = {
        selectedIssueType: mockIssueType,
        issueTypeUIs: {
            'issueType-1': expansionCastTo<IssueTypeUI<DetailedSiteInfo>>({
                fields: {
                    summary: expansionCastTo<FieldUI>({ required: true, valueType: ValueType.String }),
                    description: expansionCastTo<FieldUI>({ required: false, valueType: ValueType.String }),
                    issuetype: expansionCastTo<FieldUI>({ required: true, valueType: ValueType.IssueType }),
                    project: expansionCastTo<FieldUI>({ required: true, valueType: ValueType.Project }),
                },
                fieldValues: {
                    issuetype: mockIssueType,
                    project: mockProject,
                },
                selectFieldOptions: {},
            }),
        },
        problems: {},
        issueTypes: [mockIssueType],
    };

    const mockClient = {
        createIssue: jest.fn().mockResolvedValue({ key: 'TEST-123' }),
        createIssueLink: jest.fn().mockResolvedValue({}),
        addAttachments: jest.fn().mockResolvedValue({}),
    };

    let webview: CreateIssueWebview;
    let webviewPostMessageMock: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock FeatureFlagClient to return false by default (performance disabled)
        (Container.featureFlagClient as any) = {
            checkExperimentValue: jest.fn().mockReturnValue(false),
        };

        // Setup mocks
        Container.siteManager.getSiteForId = jest.fn().mockReturnValue(mockSiteDetails);
        Container.siteManager.getFirstSite = jest.fn().mockReturnValue(mockSiteDetails);
        Container.siteManager.getSitesAvailable = jest.fn().mockReturnValue([mockSiteDetails]);

        Container.jiraProjectManager.getFirstProject = jest.fn().mockResolvedValue(mockProject);
        Container.jiraProjectManager.getProjectForKey = jest.fn().mockResolvedValue(mockProject);
        Container.jiraProjectManager.getProjects = jest.fn().mockResolvedValue([mockProject]);
        Container.jiraProjectManager.filterProjectsByPermission = jest.fn().mockResolvedValue([mockProject]);

        Container.clientManager.jiraClient = jest.fn().mockResolvedValue(mockClient);

        jest.spyOn(fetchIssue, 'fetchCreateIssueUI').mockResolvedValue(mockCreateMetaResult);

        // Create instance of webview
        webview = new CreateIssueWebview(extensionPath);
        jest.spyOn(webview, 'hide').mockImplementation(jest.fn());

        // Mock private methods on webview
        webviewPostMessageMock = jest.fn();
        (webview['postMessage'] as any) = webviewPostMessageMock;
        (webview['createOrShow'] as any) = jest.spyOn(webview, 'createOrShow').mockImplementation(async () => {});
    });

    describe('constructor', () => {
        it('should initialize with default values', () => {
            expect(webview.title).toBe('Create Jira Issue');
            expect(webview.id).toBe(WebViewID.CreateJiraIssueWebview);
            expect(webview.siteOrUndefined).toEqual(emptySiteInfo);
            expect(webview.productOrUndefined).toEqual(ProductJira);
        });
    });

    describe('onPanelDisposed', () => {
        it('should reset data and call super onPanelDisposed', () => {
            // Setup webview with some data
            Object.defineProperty(webview, '_screenData', {
                value: mockCreateMetaResult,
                writable: true,
            });
            Object.defineProperty(webview, '_siteDetails', {
                value: mockSiteDetails,
                writable: true,
            });

            const superOnPanelDisposedSpy = jest.spyOn(
                Object.getPrototypeOf(Object.getPrototypeOf(webview)),
                'onPanelDisposed',
            );

            // Call onPanelDisposed
            (webview as any).onPanelDisposed();

            // Verify data was reset
            expect((webview as any)._screenData).toEqual({
                selectedIssueType: {
                    id: 'empty',
                    name: 'empty',
                    iconUrl: '',
                    avatarId: -1,
                    description: 'empty',
                    epic: false,
                    self: '',
                    subtask: false,
                },
                issueTypeUIs: {},
                problems: {},
                issueTypes: [],
            });
            expect((webview as any)._siteDetails).toEqual(emptySiteInfo);
            expect(superOnPanelDisposedSpy).toHaveBeenCalled();
        });
    });

    describe('initialize', () => {
        it('should initialize with partial issue data', async () => {
            const partialIssue: PartialIssue = {
                summary: 'Test summary',
                description: 'Test description',
            };

            await webview.initialize(partialIssue);

            expect(Container.jiraProjectManager.getProjectForKey).toHaveBeenCalled();
            expect(configuration.setLastCreateSiteAndProject).toHaveBeenCalled();
        });
    });

    describe('updateFields', () => {
        it('should not force update if data already exists', async () => {
            // Setup webview with existing data
            Object.defineProperty(webview, '_screenData', {
                value: {
                    issueTypeUIs: { 'issueType-1': {} },
                },
                writable: true,
            });

            const forceUpdateSpy = jest.spyOn(webview, 'forceUpdateFields');

            await webview.updateFields();

            expect(forceUpdateSpy).not.toHaveBeenCalled();
        });

        it('should force update if no data exists', async () => {
            // Setup webview with no data
            Object.defineProperty(webview, '_screenData', {
                value: {
                    issueTypeUIs: {},
                },
                writable: true,
            });

            const forceUpdateSpy = jest.spyOn(webview, 'forceUpdateFields').mockImplementation(async () => {});

            await webview.updateFields();

            expect(forceUpdateSpy).toHaveBeenCalled();
        });
    });

    describe('forceUpdateFields', () => {
        beforeEach(() => {
            Object.defineProperty(webview, '_siteDetails', {
                value: mockSiteDetails,
                writable: true,
            });
            Object.defineProperty(webview, '_currentProject', {
                value: mockProject,
                writable: true,
            });
        });

        it('should fetch and update issue UI', async () => {
            await webview.forceUpdateFields();

            expect(fetchIssue.fetchCreateIssueUI).toHaveBeenCalledWith(mockSiteDetails, mockProject.key);
            expect(Container.siteManager.getSitesAvailable).toHaveBeenCalledWith(ProductJira);
            expect(Container.jiraProjectManager.getProjects).toHaveBeenCalledWith(mockSiteDetails);
            expect(webviewPostMessageMock).toHaveBeenCalled();
        });

        it('should populate partial issue values', async () => {
            const partialIssue: PartialIssue = {
                summary: 'Test summary',
                description: 'Test description',
            };

            Object.defineProperty(webview, '_partialIssue', {
                value: partialIssue,
                writable: true,
            });

            await webview.forceUpdateFields();

            // Verify that the field values in _screenData include the partial issue values
            expect(webviewPostMessageMock).toHaveBeenCalled();
            const callArg = webviewPostMessageMock.mock.calls[0][0];
            expect(callArg.type).toBe('update');
        });

        it('should handle error gracefully', async () => {
            jest.spyOn(fetchIssue, 'fetchCreateIssueUI').mockRejectedValue(new Error('Test error'));
            jest.spyOn(Logger, 'error');

            await webview.forceUpdateFields();

            expect(Logger.error).toHaveBeenCalled();
            expect(webviewPostMessageMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
        });

        it('should handle empty site details when Refeshing', async () => {
            Object.defineProperty(webview, '_siteDetails', {
                value: emptySiteInfo,
                writable: true,
            });
            Object.defineProperty(webview, 'isRefeshing', {
                value: true,
                writable: true,
            });

            const result = await webview.forceUpdateFields();
            expect(result).toBeUndefined();
        });

        it('should use provided field values', async () => {
            const fieldValues = {
                summary: 'Test summary',
                description: 'Test description',
            };

            await webview.forceUpdateFields(fieldValues);
            expect(webviewPostMessageMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'update',
                    fieldValues: expect.objectContaining({
                        summary: 'Test summary',
                        description: 'Test description',
                    }),
                }),
            );
        });

        it('should use performance-enabled path when feature flag is enabled', async () => {
            // Enable performance feature flag
            (Container.featureFlagClient.checkExperimentValue as jest.Mock).mockReturnValue(true);

            await webview.forceUpdateFields();

            expect(Container.jiraProjectManager.filterProjectsByPermission).toHaveBeenCalledWith(
                mockSiteDetails,
                [mockProject],
                'CREATE_ISSUES',
            );
            expect(fetchIssue.fetchCreateIssueUI).toHaveBeenCalledWith(mockSiteDetails, mockProject.key);
            expect(webviewPostMessageMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'update',
                }),
            );
        });

        it('should handle project without permission in performance mode', async () => {
            // Enable performance feature flag
            (Container.featureFlagClient.checkExperimentValue as jest.Mock).mockReturnValue(true);

            // Mock project without permission
            const projectWithoutPermission = { ...mockProject, id: 'different-id' };
            Object.defineProperty(webview, '_currentProject', {
                value: projectWithoutPermission,
                writable: true,
            });

            // Mock projects with permission (different from current)
            const projectsWithPermission = [mockProject];
            Container.jiraProjectManager.filterProjectsByPermission = jest
                .fn()
                .mockResolvedValue(projectsWithPermission);

            await webview.forceUpdateFields();

            // Should select first project with permission
            expect(webviewPostMessageMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'update',
                    fieldValues: expect.objectContaining({
                        project: mockProject,
                    }),
                }),
            );
        });

        it('should handle partial issue in performance mode', async () => {
            // Enable performance feature flag
            (Container.featureFlagClient.checkExperimentValue as jest.Mock).mockReturnValue(true);

            const partialIssue: PartialIssue = {
                summary: 'Partial Summary',
                description: 'Partial Description',
            };

            Object.defineProperty(webview, '_partialIssue', {
                value: partialIssue,
                writable: true,
            });

            await webview.forceUpdateFields();

            expect(webviewPostMessageMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'update',
                    fieldValues: expect.objectContaining({
                        summary: 'Partial Summary',
                        description: 'Partial Description',
                    }),
                }),
            );
        });
    });

    describe('fireCallback', () => {
        it('should call onCreated callback with correct data', () => {
            const uri = Uri.parse('file:///test.js');
            const position = new Position(1, 1);
            const onCreatedMock = jest.fn();
            const issueKey = 'TEST-123';
            const summary = 'Test summary';

            Object.defineProperty(webview, '_partialIssue', {
                value: {
                    uri,
                    position,
                    onCreated: onCreatedMock,
                },
                writable: true,
            });

            webview.fireCallback(issueKey, summary);

            expect(onCreatedMock).toHaveBeenCalledWith({
                uri,
                position,
                issueKey,
                summary,
            });
            expect(webview.hide).toHaveBeenCalled();
        });
    });

    describe('handleSelectOptionCreated', () => {
        it('should update field values and options', async () => {
            // Setup test data
            const fieldKey = 'testField';
            const newValue = 'New Option';
            const nonce = '123456';

            Object.defineProperty(webview, '_selectedIssueTypeId', {
                value: 'issueType-1',
                writable: true,
            });

            Object.defineProperty(webview, '_screenData', {
                value: {
                    issueTypeUIs: {
                        'issueType-1': {
                            fieldValues: { [fieldKey]: [] },
                            selectFieldOptions: { [fieldKey]: [] },
                            fields: {
                                [fieldKey]: { valueType: ValueType.String },
                            },
                        },
                    },
                },
                writable: true,
            });

            await webview.handleSelectOptionCreated(fieldKey, newValue, nonce);

            expect(webviewPostMessageMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'optionCreated',
                    fieldValues: expect.objectContaining({
                        [fieldKey]: [newValue],
                    }),
                    selectFieldOptions: expect.objectContaining({
                        [fieldKey]: [newValue],
                    }),
                    fieldKey,
                    nonce,
                }),
            );
        });

        it('should handle Version field type with nested options', async () => {
            const fieldKey = 'fixVersions';
            const newValue = { id: 'version-1', name: 'Version 1.0' };
            const nonce = '123456';

            Object.defineProperty(webview, '_selectedIssueTypeId', {
                value: 'issueType-1',
                writable: true,
            });

            Object.defineProperty(webview, '_screenData', {
                value: {
                    issueTypeUIs: {
                        'issueType-1': {
                            fieldValues: { [fieldKey]: [] },
                            selectFieldOptions: {
                                [fieldKey]: [
                                    {
                                        options: [{ id: 'existing-version', name: 'Existing Version' }],
                                    },
                                ],
                            },
                            fields: {
                                [fieldKey]: { valueType: ValueType.Version },
                            },
                        },
                    },
                },
                writable: true,
            });

            await webview.handleSelectOptionCreated(fieldKey, newValue, nonce);

            expect(webviewPostMessageMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'optionCreated',
                    fieldValues: expect.objectContaining({
                        [fieldKey]: [newValue],
                    }),
                    selectFieldOptions: expect.objectContaining({
                        [fieldKey]: [
                            {
                                options: [{ id: 'existing-version', name: 'Existing Version' }, newValue],
                            },
                        ],
                    }),
                    fieldKey,
                    nonce,
                }),
            );
        });
    });

    describe('formatCreatePayload', () => {
        it('should format issue data correctly', () => {
            const action = {
                action: 'createIssue',
                issueData: {
                    summary: 'Test Issue',
                    description: 'Test Description',
                    attachment: [{ name: 'file.txt', fileContent: 'base64Content', type: 'text/plain' }],
                    issuelinks: {
                        type: { id: 'link-1', type: 'inward' },
                        issue: [{ key: 'TEST-456' }],
                    },
                    worklog: {
                        enabled: true,
                        timeSpent: '1h',
                        started: new Date(),
                    },
                },
                site: mockSiteDetails,
            };

            const [payload, worklog, issuelinks, attachments] = webview.formatCreatePayload(action as any);

            // Check payload has required fields but not the extracted ones
            expect(payload.summary).toBe('Test Issue');
            expect(payload.description).toBe('Test Description');
            expect(payload.attachment).toBeUndefined();
            expect(payload.issuelinks).toBeUndefined();
            expect(payload.worklog).toBeUndefined();

            // Check extracted fields
            expect(worklog).toHaveProperty('worklog');
            expect(issuelinks).toEqual(action.issueData.issuelinks);
            expect(attachments).toEqual(action.issueData.attachment);
        });
    });

    describe('updateIssueType', () => {
        let newMockIssueType: IssueType;
        let mockFieldValues: any;

        beforeEach(() => {
            // Setup a new issue type different from the default one
            newMockIssueType = expansionCastTo<IssueType>({
                id: 'issueType-2',
                name: 'Story',
                iconUrl: 'story-icon-url',
            });

            // Setup mock field values
            mockFieldValues = {
                summary: 'Test Summary',
                description: 'Test Description',
                customField: 'Custom Value',
            };

            // Setup screen data with multiple issue types
            const mockCreateMetaResultWithMultipleTypes = {
                ...mockCreateMetaResult,
                issueTypeUIs: {
                    'issueType-1': mockCreateMetaResult.issueTypeUIs['issueType-1'],
                    'issueType-2': expansionCastTo<IssueTypeUI<DetailedSiteInfo>>({
                        fields: {
                            summary: expansionCastTo<FieldUI>({ required: true, valueType: ValueType.String }),
                            description: expansionCastTo<FieldUI>({ required: false, valueType: ValueType.String }),
                            issuetype: expansionCastTo<FieldUI>({ required: true, valueType: ValueType.IssueType }),
                            project: expansionCastTo<FieldUI>({ required: true, valueType: ValueType.Project }),
                            customField: expansionCastTo<FieldUI>({ required: false, valueType: ValueType.String }),
                        },
                        fieldValues: {
                            issuetype: newMockIssueType,
                            project: mockProject,
                        },
                        selectFieldOptions: {
                            specialOption: ['Option1', 'Option2'],
                        },
                    }),
                },
                issueTypes: [mockIssueType, newMockIssueType],
            };

            Object.defineProperty(webview, '_screenData', {
                value: mockCreateMetaResultWithMultipleTypes,
                writable: true,
            });

            Object.defineProperty(webview, '_selectedIssueTypeId', {
                value: 'issueType-1',
                writable: true,
            });

            // Mock getValuesForExisitngKeys method
            jest.spyOn(webview, 'getValuesForExisitngKeys').mockImplementation((issueTypeUI, values) => {
                return values === mockFieldValues ? { summary: 'Test Summary', description: 'Test Description' } : {};
            });
        });

        it('should update the issue type and merge field values', () => {
            // Call the method
            webview.updateIssueType(newMockIssueType, mockFieldValues);

            // Verify _selectedIssueTypeId was updated
            expect(webview['_selectedIssueTypeId']).toBe('issueType-2');

            // Verify getValuesForExisitngKeys was called twice (for field values and select options)
            expect(webview.getValuesForExisitngKeys).toHaveBeenCalledTimes(2);
            expect(webview.getValuesForExisitngKeys).toHaveBeenCalledWith(
                webview['_screenData'].issueTypeUIs['issueType-2'],
                mockFieldValues,
            );

            // Verify issueType was set in fieldValues
            expect(webview['_screenData'].issueTypeUIs['issueType-2'].fieldValues['issuetype']).toBe(newMockIssueType);

            // Verify postMessage was called with correct data
            expect(webviewPostMessageMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'update',
                    transformerProblems: {},
                }),
            );
        });

        it('should preserve transformer problems when showCreateIssueProblems is true', () => {
            // Set up problems with correct structure and enable showCreateIssueProblems
            const mockProblems = {
                'issueType-2': {
                    issueType: newMockIssueType,
                    isRenderable: false,
                    nonRenderableFields: [
                        {
                            name: 'Custom Field',
                            key: 'customfield_10000',
                            required: true,
                            schema: 'unknown',
                            message: 'Field cannot be rendered',
                        },
                    ],
                    message: 'Issue type has non-renderable fields',
                },
            };

            webview['_screenData'].problems = mockProblems;
            Container.config.jira.showCreateIssueProblems = true;

            // Call the method
            webview.updateIssueType(newMockIssueType, mockFieldValues);

            // Verify postMessage was called with problems included
            expect(webviewPostMessageMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'update',
                    transformerProblems: mockProblems,
                }),
            );
        });

        it('should not include transformer problems when showCreateIssueProblems is false', () => {
            // Set up problems with correct structure but disable showCreateIssueProblems
            const mockProblems = {
                'issueType-2': {
                    issueType: newMockIssueType,
                    isRenderable: false,
                    nonRenderableFields: [
                        {
                            name: 'Custom Field',
                            key: 'customfield_10000',
                            required: true,
                            schema: 'unknown',
                            message: 'Field cannot be rendered',
                        },
                    ],
                    message: 'Issue type has non-renderable fields',
                },
            };

            webview['_screenData'].problems = mockProblems;
            Container.config.jira.showCreateIssueProblems = false;

            // Call the method
            webview.updateIssueType(newMockIssueType, mockFieldValues);

            // Verify postMessage was called with empty problems
            expect(webviewPostMessageMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'update',
                    transformerProblems: {},
                }),
            );
        });
    });

    describe('getValuesForExisitngKeys', () => {
        it('should return only values that exist in the issueTypeUI fields', () => {
            // Setup
            const mockIssueTypeUI = expansionCastTo<IssueTypeUI<DetailedSiteInfo>>({
                fields: {
                    summary: expansionCastTo<FieldUI>({ required: true }),
                    description: expansionCastTo<FieldUI>({ required: false }),
                    priority: expansionCastTo<FieldUI>({ required: false }),
                },
                fieldValues: {
                    summary: 'Existing Summary',
                    description: 'Existing Description',
                },
                selectFieldOptions: {},
            });

            const inputValues = {
                summary: 'New Summary',
                description: 'New Description',
                nonExistingField: 'This should not be included',
            };

            // Execute
            const result = webview.getValuesForExisitngKeys(mockIssueTypeUI, inputValues);

            // Verify
            expect(result).toEqual({
                summary: 'New Summary',
                description: 'New Description',
            });
            expect(result.nonExistingField).toBeUndefined();
        });

        it('should preserve specified fields from issueTypeUI when keep parameter is provided', () => {
            // Setup
            const mockIssueTypeUI = expansionCastTo<IssueTypeUI<DetailedSiteInfo>>({
                fields: {
                    summary: expansionCastTo<FieldUI>({ required: true }),
                    description: expansionCastTo<FieldUI>({ required: false }),
                    priority: expansionCastTo<FieldUI>({ required: false }),
                    issuetype: expansionCastTo<FieldUI>({ required: true }),
                    project: expansionCastTo<FieldUI>({ required: true }),
                },
                fieldValues: {
                    summary: 'Existing Summary',
                    description: 'Existing Description',
                    priority: 'High',
                    issuetype: { id: 'bug', name: 'Bug' },
                    project: { key: 'TEST', name: 'Test Project' },
                },
                selectFieldOptions: {},
            });

            const inputValues = {
                summary: 'New Summary',
                description: 'New Description',
                priority: 'Low',
                issuetype: { id: 'task', name: 'Task' },
                project: { key: 'PROJ', name: 'New Project' },
            };

            const keepFields = ['issuetype', 'project'];

            // Execute
            const result = webview.getValuesForExisitngKeys(mockIssueTypeUI, inputValues, keepFields);

            // Verify
            expect(result).toEqual({
                summary: 'New Summary',
                description: 'New Description',
                priority: 'Low',
                issuetype: { id: 'bug', name: 'Bug' }, // should keep original
                project: { key: 'TEST', name: 'Test Project' }, // should keep original
            });
        });

        it('should return empty object if no fields match', () => {
            // Setup
            const mockIssueTypeUI = expansionCastTo<IssueTypeUI<DetailedSiteInfo>>({
                fields: {
                    summary: expansionCastTo<FieldUI>({ required: true }),
                    description: expansionCastTo<FieldUI>({ required: false }),
                },
                fieldValues: {
                    summary: 'Existing Summary',
                    description: 'Existing Description',
                },
                selectFieldOptions: {},
            });

            const inputValues = {
                nonExistingField1: 'Value 1',
                nonExistingField2: 'Value 2',
            };

            // Execute
            const result = webview.getValuesForExisitngKeys(mockIssueTypeUI, inputValues);

            // Verify
            expect(Object.keys(result).length).toBe(0);
        });
    });

    describe('formatIssueLinks', () => {
        it('should correctly format inward links', () => {
            // Setup
            const issueKey = 'TEST-123';
            const linkData = {
                type: {
                    id: 'link-1',
                    type: 'inward',
                },
                issue: [{ key: 'TEST-456' }, { key: 'TEST-789' }],
            };

            // Execute
            const result = webview.formatIssueLinks(issueKey, linkData);

            // Verify
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                type: { id: 'link-1' },
                inwardIssue: { key: 'TEST-456' },
                outwardIssue: { key: 'TEST-123' },
            });
            expect(result[1]).toEqual({
                type: { id: 'link-1' },
                inwardIssue: { key: 'TEST-789' },
                outwardIssue: { key: 'TEST-123' },
            });
        });

        it('should correctly format outward links', () => {
            // Setup
            const issueKey = 'TEST-123';
            const linkData = {
                type: {
                    id: 'link-2',
                    type: 'outward',
                },
                issue: [{ key: 'TEST-456' }, { key: 'TEST-789' }],
            };

            // Execute
            const result = webview.formatIssueLinks(issueKey, linkData);

            // Verify
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                type: { id: 'link-2' },
                inwardIssue: { key: 'TEST-123' },
                outwardIssue: { key: 'TEST-456' },
            });
            expect(result[1]).toEqual({
                type: { id: 'link-2' },
                inwardIssue: { key: 'TEST-123' },
                outwardIssue: { key: 'TEST-789' },
            });
        });

        it('should handle empty issue array', () => {
            // Setup
            const issueKey = 'TEST-123';
            const linkData = {
                type: {
                    id: 'link-3',
                    type: 'inward',
                },
                issue: [],
            };

            // Execute
            const result = webview.formatIssueLinks(issueKey, linkData);

            // Verify
            expect(result).toHaveLength(0);
            expect(result).toEqual([]);
        });
    });

    describe('onMessageReceived', () => {
        const mockShowIssue = require('../commands/jira/showIssue').showIssue;

        const mockMessage = {
            action: 'createIssue',
            issueData: {
                summary: 'Summary',
                issuetype: mockIssueType,
                project: mockProject,
            },
            site: mockSiteDetails,
            nonce: 'test-nonce',
        };

        beforeEach(() => {
            mockClient.createIssue.mockResolvedValue({ key: 'TEST-123' });
            mockWindow.showInformationMessage = jest.fn().mockResolvedValue(undefined);

            Object.defineProperty(webview, '_siteDetails', {
                value: mockSiteDetails,
                writable: true,
            });
            Object.defineProperty(webview, '_currentProject', {
                value: mockProject,
                writable: true,
            });
        });

        it('should show VS Code notification on successful issue creation', async () => {
            await (webview as any).onMessageReceived(mockMessage);

            expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
                'Issue TEST-123 has been created',
                'Open Issue',
            );
        });

        it('should call showIssue when user clicks Open Issue button', async () => {
            mockWindow.showInformationMessage = jest.fn().mockResolvedValue('Open Issue');
            await (webview as any).onMessageReceived(mockMessage);
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(mockShowIssue).toHaveBeenCalledWith({
                key: 'TEST-123',
                siteDetails: mockSiteDetails,
            });
        });

        it('should handle refresh action', async () => {
            const refreshMessage = { action: 'refresh' };
            const forceUpdateSpy = jest.spyOn(webview, 'forceUpdateFields').mockImplementation(async () => {});

            const result = await (webview as any).onMessageReceived(refreshMessage);

            expect(forceUpdateSpy).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should handle setIssueType action', async () => {
            const validIssueType = {
                ...mockIssueType,
                self: 'https://test.atlassian.net/rest/api/2/issuetype/1',
                description: 'Bug issue type',
                avatarId: 1,
                subtask: false,
                epic: false,
            };
            const setIssueTypeMessage = {
                action: 'setIssueType',
                issueType: validIssueType,
                fieldValues: { summary: 'Test' },
            };
            const updateIssueTypeSpy = jest.spyOn(webview, 'updateIssueType').mockImplementation(() => {});

            const result = await (webview as any).onMessageReceived(setIssueTypeMessage);

            expect(updateIssueTypeSpy).toHaveBeenCalledWith(validIssueType, { summary: 'Test' });
            expect(result).toBe(true);
        });

        it('should handle refreshTreeViews action', async () => {
            const refreshTreeViewsMessage = { action: 'refreshTreeViews' };
            const executeCommandSpy = jest
                .spyOn(require('vscode').commands, 'executeCommand')
                .mockImplementation(() => Promise.resolve());

            const result = await (webview as any).onMessageReceived(refreshTreeViewsMessage);

            expect(executeCommandSpy).toHaveBeenCalledWith('atlascode.jira.refreshAssignedWorkItemsExplorer', 4000);
            expect(executeCommandSpy).toHaveBeenCalledWith('atlascode.jira.refreshCustomJqlExplorer', 4000);
            expect(result).toBe(true);
        });

        it('should handle openProblemReport action', async () => {
            const openProblemMessage = { action: 'openProblemReport' };

            const result = await (webview as any).onMessageReceived(openProblemMessage);

            expect(Container.createIssueProblemsWebview.createOrShow).toHaveBeenCalledWith(
                undefined,
                mockSiteDetails,
                mockProject,
            );
            expect(result).toBe(true);
        });
    });

    describe('Should correctly set site and project (updateSiteAndProject)', () => {
        beforeEach(() => {
            Container.config.jira.lastCreateSiteAndProject = {
                siteId: '',
                projectKey: '',
            };
            jest.spyOn(SearchJiraHelper, 'getAssignedIssuesPerSite').mockReturnValue([]);
        });

        it('should set site and project from last used values', async () => {
            const lastUsedSiteId = 'last-used-site';
            const lastUsedProjectKey = 'last-used-project';

            Container.config.jira.lastCreateSiteAndProject = {
                siteId: lastUsedSiteId,
                projectKey: lastUsedProjectKey,
            };

            Container.siteManager.getSiteForId = jest.fn().mockReturnValue({
                ...mockSiteDetails,
                id: lastUsedSiteId,
            });
            Container.jiraProjectManager.getProjectForKey = jest.fn().mockReturnValue({
                ...mockProject,
                key: lastUsedProjectKey,
            });

            await webview.initialize();
            expect(configuration.setLastCreateSiteAndProject).toHaveBeenCalledWith({
                siteId: lastUsedSiteId,
                projectKey: lastUsedProjectKey,
            });
        });

        it('should set site and project with maximum issues', async () => {
            Container.siteManager.getSiteForId = jest.fn().mockReturnValueOnce(undefined);

            const maxIssuesSite = {
                ...mockSiteDetails,
                id: 'max-issues-site',
            };
            const maxIssuesProject = {
                ...mockProject,
                key: 'max-issues-project',
            };

            Container.jiraProjectManager.getProjectForKey = jest
                .fn()
                .mockReturnValueOnce(undefined)
                .mockReturnValueOnce(maxIssuesProject);

            Container.siteManager.getSitesAvailable = jest.fn().mockReturnValueOnce([maxIssuesSite]);

            jest.spyOn(SearchJiraHelper, 'getAssignedIssuesPerSite').mockReturnValue([
                { id: 'mock', key: 'TST-1' } as MinimalORIssueLink<DetailedSiteInfo>,
                { id: 'mock', key: 'TST-2' } as MinimalORIssueLink<DetailedSiteInfo>,
                { id: 'mock', key: 'TSR-1' } as MinimalORIssueLink<DetailedSiteInfo>,
            ]);

            await webview.initialize();
            expect(configuration.setLastCreateSiteAndProject).toHaveBeenCalledWith({
                siteId: maxIssuesSite.id,
                projectKey: maxIssuesProject.key,
            });
        });

        it('should set site and project from first available site and project', async () => {
            Container.siteManager.getSiteForId = jest.fn().mockReturnValueOnce(undefined);
            Container.jiraProjectManager.getProjectForKey = jest.fn().mockReturnValueOnce(undefined);

            Container.siteManager.getFirstSite = jest.fn().mockReturnValue({ ...mockSiteDetails, id: 'first-site' });
            Container.jiraProjectManager.getFirstProject = jest
                .fn()
                .mockResolvedValue({ ...mockProject, key: 'first-project' });

            await webview.initialize();
            expect(configuration.setLastCreateSiteAndProject).toHaveBeenCalledWith({
                siteId: 'first-site',
                projectKey: 'first-project',
            });
        });

        it('should use provided project if available', async () => {
            const inputProject: Project = {
                ...mockProject,
                key: 'input-project',
            };

            await webview.initialize();
            expect(configuration.setLastCreateSiteAndProject).toHaveBeenCalled();

            const action = {
                action: 'getScreensForProject',
                project: inputProject,
            };
            await webview['onMessageReceived'](action);

            expect(configuration.setLastCreateSiteAndProject).toHaveBeenLastCalledWith({
                projectKey: inputProject.key,
                siteId: 'site-1',
            });
        });

        it('should use provided site if available', async () => {
            const inputSite: DetailedSiteInfo = {
                ...mockSiteDetails,
                id: 'input-site',
            };

            await webview.initialize();
            expect(configuration.setLastCreateSiteAndProject).toHaveBeenCalled();

            const action = {
                action: 'getScreensForSite',
                site: { id: inputSite.id },
            };
            await webview['onMessageReceived'](action);

            expect(configuration.setLastCreateSiteAndProject).toHaveBeenLastCalledWith({
                siteId: inputSite.id,
                projectKey: 'TEST',
            });
        });
    });
});
