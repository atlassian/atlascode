import { FieldUI } from '@atlassianlabs/jira-pi-meta-models';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { DetailedSiteInfo, Product } from 'src/atlclients/authInfo';
import { disableConsole } from 'testsutil/console';

import { MentionInfo } from '../../AbstractIssueEditorPage';
import { AtlascodeMentionProvider } from '../../common/AtlaskitEditor/AtlascodeMentionsProvider';
import { EditorStateProvider } from '../EditorStateContext';
import IssueMainPanel from './IssueMainPanel';

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

// Helper function to wrap components with EditorStateProvider for testing
const renderWithEditorProvider = (component: React.ReactElement) => {
    return render(<EditorStateProvider>{component}</EditorStateProvider>);
};
// Mock mention data
const mockMentionUsers: MentionInfo[] = [
    {
        accountId: 'user-123',
        displayName: 'John Doe',
        mention: 'johndoe',
        avatarUrl: 'https://example.com/avatar1.jpg',
    },
    {
        accountId: 'user-456',
        displayName: 'Jane Smith',
        mention: 'janesmith',
        avatarUrl: 'https://example.com/avatar2.jpg',
    },
];

const mockMentionProvider = AtlascodeMentionProvider.init(
    {
        url: '',
        mentionNameResolver: {
            lookupName: async (id: string) => ({
                id,
                name:
                    mockMentionUsers.find((u) => u.accountId === id.replace('accountid:', ''))?.displayName ||
                    'Unknown User',
                status: 'OK' as any,
            }),
            cacheName: jest.fn(),
        },
    },
    jest.fn().mockResolvedValue(mockMentionUsers),
);

describe('IssueMainPanel with Atlaskit Editor', () => {
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
                    isAtlaskitEditorEnabled={true}
                    mentionProvider={mockMentionProvider}
                />,
            ),
        );
        await screen.findByText('test description');
        expect(screen.getByText('test description')).toBeTruthy();
    }, 100000);

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
                    isAtlaskitEditorEnabled={true}
                    mentionProvider={mockMentionProvider}
                />,
            ),
        );
        const renderedDescription = await screen.findByTestId('issue.description');
        await act(async () => {
            fireEvent.click(renderedDescription);
        });

        const editor = await screen.findByLabelText('Rich text editor for comments');
        expect(editor).toBeTruthy();
    }, 100000);

    describe('Mention functionality', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('renders with mention provider', async () => {
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
                        isAtlaskitEditorEnabled={true}
                        mentionProvider={mockMentionProvider}
                    />,
                ),
            );

            const renderedDescription = await screen.findByTestId('issue.description');
            expect(renderedDescription).toBeTruthy();
        });

        it('passes mention provider to AtlaskitEditor when editing', async () => {
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
                        isAtlaskitEditorEnabled={true}
                        mentionProvider={mockMentionProvider}
                    />,
                ),
            );

            const renderedDescription = await screen.findByTestId('issue.description');
            await act(async () => {
                fireEvent.click(renderedDescription);
            });

            const editor = await screen.findByLabelText('Rich text editor for comments');
            expect(editor).toBeTruthy();

            // Verify the editor is rendered and ready for mentions
            await waitFor(() => {
                expect(editor).toBeTruthy();
            });
        });

        it('renders description with mentions using AdfAwareContent', async () => {
            const fieldValuesWithMentions = {
                ...mockFieldValues,
                description: JSON.stringify({
                    version: 1,
                    type: 'doc',
                    content: [
                        {
                            type: 'paragraph',
                            content: [
                                {
                                    type: 'text',
                                    text: 'Hello ',
                                },
                                {
                                    type: 'mention',
                                    attrs: {
                                        id: 'accountid:user-123',
                                        text: '@johndoe',
                                    },
                                },
                                {
                                    type: 'text',
                                    text: ', please review this.',
                                },
                            ],
                        },
                    ],
                }),
            };

            await act(() =>
                renderWithEditorProvider(
                    <IssueMainPanel
                        fields={mockFields}
                        fieldValues={fieldValuesWithMentions}
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
                        isAtlaskitEditorEnabled={true}
                        mentionProvider={mockMentionProvider}
                    />,
                ),
            );

            const renderedDescription = await screen.findByTestId('issue.description');
            expect(renderedDescription).toBeTruthy();
        });

        it('handles save with mention content', async () => {
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
                        isAtlaskitEditorEnabled={true}
                        mentionProvider={mockMentionProvider}
                    />,
                ),
            );

            const renderedDescription = await screen.findByTestId('issue.description');
            await act(async () => {
                fireEvent.click(renderedDescription);
            });

            const saveButton = await screen.findByTestId('comment-save-button');
            expect(saveButton).toBeTruthy();

            await act(async () => {
                fireEvent.click(saveButton);
            });

            // Verify handleInlineEdit was called
            await waitFor(() => {
                expect(mockHandleInlineEdit).toHaveBeenCalled();
            });
        });

        it('handles cancel when editing with mentions', async () => {
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
                        isAtlaskitEditorEnabled={true}
                        mentionProvider={mockMentionProvider}
                    />,
                ),
            );

            const renderedDescription = await screen.findByTestId('issue.description');
            await act(async () => {
                fireEvent.click(renderedDescription);
            });

            const cancelButton = await screen.findByText('Cancel');
            expect(cancelButton).toBeTruthy();

            await act(async () => {
                fireEvent.click(cancelButton);
            });

            // Verify we're back to view mode
            await waitFor(() => {
                expect(screen.getByTestId('issue.description')).toBeTruthy();
            });
        });
    });
});
