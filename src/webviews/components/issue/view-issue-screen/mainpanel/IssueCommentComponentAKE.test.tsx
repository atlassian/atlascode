import { Comment as JiraComment, User } from '@atlassianlabs/jira-pi-common-models';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { DetailedSiteInfo, Product } from 'src/atlclients/authInfo';

import { AtlascodeMentionProvider } from '../../common/AtlaskitEditor/AtlascodeMentionsProvider';
import { EditorStateProvider } from '../EditorStateContext';
import { IssueCommentComponent, type IssueCommentComponentProps } from './IssueCommentComponent';

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

// Mock mention provider
const mockMentionProvider = AtlascodeMentionProvider.init({ url: '' }, jest.fn().mockResolvedValue([]));

describe('IssueCommentComponent with Atlaskit Editor', () => {
    const renderComponent = ({
        siteDetails = mockSiteDetails,
        currentUser = mockCurrentUser,
        comments = [],
        isServiceDeskProject = false,
        onSave = mockOnSave,
        onCreate = mockOnCreate,
        fetchUsers = mockFetchUsers,
        fetchImage = mockFetchImage,
        onDelete = mockOnDelete,
        commentText = '',
        onCommentTextChange = mockOnCommentTextChange,
        isEditingComment = false,
        onEditingCommentChange = mockOnEditingCommentChange,
        isAtlaskitEditorEnabled = true,
        mentionProvider = mockMentionProvider,
    }: Partial<IssueCommentComponentProps>) => {
        return (
            <EditorStateProvider>
                <IssueCommentComponent
                    siteDetails={siteDetails}
                    currentUser={currentUser}
                    comments={comments}
                    isServiceDeskProject={isServiceDeskProject}
                    onSave={onSave}
                    onCreate={onCreate}
                    fetchUsers={fetchUsers}
                    fetchImage={fetchImage}
                    onDelete={onDelete}
                    commentText={commentText}
                    onCommentTextChange={onCommentTextChange}
                    isEditingComment={isEditingComment}
                    onEditingCommentChange={onEditingCommentChange}
                    isAtlaskitEditorEnabled={isAtlaskitEditorEnabled}
                    mentionProvider={mentionProvider}
                />
            </EditorStateProvider>
        );
    };

    it('renders the AddCommentComponent', () => {
        render(renderComponent({}));

        expect(screen.getByPlaceholderText('Add a comment...')).toBeTruthy();
    });

    it('renders a list of comments', async () => {
        await act(() => render(renderComponent({ comments: mockComments })));
        expect(await screen.findByText('This is a test comment', {}, { timeout: 3000 })).toBeTruthy();
        expect(await screen.findByText('Another test comment')).toBeTruthy();
    }, 20000);
    // TODO: uncomment when we understand reason of long test execution time on CI
    // it('renders editing comment area', async () => {
    //    render(renderComponent({ comments: [mockComments[0]] }));
    //     const editButton = await screen.findByText('Edit');
    //     await act(() => fireEvent.click(editButton));
    //     const editor = await screen.findByTestId('ak-editor-main-toolbar');
    //     expect(editor).toBeTruthy();
    // }, 60000);

    it('allows deleting a comment', () => {
        render(renderComponent({ comments: mockComments }));

        fireEvent.click(screen.getAllByText('Delete')[0]);

        expect(mockOnDelete).toHaveBeenCalledWith('comment-1');
    });

    it('renders editor in adding a new comment area', async () => {
        const IssueCommentComponentWrapper = () => {
            const [isEditingComment, setIsEditingComment] = React.useState(false);
            const [commentText, setCommentText] = React.useState('');
            return renderComponent({
                commentText,
                onCommentTextChange: setCommentText,
                isEditingComment,
                onEditingCommentChange: setIsEditingComment,
            });
        };

        await act(() =>
            render(
                <EditorStateProvider>
                    <IssueCommentComponentWrapper />
                </EditorStateProvider>,
            ),
        );

        await act(() => fireEvent.click(screen.getByPlaceholderText('Add a comment...')));
        const editor = await screen.findByLabelText('Rich text editor for comments');
        expect(editor).toBeTruthy();
    }, 30000);
});
