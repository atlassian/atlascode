import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IssueCommentComponent } from './IssueCommentComponent';
import { User, Comment as JiraComment } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo, Product } from 'src/atlclients/authInfo';

const mockSiteDetails: DetailedSiteInfo = {
    userId: 'user-123',
    id: '',
    name: '',
    avatarUrl: '',
    baseLinkUrl: '',
    baseApiUrl: '',
    isCloud: false,
    credentialId: '',
    hasResolutionField: false,
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

describe('IssueCommentComponent', () => {
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
            />,
        );

        fireEvent.click(screen.getAllByText('Edit')[0]);
        const textArea = screen.getByText('Another test comment');
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
            />,
        );

        fireEvent.click(screen.getAllByText('Delete')[0]);

        expect(mockOnDelete).toHaveBeenCalledWith('comment-1');
    });

    it('allows adding a new comment', () => {
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
            />,
        );

        fireEvent.click(screen.getByPlaceholderText('Add a comment...'));
        const textArea = screen.getByRole('textbox');
        fireEvent.change(textArea, { target: { value: 'New comment' } });
        fireEvent.click(screen.getByText('Save'));

        expect(mockOnCreate).toHaveBeenCalledWith('New comment', undefined);
    });
});
