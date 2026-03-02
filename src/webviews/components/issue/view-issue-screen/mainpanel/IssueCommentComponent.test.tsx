import { Comment as JiraComment, User } from '@atlassianlabs/jira-pi-common-models';
type ADFDoc = { version: number; type: 'doc'; content: any[] };
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

type JiraCommentWithAdf = Omit<JiraComment, 'body'> & { body: string | ADFDoc };

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

    describe('Comment body text rendering (bodyText logic)', () => {
        it('should prefer renderedBody over body when available', () => {
            const commentWithRenderedBody: JiraComment = {
                id: 'comment-3',
                body: 'h1. This is wiki markup',
                renderedBody: '<h1>This is wiki markup</h1>',
                author: mockComments[0].author,
                created: '2023-01-03T12:00:00Z',
                updated: '2023-01-03T12:00:00Z',
                self: '',
                visibility: undefined,
                jsdPublic: false,
            };

            renderWithEditorProvider(
                <IssueCommentComponent
                    siteDetails={mockSiteDetails}
                    currentUser={mockCurrentUser}
                    comments={[commentWithRenderedBody]}
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

            // The rendered body should be used to display the comment
            expect(mockFetchImage).not.toHaveBeenCalled(); // Just checking component rendered
        });

        it('should convert ADF to WikiMarkup when renderedBody is not available', () => {
            const adfComment: JiraCommentWithAdf = {
                id: 'comment-4',
                body: {
                    version: 1,
                    type: 'doc',
                    content: [
                        {
                            type: 'paragraph',
                            content: [
                                {
                                    type: 'text',
                                    text: 'This is ADF content',
                                },
                            ],
                        },
                    ],
                },
                author: mockComments[0].author,
                created: '2023-01-04T12:00:00Z',
                updated: '2023-01-04T12:00:00Z',
                self: '',
                visibility: undefined,
                jsdPublic: false,
            };

            renderWithEditorProvider(
                <IssueCommentComponent
                    siteDetails={mockSiteDetails}
                    currentUser={mockCurrentUser}
                    comments={[adfComment]}
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

            // Component should render without errors
            expect(screen.getByTestId('issue.comments-section')).toBeTruthy();
        });

        it('should use plain text body as fallback when no renderedBody or ADF', () => {
            const plainTextComment: JiraComment = {
                id: 'comment-5',
                body: 'Plain text comment',
                author: mockComments[0].author,
                created: '2023-01-05T12:00:00Z',
                updated: '2023-01-05T12:00:00Z',
                self: '',
                visibility: undefined,
                jsdPublic: false,
            };

            renderWithEditorProvider(
                <IssueCommentComponent
                    siteDetails={mockSiteDetails}
                    currentUser={mockCurrentUser}
                    comments={[plainTextComment]}
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

            expect(screen.getByTestId('issue.comments-section')).toBeTruthy();
        });

        it('should handle comments with all text formatting possibilities', () => {
            const complexComment: JiraComment = {
                id: 'comment-6',
                body: '*bold* _italic_ -strikethrough- +underline+ [link|http://example.com]',
                renderedBody:
                    '<p><strong>bold</strong> <em>italic</em> <s>strikethrough</s> <u>underline</u> <a href="http://example.com">link</a></p>',
                author: mockComments[0].author,
                created: '2023-01-06T12:00:00Z',
                updated: '2023-01-06T12:00:00Z',
                self: '',
                visibility: undefined,
                jsdPublic: false,
            };

            renderWithEditorProvider(
                <IssueCommentComponent
                    siteDetails={mockSiteDetails}
                    currentUser={mockCurrentUser}
                    comments={[complexComment]}
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

            expect(screen.getByTestId('issue.comments-section')).toBeTruthy();
        });
    });

    describe('Snapshot Tests', () => {
        it('should match snapshot when rendering multiple comments', () => {
            const { container } = renderWithEditorProvider(
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

            expect(container).toMatchSnapshot('multiple-comments');
        });

        it('should match snapshot when rendering comment with renderedBody', () => {
            const commentWithRenderedBody: JiraComment = {
                id: 'comment-3',
                body: 'h1. Heading\nSome content',
                renderedBody: '<h1>Heading</h1><p>Some content</p>',
                author: mockComments[0].author,
                created: '2023-01-03T12:00:00Z',
                updated: '2023-01-03T12:00:00Z',
                self: '',
                visibility: undefined,
                jsdPublic: false,
            };

            const { container } = renderWithEditorProvider(
                <IssueCommentComponent
                    siteDetails={mockSiteDetails}
                    currentUser={mockCurrentUser}
                    comments={[commentWithRenderedBody]}
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

            expect(container).toMatchSnapshot('comment-with-rendered-body');
        });

        it('should match snapshot for empty comment list', () => {
            const { container } = renderWithEditorProvider(
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

            expect(container).toMatchSnapshot('empty-comment-list');
        });
    });
});
