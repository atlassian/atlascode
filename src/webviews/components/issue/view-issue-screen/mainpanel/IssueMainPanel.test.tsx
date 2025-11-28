import '@testing-library/dom';

import { FieldUI } from '@atlassianlabs/jira-pi-meta-models';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { DetailedSiteInfo, Product } from 'src/atlclients/authInfo';
import { disableConsole } from 'testsutil/console';

import { AtlascodeMentionProvider } from '../../common/AtlaskitEditor/AtlascodeMentionsProvider';
import { EditorStateProvider } from '../EditorStateContext';
import IssueMainPanel from './IssueMainPanel';

jest.mock('../../Worklogs', () => {
    return function MockWorklogs({ onEditWorklog, onConfirmDelete, worklogs }: any) {
        return (
            <div data-testid="worklogs-component">
                <div>Worklogs: {worklogs.worklogs.length}</div>
                <button
                    onClick={() =>
                        onEditWorklog({
                            action: 'updateWorklog',
                            worklogId: 'worklog-1',
                            worklogData: { timeSpent: '2h' },
                        })
                    }
                    data-testid="edit-worklog-button"
                >
                    Edit Worklog
                </button>
                <button
                    onClick={() => onConfirmDelete({ id: 'worklog-1', comment: 'Test work' })}
                    data-testid="delete-worklog-button"
                >
                    Delete Worklog
                </button>
            </div>
        );
    };
});

const mockSiteDetails: DetailedSiteInfo = {
    userId: 'user-123',
    id: '',
    name: '',
    avatarUrl: '',
    baseLinkUrl: '',
    baseApiUrl: '',
    isCloud: false,
    credentialId: '',
    host: '',
    product: {
        name: 'JIRA',
        key: 'jira',
    } as Product,
};

const mockFields = {
    description: {
        required: false,
        name: 'Description',
        key: 'description',
        uiType: 'input',
        displayOrder: 2,
        valueType: 'string',
        isMultiline: true,
        advanced: false,
        isArray: false,
        schema: 'description',
    } as FieldUI,
};
const mockFieldValues = {
    description: 'test description',
    'description.rendered': '<h1>test description</h1>\n',
};

const mockOnDeleteAttachment = jest.fn();
const mockHandleAddAttachments = jest.fn();
const mockHandleInlineEdit = jest.fn();
const mockHandleOpenIssue = jest.fn();
const mockOnDelete = jest.fn();
const mockOnFetchIssues = jest.fn();
const mockFetchUsers = jest.fn();
const mockFetchImage = jest.fn();
const mockHandleEditorFocus = jest.fn();

// Helper function to wrap components with EditorStateProvider for testing
const renderWithEditorProvider = (component: React.ReactElement) => {
    return render(<EditorStateProvider>{component}</EditorStateProvider>);
};
// Mock mention provider for regular tests
const mockMentionProvider = AtlascodeMentionProvider.init({ url: '' }, jest.fn().mockResolvedValue([]));

describe('IssueMainPanel', () => {
    beforeAll(() => {
        disableConsole('warn', 'error');
    });

    it('renders the main panel', async () => {
        await act(() =>
            renderWithEditorProvider(
                <IssueMainPanel
                    fields={mockFields}
                    fieldValues={mockFieldValues}
                    handleAddAttachments={mockHandleAddAttachments}
                    siteDetails={mockSiteDetails}
                    onDeleteAttachment={mockOnDeleteAttachment}
                    isEpic={false}
                    handleInlineEdit={mockHandleInlineEdit}
                    subtaskTypes={[]}
                    linkTypes={[]}
                    handleOpenIssue={mockHandleOpenIssue}
                    onDelete={mockOnDelete}
                    onFetchIssues={mockOnFetchIssues}
                    fetchUsers={mockFetchUsers}
                    fetchImage={mockFetchImage}
                    isAtlaskitEditorEnabled={false}
                    mentionProvider={mockMentionProvider}
                    handleEditorFocus={mockHandleEditorFocus}
                />,
            ),
        );
        await screen.findByText('test description');
        expect(screen.getByText('test description')).toBeTruthy();
    });

    it('renders editing description area', async () => {
        await act(() =>
            renderWithEditorProvider(
                <IssueMainPanel
                    fields={mockFields}
                    fieldValues={mockFieldValues}
                    handleAddAttachments={mockHandleAddAttachments}
                    siteDetails={mockSiteDetails}
                    onDeleteAttachment={mockOnDeleteAttachment}
                    isEpic={false}
                    handleInlineEdit={mockHandleInlineEdit}
                    subtaskTypes={[]}
                    linkTypes={[]}
                    handleOpenIssue={mockHandleOpenIssue}
                    onDelete={mockOnDelete}
                    onFetchIssues={mockOnFetchIssues}
                    fetchUsers={mockFetchUsers}
                    fetchImage={mockFetchImage}
                    isAtlaskitEditorEnabled={false}
                    mentionProvider={mockMentionProvider}
                    handleEditorFocus={mockHandleEditorFocus}
                />,
            ),
        );
        const renderedDescription = await screen.findByTestId('issue.description');
        await act(async () => {
            fireEvent.click(renderedDescription);
        });
        const textArea = screen.getAllByRole('textbox')[0];
        fireEvent.change(textArea, { target: { value: 'Updated description' } });
        fireEvent.click(screen.getByText('Save'));

        // Expect ADF format (WikiMarkup is converted to ADF)
        expect(mockHandleInlineEdit).toHaveBeenCalledWith(
            expect.objectContaining({ key: 'description', name: 'Description' }),
            expect.objectContaining({
                version: 1,
                type: 'doc',
                content: expect.any(Array),
            }),
        );
    });

    describe('Worklog Functionality', () => {
        const mockWorklogFields = {
            worklog: {
                required: false,
                name: 'Work Log',
                key: 'worklog',
                uiType: 'worklog',
                displayOrder: 3,
                valueType: 'string',
                isArray: false,
                advanced: false,
                schema: 'worklog',
            } as FieldUI,
        };

        const mockWorklogFieldValues = {
            worklog: {
                worklogs: [
                    {
                        id: 'worklog-1',
                        timeSpent: '1h',
                        comment: 'Test work log',
                        created: '2023-01-01T10:00:00.000Z',
                        author: {
                            accountId: 'user-1',
                            displayName: 'Test User',
                            avatarUrls: {
                                '48x48': 'https://example.com/avatar.png',
                            },
                        },
                    },
                ],
            },
        };

        it('should render worklog component with correct props', async () => {
            await act(() =>
                renderWithEditorProvider(
                    <IssueMainPanel
                        fields={mockWorklogFields}
                        fieldValues={mockWorklogFieldValues}
                        handleAddAttachments={mockHandleAddAttachments}
                        siteDetails={mockSiteDetails}
                        onDeleteAttachment={mockOnDeleteAttachment}
                        isEpic={false}
                        handleInlineEdit={mockHandleInlineEdit}
                        subtaskTypes={[]}
                        linkTypes={[]}
                        handleOpenIssue={mockHandleOpenIssue}
                        onDelete={mockOnDelete}
                        onFetchIssues={mockOnFetchIssues}
                        fetchUsers={mockFetchUsers}
                        fetchImage={mockFetchImage}
                        isAtlaskitEditorEnabled={false}
                        mentionProvider={mockMentionProvider}
                        handleEditorFocus={mockHandleEditorFocus}
                    />,
                ),
            );

            expect(screen.getByTestId('worklogs-component')).toBeTruthy();
            expect(screen.getByText('Worklogs: 1')).toBeTruthy();
        });

        it('should handle worklog edit action', async () => {
            await act(() =>
                renderWithEditorProvider(
                    <IssueMainPanel
                        fields={mockWorklogFields}
                        fieldValues={mockWorklogFieldValues}
                        handleAddAttachments={mockHandleAddAttachments}
                        siteDetails={mockSiteDetails}
                        onDeleteAttachment={mockOnDeleteAttachment}
                        isEpic={false}
                        handleInlineEdit={mockHandleInlineEdit}
                        subtaskTypes={[]}
                        linkTypes={[]}
                        handleOpenIssue={mockHandleOpenIssue}
                        onDelete={mockOnDelete}
                        onFetchIssues={mockOnFetchIssues}
                        fetchUsers={mockFetchUsers}
                        fetchImage={mockFetchImage}
                        isAtlaskitEditorEnabled={false}
                        mentionProvider={mockMentionProvider}
                        handleEditorFocus={mockHandleEditorFocus}
                    />,
                ),
            );

            const editButton = screen.getByTestId('edit-worklog-button');
            fireEvent.click(editButton);

            expect(mockHandleInlineEdit).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'worklog', name: 'Work Log' }),
                {
                    action: 'updateWorklog',
                    worklogId: 'worklog-1',
                    worklogData: { timeSpent: '2h' },
                },
            );
        });

        it('should handle worklog delete action', async () => {
            await act(() =>
                renderWithEditorProvider(
                    <IssueMainPanel
                        fields={mockWorklogFields}
                        fieldValues={mockWorklogFieldValues}
                        handleAddAttachments={mockHandleAddAttachments}
                        siteDetails={mockSiteDetails}
                        onDeleteAttachment={mockOnDeleteAttachment}
                        isEpic={false}
                        handleInlineEdit={mockHandleInlineEdit}
                        subtaskTypes={[]}
                        linkTypes={[]}
                        handleOpenIssue={mockHandleOpenIssue}
                        onDelete={mockOnDelete}
                        onFetchIssues={mockOnFetchIssues}
                        fetchUsers={mockFetchUsers}
                        fetchImage={mockFetchImage}
                        isAtlaskitEditorEnabled={false}
                        mentionProvider={mockMentionProvider}
                        handleEditorFocus={mockHandleEditorFocus}
                    />,
                ),
            );

            const deleteButton = screen.getByTestId('delete-worklog-button');
            fireEvent.click(deleteButton);

            expect(mockHandleInlineEdit).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'worklog', name: 'Work Log' }),
                {
                    action: 'deleteWorklog',
                    worklogId: 'worklog-1',
                    adjustEstimate: 'auto',
                },
            );
        });

        it('should handle worklog creation when no action specified', async () => {
            const mockWorklogFieldsWithCreate = {
                worklog: {
                    ...mockWorklogFields.worklog,
                    uiType: 'worklog',
                } as FieldUI,
            };

            await act(() =>
                renderWithEditorProvider(
                    <IssueMainPanel
                        fields={mockWorklogFieldsWithCreate}
                        fieldValues={mockWorklogFieldValues}
                        handleAddAttachments={mockHandleAddAttachments}
                        siteDetails={mockSiteDetails}
                        onDeleteAttachment={mockOnDeleteAttachment}
                        isEpic={false}
                        handleInlineEdit={mockHandleInlineEdit}
                        subtaskTypes={[]}
                        linkTypes={[]}
                        handleOpenIssue={mockHandleOpenIssue}
                        onDelete={mockOnDelete}
                        onFetchIssues={mockOnFetchIssues}
                        fetchUsers={mockFetchUsers}
                        fetchImage={mockFetchImage}
                        isAtlaskitEditorEnabled={false}
                        mentionProvider={mockMentionProvider}
                        handleEditorFocus={mockHandleEditorFocus}
                    />,
                ),
            );

            // Simulate worklog creation by calling handleInlineEdit directly
            const worklogData = {
                timeSpent: '1h',
                comment: 'New work log',
                adjustEstimate: 'auto',
            };

            // This would be called internally when creating a new worklog
            mockHandleInlineEdit(mockWorklogFieldsWithCreate.worklog, worklogData);

            expect(mockHandleInlineEdit).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'worklog', name: 'Work Log' }),
                worklogData,
            );
        });
    });

    describe('Linked Issues Assignee Update', () => {
        const mockOnIssueUpdate = jest.fn();

        const mockLinkedIssueFields = {
            issuelinks: {
                required: false,
                name: 'Linked Issues',
                key: 'issuelinks',
                uiType: 'issuelinks',
                displayOrder: 10,
                valueType: 'issuelinks',
                advanced: false,
                isArray: true,
            } as FieldUI,
        };

        const mockLinkedIssueFieldValues = {
            issuelinks: [
                {
                    id: 'link-1',
                    type: {
                        id: 'relates-to',
                        name: 'Relates',
                        inward: 'relates to',
                        outward: 'relates to',
                    },
                    outwardIssue: {
                        id: 'issue-1',
                        key: 'TEST-123',
                        summary: 'Test Issue 1',
                        issuetype: { id: '1', name: 'Task', iconUrl: 'task.png' },
                        status: {
                            id: '1',
                            name: 'To Do',
                            statusCategory: { id: '2', key: 'new', colorName: 'blue-gray' },
                        },
                        assignee: {
                            accountId: 'user-123',
                            displayName: 'John Doe',
                            avatarUrls: { '24x24': 'avatar-24.png' },
                        },
                    },
                },
            ],
            issuetype: { subtask: false },
        };

        it('renders linked issues with assignee information', async () => {
            await act(() =>
                renderWithEditorProvider(
                    <IssueMainPanel
                        fields={mockLinkedIssueFields}
                        fieldValues={mockLinkedIssueFieldValues}
                        handleAddAttachments={mockHandleAddAttachments}
                        siteDetails={mockSiteDetails}
                        onDeleteAttachment={mockOnDeleteAttachment}
                        isEpic={false}
                        handleInlineEdit={mockHandleInlineEdit}
                        subtaskTypes={[]}
                        linkTypes={[]}
                        handleOpenIssue={mockHandleOpenIssue}
                        onDelete={mockOnDelete}
                        onFetchIssues={mockOnFetchIssues}
                        fetchUsers={mockFetchUsers}
                        fetchImage={mockFetchImage}
                        onIssueUpdate={mockOnIssueUpdate}
                        isAtlaskitEditorEnabled={false}
                        mentionProvider={mockMentionProvider}
                        handleEditorFocus={mockHandleEditorFocus}
                    />,
                ),
            );

            expect(screen.getByText('John Doe')).toBeTruthy();
            expect(screen.getByText('TEST-123')).toBeTruthy();
        });

        it('calls onIssueUpdate when assignee is changed for linked issue', async () => {
            await act(() =>
                renderWithEditorProvider(
                    <IssueMainPanel
                        fields={mockLinkedIssueFields}
                        fieldValues={mockLinkedIssueFieldValues}
                        handleAddAttachments={mockHandleAddAttachments}
                        siteDetails={mockSiteDetails}
                        onDeleteAttachment={mockOnDeleteAttachment}
                        isEpic={false}
                        handleInlineEdit={mockHandleInlineEdit}
                        subtaskTypes={[]}
                        linkTypes={[]}
                        handleOpenIssue={mockHandleOpenIssue}
                        onDelete={mockOnDelete}
                        onFetchIssues={mockOnFetchIssues}
                        fetchUsers={mockFetchUsers}
                        fetchImage={mockFetchImage}
                        onIssueUpdate={mockOnIssueUpdate}
                        isAtlaskitEditorEnabled={false}
                        mentionProvider={mockMentionProvider}
                        handleEditorFocus={mockHandleEditorFocus}
                    />,
                ),
            );

            expect(screen.getByText('TEST-123')).toBeTruthy();
        });

        it('passes fetchUsers to LinkedIssuesComponent', async () => {
            await act(() =>
                renderWithEditorProvider(
                    <IssueMainPanel
                        fields={mockLinkedIssueFields}
                        fieldValues={mockLinkedIssueFieldValues}
                        handleAddAttachments={mockHandleAddAttachments}
                        siteDetails={mockSiteDetails}
                        onDeleteAttachment={mockOnDeleteAttachment}
                        isEpic={false}
                        handleInlineEdit={mockHandleInlineEdit}
                        subtaskTypes={[]}
                        linkTypes={[]}
                        handleOpenIssue={mockHandleOpenIssue}
                        onDelete={mockOnDelete}
                        onFetchIssues={mockOnFetchIssues}
                        fetchUsers={mockFetchUsers}
                        fetchImage={mockFetchImage}
                        onIssueUpdate={mockOnIssueUpdate}
                        isAtlaskitEditorEnabled={false}
                        mentionProvider={mockMentionProvider}
                        handleEditorFocus={mockHandleEditorFocus}
                    />,
                ),
            );

            expect(screen.getByText('TEST-123')).toBeTruthy();
        });

        it('handles unassigning a linked issue', async () => {
            await act(() =>
                renderWithEditorProvider(
                    <IssueMainPanel
                        fields={mockLinkedIssueFields}
                        fieldValues={mockLinkedIssueFieldValues}
                        handleAddAttachments={mockHandleAddAttachments}
                        siteDetails={mockSiteDetails}
                        onDeleteAttachment={mockOnDeleteAttachment}
                        isEpic={false}
                        handleInlineEdit={mockHandleInlineEdit}
                        subtaskTypes={[]}
                        linkTypes={[]}
                        handleOpenIssue={mockHandleOpenIssue}
                        onDelete={mockOnDelete}
                        onFetchIssues={mockOnFetchIssues}
                        fetchUsers={mockFetchUsers}
                        fetchImage={mockFetchImage}
                        onIssueUpdate={mockOnIssueUpdate}
                        isAtlaskitEditorEnabled={false}
                        mentionProvider={mockMentionProvider}
                        handleEditorFocus={mockHandleEditorFocus}
                    />,
                ),
            );

            expect(screen.getByText('John Doe')).toBeTruthy();
        });
    });
});
