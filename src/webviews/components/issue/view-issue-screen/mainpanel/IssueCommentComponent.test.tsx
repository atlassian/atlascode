import { Comment as JiraComment, User } from '@atlassianlabs/jira-pi-common-models';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { DetailedSiteInfo, Product } from 'src/atlclients/authInfo';
import { disableConsole } from 'testsutil';

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

describe('IssueCommentComponent', () => {
    beforeAll(() => {
        disableConsole('warn', 'error');
    });

    it('renders the AddCommentComponent', () => {
        render(
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
            />,
        );

        expect(screen.getByPlaceholderText('Add a comment...')).toBeTruthy();
    });

    it('renders a list of comments', () => {
        render(
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
            />,
        );

        expect(screen.getByText('This is a test comment')).toBeTruthy();
        expect(screen.getByText('Another test comment')).toBeTruthy();
    });

    it('allows editing a comment', () => {
        render(
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
                isRteEnabled={true}
                commentText=""
                onCommentTextChange={mockOnCommentTextChange}
                isEditingComment={false}
                onEditingCommentChange={mockOnEditingCommentChange}
            />,
        );

        fireEvent.click(screen.getAllByText('Edit')[0]);
        fireEvent.click(screen.getByLabelText('rte toggle'));
        const textArea = screen.getAllByRole('textbox')[1];
        fireEvent.change(textArea, { target: { value: 'Updated comment' } });
        fireEvent.click(screen.getByText('Save'));

        expect(mockOnSave).toHaveBeenCalledWith('Updated comment', 'comment-2', undefined);
    });

    it('allows deleting a comment', () => {
        render(
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
                    isRteEnabled={true}
                    commentText={commentText}
                    onCommentTextChange={setCommentText}
                    isEditingComment={isEditingComment}
                    onEditingCommentChange={setIsEditingComment}
                />
            );
        };

        render(<IssueCommentComponentWrapper />);

        fireEvent.click(screen.getByPlaceholderText('Add a comment...'));
        fireEvent.click(await screen.findByLabelText('rte toggle'));
        fireEvent.focus(screen.getByRole('textbox'));
        fireEvent.input(screen.getByRole('textbox'), { target: { value: 'New comment' } });
        fireEvent.click(screen.getByText('Save'));

        expect(mockOnCreate).toHaveBeenCalledWith('New comment', undefined);
    });
});
