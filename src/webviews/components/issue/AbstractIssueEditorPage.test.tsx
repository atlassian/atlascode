import { IssueType } from '@atlassianlabs/jira-pi-common-models';
import { FieldUI, UIType, ValueType } from '@atlassianlabs/jira-pi-meta-models';
import { render } from '@testing-library/react';
import React from 'react';
import { DetailedSiteInfo, Product } from 'src/atlclients/authInfo';
import { disableConsole } from 'testsutil';

import {
    AbstractIssueEditorPage,
    CommonEditorPageAccept,
    CommonEditorPageEmit,
    CommonEditorViewState,
    emptyCommonEditorState,
} from './AbstractIssueEditorPage';

// Mock AsyncSelect to capture props
const mockAsyncSelect = jest.fn(({ defaultValue, ...props }) => (
    <div
        className="ac-form-select-container"
        data-testid="async-select"
        data-default-value={JSON.stringify(defaultValue)}
    >
        Mocked AsyncSelect
    </div>
));

jest.mock('@atlaskit/select', () => ({
    __esModule: true,
    default: jest.fn(),
    AsyncSelect: (props: any) => mockAsyncSelect(props),
    components: {
        Option: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        SingleValue: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

// Test implementation of AbstractIssueEditorPage
class TestIssueEditorPage extends AbstractIssueEditorPage<
    CommonEditorPageEmit,
    CommonEditorPageAccept,
    {},
    CommonEditorViewState
> {
    override getProjectKey(): string {
        return this.state.fieldValues['project']?.key || 'TEST';
    }

    protected override fetchAndTransformUsers = async (input: string, accountId?: string): Promise<any[]> => {
        return [];
    };

    protected override getApiVersion(): string {
        return '3';
    }

    renderParentField(editMode: boolean = false) {
        const parentField: FieldUI = {
            key: 'parent',
            name: 'Parent',
            required: false,
            uiType: UIType.IssueLink,
            displayOrder: 1,
            valueType: ValueType.String,
            advanced: false,
            isArray: false,
            schema: 'parent',
        };

        const currentIssueType: IssueType = {
            id: '1',
            name: 'Story',
            iconUrl: 'story-icon.png',
            subtask: false,
            avatarId: 1,
            description: 'Story issue type',
            self: 'https://test.atlassian.net/rest/api/3/issuetype/1',
            epic: false,
        };

        return this.getInputMarkup(parentField, editMode, currentIssueType);
    }

    override render() {
        return <div data-testid="test-container">{this.renderParentField(false)}</div>;
    }
}

const mockSiteDetailsCloud: DetailedSiteInfo = {
    userId: 'user-123',
    id: 'site-1',
    name: 'Test Site',
    avatarUrl: '',
    baseLinkUrl: 'https://test.atlassian.net',
    baseApiUrl: 'https://test.atlassian.net/rest/api',
    isCloud: true,
    credentialId: 'cred-1',
    host: 'test.atlassian.net',
    product: {
        name: 'JIRA',
        key: 'jira',
    } as Product,
};

describe('AbstractIssueEditorPage', () => {
    beforeAll(() => {
        disableConsole('warn', 'error');

        // Mock acquireVsCodeApi
        (global as any).acquireVsCodeApi = jest.fn(() => ({
            postMessage: jest.fn(),
            setState: jest.fn(),
            getState: jest.fn(() => ({})),
        }));
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockAsyncSelect.mockClear();
    });

    describe('Parent Field', () => {
        describe('Non-Edit Mode', () => {
            it('should pass parent value as defaultValue to AsyncSelect when parent exists', () => {
                const parentValue = {
                    key: 'EPIC-123',
                    summary: 'Test Epic',
                };

                const component = new TestIssueEditorPage({});
                component.state = {
                    ...emptyCommonEditorState,
                    siteDetails: mockSiteDetailsCloud,
                    fieldValues: {
                        parent: parentValue,
                        project: { key: 'TEST' },
                    },
                };

                render(component.render());

                // Check that AsyncSelect was called with correct defaultValue
                expect(mockAsyncSelect).toHaveBeenCalled();
                const callArgs = mockAsyncSelect.mock.calls[0][0];
                expect(callArgs.defaultValue).toEqual(parentValue);
            });

            it('should pass undefined as defaultValue to AsyncSelect when parent is missing', () => {
                const component = new TestIssueEditorPage({});
                component.state = {
                    ...emptyCommonEditorState,
                    siteDetails: mockSiteDetailsCloud,
                    fieldValues: {
                        project: { key: 'TEST' },
                    },
                };

                render(component.render());

                // Check that AsyncSelect was called with undefined defaultValue
                expect(mockAsyncSelect).toHaveBeenCalled();
                const callArgs = mockAsyncSelect.mock.calls[0][0];
                expect(callArgs.defaultValue).toBeUndefined();
            });
        });

        describe('Edit Mode', () => {
            class TestIssueEditorPageEditMode extends TestIssueEditorPage {
                override render() {
                    return <div data-testid="test-container">{this.renderParentField(true)}</div>;
                }
            }

            it('should transform parent to IssuePickerIssue format and pass as defaultValue', () => {
                const parentValue = {
                    key: 'EPIC-456',
                    summary: 'Test Epic Story',
                    issuetype: {
                        name: 'Epic',
                        iconUrl: 'https://example.com/epic-icon.png',
                    },
                };

                const component = new TestIssueEditorPageEditMode({});
                component.state = {
                    ...emptyCommonEditorState,
                    siteDetails: mockSiteDetailsCloud,
                    fieldValues: {
                        parent: parentValue,
                        project: { key: 'TEST' },
                    },
                };

                render(component.render());

                // Check that AsyncSelect was called with transformed IssuePickerIssue
                expect(mockAsyncSelect).toHaveBeenCalled();
                const callArgs = mockAsyncSelect.mock.calls[0][0];

                expect(callArgs.defaultValue).toEqual({
                    img: 'https://example.com/epic-icon.png',
                    key: 'EPIC-456',
                    keyHtml: '<b>EPIC-456</b>',
                    summary: 'Test Epic Story',
                    summaryText: 'Test Epic Story',
                });
            });

            it('should pass undefined as defaultValue when parent is missing in edit mode', () => {
                const component = new TestIssueEditorPageEditMode({});
                component.state = {
                    ...emptyCommonEditorState,
                    siteDetails: mockSiteDetailsCloud,
                    fieldValues: {
                        project: { key: 'TEST' },
                    },
                };

                render(component.render());

                // Check that AsyncSelect was called with undefined defaultValue
                expect(mockAsyncSelect).toHaveBeenCalled();
                const callArgs = mockAsyncSelect.mock.calls[0][0];
                expect(callArgs.defaultValue).toBeUndefined();
            });
        });
    });
});
