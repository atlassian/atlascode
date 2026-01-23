import { Comment as JiraComment, User } from '@atlassianlabs/jira-pi-common-models';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { DetailedSiteInfo, Product } from 'src/atlclients/authInfo';
import { disableConsole } from 'testsutil/console';

import { AtlascodeMentionProvider } from '../../common/AtlaskitEditor/AtlascodeMentionsProvider';
import { EditorStateProvider } from '../EditorStateContext';
import { IssueCommentComponent } from './IssueCommentComponent';

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

const mockCurrentUser: User = {
    accountId: 'user-123',
    active: true,
    emailAddress: '',
    key: 'user-123',
    self: '',
    timeZone: 'UTC',
    displayName: 'Test User',
    avatarUrls: {
        '16x16': 'https://avatar.example.com/16x16',
        '24x24': 'https://avatar.example.com/24x24',
        '32x32': 'https://avatar.example.com/32x32',
        '48x48': 'https://avatar.example.com/48x48',
    },
};

const mockComments: JiraComment[] = [
    {
        id: 'comment-1',
        body: 'This is a test comment',
        renderedBody: '<p>This is a test comment</p>',
        author: {
            accountId: 'user-123',
            displayName: 'Test User',
            avatarUrls: {
                '16x16': 'https://avatar.example.com/16x16',
                '24x24': 'https://avatar.example.com/24x24',
                '32x32': 'https://avatar.example.com/32x32',
                '48x48': 'https://avatar.example.com/48x48',
            },
            active: false,
            emailAddress: undefined,
            key: undefined,
            self: '',
            timeZone: undefined,
        },
        created: '2023-01-01T12:00:00Z',
        updated: '2023-01-01T12:00:00Z',
        self: '',
        visibility: undefined,
        jsdPublic: false,
    },
    {
        id: 'comment-2',
        body: 'Another test comment',
        renderedBody: '<p>Another test comment</p>',
        author: {
            accountId: 'user-456',
            displayName: 'Another User',
            avatarUrls: {
                '16x16': 'https://avatar.example.com/16x16',
                '24x24': 'https://avatar.example.com/24x24',
                '32x32': 'https://avatar.example.com/32x32',
                '48x48': 'https://avatar.example.com/48x48',
            },
            active: false,
            emailAddress: undefined,
            key: undefined,
            self: '',
            timeZone: undefined,
        },
        created: '2023-01-02T12:00:00Z',
        updated: '2023-01-02T12:00:00Z',
        self: '',
        visibility: undefined,
        jsdPublic: false,
    },
];

const mockOnSave = jest.fn();
const mockOnCreate = jest.fn();
const mockFetchUsers = jest.fn();
const mockFetchImage = jest.fn();
const mockOnDelete = jest.fn();
const mockOnCommentTextChange = jest.fn();
const mockOnEditingCommentChange = jest.fn();
const mockHandleEditorFocus = jest.fn();

// Mock mention provider
const mockMentionProvider = AtlascodeMentionProvider.init({ url: '' }, jest.fn().mockResolvedValue([]));

// Helper function to wrap components with EditorStateProvider for testing
const renderWithEditorProvider = (component: React.ReactElement) => {
    return render(<EditorStateProvider>{component}</EditorStateProvider>);
};

describe('IssueCommentComponent', () => {
    beforeAll(() => {
        disableConsole('warn', 'error');
    });

    it('renders the AddCommentComponent', () => {
        renderWithEditorProvider(
            <IssueCommentComponent
                siteDetails={mockSiteDetails}
                currentUser={mockCurrentUser}
                comments={[]}
                isServiceDeskProject={false}
                onSave={mockOnSave}
                onCreate={mockOnCreate}
                fetchUsers={mockFetchUsers}
                fetchImage={mockFetchImage}
                onDelete={mockOnDelete}
                commentText=""
                onCommentTextChange={mockOnCommentTextChange}
                isEditingComment={false}
                onEditingCommentChange={mockOnEditingCommentChange}
                isAtlaskitEditorEnabled={false}
                mentionProvider={mockMentionProvider}
                handleEditorFocus={mockHandleEditorFocus}
            />,
        );

        expect(screen.getByPlaceholderText('Add a comment...')).toBeTruthy();
    });

    it('renders a list of comments', async () => {
        renderWithEditorProvider(
            <IssueCommentComponent
                siteDetails={mockSiteDetails}
                currentUser={mockCurrentUser}
                comments={mockComments}
                isServiceDeskProject={false}
                onSave={mockOnSave}
                onCreate={mockOnCreate}
                fetchUsers={mockFetchUsers}
                fetchImage={mockFetchImage}
                onDelete={mockOnDelete}
                commentText=""
                onCommentTextChange={mockOnCommentTextChange}
                isEditingComment={false}
                onEditingCommentChange={mockOnEditingCommentChange}
                isAtlaskitEditorEnabled={false}
                mentionProvider={mockMentionProvider}
                handleEditorFocus={mockHandleEditorFocus}
            />,
        );

        expect(await screen.findByText('This is a test comment')).toBeTruthy();
        expect(await screen.findByText('Another test comment')).toBeTruthy();
    });

    it('allows editing a comment', async () => {
        await act(() =>
            renderWithEditorProvider(
                <IssueCommentComponent
                    siteDetails={mockSiteDetails}
                    currentUser={mockCurrentUser}
                    comments={[mockComments[0]]}
                    isServiceDeskProject={false}
                    onSave={mockOnSave}
                    onCreate={mockOnCreate}
                    fetchUsers={mockFetchUsers}
                    fetchImage={mockFetchImage}
                    onDelete={mockOnDelete}
                    commentText=""
                    onCommentTextChange={mockOnCommentTextChange}
                    isEditingComment={false}
                    onEditingCommentChange={mockOnEditingCommentChange}
                    isAtlaskitEditorEnabled={false}
                    mentionProvider={mockMentionProvider}
                    handleEditorFocus={mockHandleEditorFocus}
                />,
            ),
        );
        await screen.findByText('Another test comment');

        await act(() => fireEvent.click(screen.getAllByText('Edit')[0]));
        const textArea = screen.getAllByRole('textbox')[1];
        fireEvent.change(textArea, { target: { value: 'Updated comment' } });
        fireEvent.click(screen.getByText('Save'));

        // Expect ADF format (WikiMarkup is converted to ADF)
        expect(mockOnSave).toHaveBeenCalledWith(
            expect.objectContaining({
                version: 1,
                type: 'doc',
                content: expect.any(Array),
            }),
            'comment-2',
            undefined,
        );
    }, 100000);

    it('allows deleting a comment', () => {
        renderWithEditorProvider(
            <IssueCommentComponent
                siteDetails={mockSiteDetails}
                currentUser={mockCurrentUser}
                comments={mockComments}
                isServiceDeskProject={false}
                onSave={mockOnSave}
                onCreate={mockOnCreate}
                fetchUsers={mockFetchUsers}
                fetchImage={mockFetchImage}
                onDelete={mockOnDelete}
                commentText=""
                onCommentTextChange={mockOnCommentTextChange}
                isEditingComment={false}
                onEditingCommentChange={mockOnEditingCommentChange}
                isAtlaskitEditorEnabled={false}
                mentionProvider={mockMentionProvider}
                handleEditorFocus={mockHandleEditorFocus}
            />,
        );

        fireEvent.click(screen.getAllByText('Delete')[0]);

        expect(mockOnDelete).toHaveBeenCalledWith('comment-1');
    });

    it('allows adding a new comment', async () => {
        const IssueCommentComponentWrapper = () => {
            const [isEditingComment, setIsEditingComment] = React.useState(false);
            const [commentText, setCommentText] = React.useState('');

            return (
                <IssueCommentComponent
                    siteDetails={mockSiteDetails}
                    currentUser={mockCurrentUser}
                    comments={[]}
                    isServiceDeskProject={false}
                    onSave={mockOnSave}
                    onCreate={mockOnCreate}
                    fetchUsers={mockFetchUsers}
                    fetchImage={mockFetchImage}
                    onDelete={mockOnDelete}
                    commentText={commentText}
                    onCommentTextChange={setCommentText}
                    isEditingComment={isEditingComment}
                    onEditingCommentChange={setIsEditingComment}
                    isAtlaskitEditorEnabled={false}
                    mentionProvider={mockMentionProvider}
                    handleEditorFocus={mockHandleEditorFocus}
                />
            );
        };

        renderWithEditorProvider(<IssueCommentComponentWrapper />);

        fireEvent.click(screen.getByPlaceholderText('Add a comment...'));
        fireEvent.focus(screen.getByRole('textbox'));
        fireEvent.input(screen.getByRole('textbox'), { target: { value: 'New comment' } });
        fireEvent.click(screen.getByText('Save'));

        // Expect ADF format (WikiMarkup is converted to ADF)
        expect(mockOnCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                version: 1,
                type: 'doc',
                content: expect.any(Array),
            }),
            undefined,
        );
    });
});
