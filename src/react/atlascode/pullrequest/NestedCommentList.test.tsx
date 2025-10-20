import { render, screen } from '@testing-library/react';
import React from 'react';
import { AtlascodeMentionProvider } from 'src/webviews/components/issue/common/AtlaskitEditor/AtlascodeMentionsProvider';

import { Comment, PullRequestState, User } from '../../../bitbucket/model';
import { NestedCommentList } from './NestedCommentList';

// Mock NestedComment component
jest.mock('./NestedComment', () => ({
    NestedComment: ({ comment, currentUser, fetchUsers, onDelete, pullRequestState, mentionsProvider }: any) => (
        <div data-testid={`nested-comment-${comment.id}`}>
            <div data-testid="comment-id">{comment.id}</div>
            <div data-testid="comment-content">{comment.htmlContent}</div>
            <div data-testid="comment-user">{comment.user.displayName}</div>
            <div data-testid="current-user">{currentUser.displayName}</div>
            <div data-testid="pull-request-state">{pullRequestState}</div>
            <div data-testid="has-mentions-provider">{mentionsProvider ? 'yes' : 'no'}</div>
            <button onClick={() => onDelete(comment)} data-testid={`delete-${comment.id}`}>
                Delete
            </button>
            <button onClick={() => fetchUsers('test')} data-testid={`fetch-users-${comment.id}`}>
                Fetch Users
            </button>
        </div>
    ),
}));

// Mock Material-UI components
jest.mock('@mui/material', () => ({
    Grid: ({ children, className, spacing, direction, justifyContent, item, ...props }: any) => (
        <div
            className={className}
            data-testid={item ? 'grid-item' : 'grid-container'}
            data-spacing={spacing}
            data-direction={direction}
            data-justify-content={justifyContent}
            {...props}
        >
            {children}
        </div>
    ),
}));

jest.mock('@mui/styles', () => ({
    makeStyles: jest.fn(() => () => ({
        nestedComment: 'mock-nested-comment-class',
    })),
}));

describe('NestedCommentList', () => {
    const mockUser: User = {
        accountId: 'user1',
        displayName: 'Test User',
        avatarUrl: 'avatar.jpg',
        url: 'https://user1.com',
        mention: '@testuser',
    };

    const mockCurrentUser: User = {
        accountId: 'current-user',
        displayName: 'Current User',
        avatarUrl: 'current-avatar.jpg',
        url: 'https://current-user.com',
        mention: '@currentuser',
    };

    const createMockComment = (id: string, overrides: Partial<Comment> = {}): Comment => ({
        id,
        deletable: true,
        editable: true,
        user: mockUser,
        htmlContent: `<p>Comment ${id} content</p>`,
        rawContent: `Comment ${id} content`,
        ts: '2023-01-01T00:00:00Z',
        updatedTs: '2023-01-01T00:00:00Z',
        deleted: false,
        tasks: [],
        children: [],
        ...overrides,
    });

    const defaultProps = {
        comments: [],
        currentUser: mockCurrentUser,
        fetchUsers: jest.fn(),
        onDelete: jest.fn(),
        pullRequestState: 'OPEN' as PullRequestState,
    };

    const mockMentionsProvider = {
        filter: jest.fn(),
        recordMentionSelection: jest.fn(),
    } as Partial<AtlascodeMentionProvider> as AtlascodeMentionProvider;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders empty list when no comments provided', () => {
            render(<NestedCommentList {...defaultProps} />);

            const container = screen.getByTestId('pullrequest.comment-list');
            expect(container).toBeTruthy();
            expect(screen.queryByTestId(/nested-comment-/)).not.toBeTruthy();
        });

        it('renders single comment correctly', () => {
            const comment = createMockComment('comment1');
            const props = { ...defaultProps, comments: [comment] };

            render(<NestedCommentList {...props} />);

            expect(screen.getByTestId('pullrequest.comment-list')).toBeTruthy();
            expect(screen.getByTestId('nested-comment-comment1')).toBeTruthy();
            expect(screen.getByTestId('comment-id')).toBeTruthy();
            expect(screen.getByTestId('comment-id').textContent).toBe('comment1');
            expect(screen.getByTestId('comment-content').textContent).toBe('<p>Comment comment1 content</p>');
        });

        it('renders multiple comments correctly', () => {
            const comments = [
                createMockComment('comment1'),
                createMockComment('comment2'),
                createMockComment('comment3'),
            ];
            const props = { ...defaultProps, comments };

            render(<NestedCommentList {...props} />);

            expect(screen.getByTestId('pullrequest.comment-list')).toBeTruthy();
            expect(screen.getByTestId('nested-comment-comment1')).toBeTruthy();
            expect(screen.getByTestId('nested-comment-comment2')).toBeTruthy();
            expect(screen.getByTestId('nested-comment-comment3')).toBeTruthy();

            const commentIds = screen.getAllByTestId('comment-id');
            expect(commentIds).toHaveLength(3);
            expect(commentIds[0].textContent).toBe('comment1');
            expect(commentIds[1].textContent).toBe('comment2');
            expect(commentIds[2].textContent).toBe('comment3');
        });
    });

    describe('Props passing', () => {
        it('passes all required props to NestedComment components', () => {
            const comment = createMockComment('comment1');
            const props = { ...defaultProps, comments: [comment] };

            render(<NestedCommentList {...props} />);

            expect(screen.getByTestId('comment-user').textContent).toBe('Test User');
            expect(screen.getByTestId('current-user').textContent).toBe('Current User');
            expect(screen.getByTestId('pull-request-state').textContent).toBe('OPEN');
            expect(screen.getByTestId('has-mentions-provider').textContent).toBe('no');
        });

        it('passes mentionsProvider when provided', () => {
            const comment = createMockComment('comment1');
            const props = { ...defaultProps, comments: [comment], mentionsProvider: mockMentionsProvider };

            render(<NestedCommentList {...props} />);

            expect(screen.getByTestId('has-mentions-provider').textContent).toBe('yes');
        });

        it('passes different pull request states correctly', () => {
            const comment = createMockComment('comment1');

            const states: PullRequestState[] = ['OPEN', 'MERGED', 'DECLINED', 'SUPERSEDED'];

            states.forEach((state) => {
                const { unmount } = render(
                    <NestedCommentList {...defaultProps} comments={[comment]} pullRequestState={state} />,
                );

                expect(screen.getByTestId('pull-request-state').textContent).toBe(state);
                unmount();
            });
        });

        it('passes different users correctly', () => {
            const differentUser: User = {
                accountId: 'different-user',
                displayName: 'Different User',
                avatarUrl: 'different-avatar.jpg',
                url: 'https://different-user.com',
                mention: '@differentuser',
            };

            const comment = createMockComment('comment1', { user: differentUser });
            const props = { ...defaultProps, comments: [comment] };

            render(<NestedCommentList {...props} />);

            expect(screen.getByTestId('comment-user').textContent).toBe('Different User');
            expect(screen.getByTestId('current-user').textContent).toBe('Current User');
        });
    });

    describe('Event handling', () => {
        it('handles onDelete callback correctly', async () => {
            const mockOnDelete = jest.fn();
            const comment = createMockComment('comment1');
            const props = { ...defaultProps, comments: [comment], onDelete: mockOnDelete };

            render(<NestedCommentList {...props} />);

            const deleteButton = screen.getByTestId('delete-comment1');
            deleteButton.click();

            expect(mockOnDelete).toHaveBeenCalledWith(comment);
        });

        it('handles fetchUsers callback correctly', async () => {
            const mockFetchUsers = jest.fn().mockResolvedValue([]);
            const comment = createMockComment('comment1');
            const props = { ...defaultProps, comments: [comment], fetchUsers: mockFetchUsers };

            render(<NestedCommentList {...props} />);

            const fetchButton = screen.getByTestId('fetch-users-comment1');
            fetchButton.click();

            expect(mockFetchUsers).toHaveBeenCalledWith('test');
        });

        it('handles multiple comments with separate callbacks', async () => {
            const mockOnDelete = jest.fn();
            const mockFetchUsers = jest.fn().mockResolvedValue([]);
            const comments = [createMockComment('comment1'), createMockComment('comment2')];
            const props = { ...defaultProps, comments, onDelete: mockOnDelete, fetchUsers: mockFetchUsers };

            render(<NestedCommentList {...props} />);

            const deleteButton1 = screen.getByTestId('delete-comment1');
            const deleteButton2 = screen.getByTestId('delete-comment2');
            const fetchButton1 = screen.getByTestId('fetch-users-comment1');
            const fetchButton2 = screen.getByTestId('fetch-users-comment2');

            deleteButton1.click();
            expect(mockOnDelete).toHaveBeenCalledWith(comments[0]);

            deleteButton2.click();
            expect(mockOnDelete).toHaveBeenCalledWith(comments[1]);

            fetchButton1.click();
            fetchButton2.click();
            expect(mockFetchUsers).toHaveBeenCalledTimes(2);
        });
    });

    describe('Comment structure variations', () => {
        it('handles comments with different properties', () => {
            const comments = [
                createMockComment('comment1', {
                    deletable: false,
                    editable: false,
                    deleted: true,
                }),
                createMockComment('comment2', {
                    deletable: true,
                    editable: true,
                    deleted: false,
                    parentId: 'parent1',
                }),
                createMockComment('comment3', {
                    htmlContent: '<p>Rich <strong>formatted</strong> content</p>',
                    rawContent: 'Rich formatted content',
                    tasks: [],
                    children: [],
                }),
            ];
            const props = { ...defaultProps, comments };

            render(<NestedCommentList {...props} />);

            expect(screen.getByTestId('nested-comment-comment1')).toBeTruthy();
            expect(screen.getByTestId('nested-comment-comment2')).toBeTruthy();
            expect(screen.getByTestId('nested-comment-comment3')).toBeTruthy();

            const contentElements = screen.getAllByTestId('comment-content');
            expect(contentElements[2].textContent).toBe('<p>Rich <strong>formatted</strong> content</p>');
        });

        it('handles comments with inline properties', () => {
            const comment = createMockComment('comment1', {
                inline: {
                    from: 10,
                    to: 20,
                    path: 'src/file.ts',
                },
            });
            const props = { ...defaultProps, comments: [comment] };

            render(<NestedCommentList {...props} />);

            expect(screen.getByTestId('nested-comment-comment1')).toBeTruthy();
        });

        it('handles comments with tasks and children', () => {
            const childComment = createMockComment('child1');
            const parentComment = createMockComment('parent1', {
                children: [childComment],
                tasks: [
                    {
                        id: 'task1',
                        content: 'Task content',
                        isComplete: false,
                        creator: mockUser,
                        created: '2023-01-01T00:00:00Z',
                        updated: '2023-01-01T00:00:00Z',
                        editable: true,
                        deletable: true,
                        commentId: 'parent1',
                    },
                ],
            });
            const props = { ...defaultProps, comments: [parentComment] };

            render(<NestedCommentList {...props} />);

            expect(screen.getByTestId('nested-comment-parent1')).toBeTruthy();
        });
    });

    describe('Key prop handling', () => {
        it('uses comment id as key for React rendering', () => {
            const comments = [
                createMockComment('unique-id-1'),
                createMockComment('unique-id-2'),
                createMockComment('unique-id-3'),
            ];
            const props = { ...defaultProps, comments };

            const { rerender } = render(<NestedCommentList {...props} />);

            expect(screen.getByTestId('nested-comment-unique-id-1')).toBeTruthy();
            expect(screen.getByTestId('nested-comment-unique-id-2')).toBeTruthy();
            expect(screen.getByTestId('nested-comment-unique-id-3')).toBeTruthy();

            // Test re-rendering with different order
            const reorderedComments = [comments[2], comments[0], comments[1]];
            rerender(<NestedCommentList {...props} comments={reorderedComments} />);

            expect(screen.getByTestId('nested-comment-unique-id-1')).toBeTruthy();
            expect(screen.getByTestId('nested-comment-unique-id-2')).toBeTruthy();
            expect(screen.getByTestId('nested-comment-unique-id-3')).toBeTruthy();
        });
    });

    describe('Error boundaries and edge cases', () => {
        it('handles empty comment properties gracefully', () => {
            const comment = createMockComment('', {
                htmlContent: '',
                rawContent: '',
                user: {
                    accountId: '',
                    displayName: '',
                    avatarUrl: '',
                    url: '',
                    mention: '',
                },
            });
            const props = { ...defaultProps, comments: [comment] };

            render(<NestedCommentList {...props} />);

            expect(screen.getByTestId('nested-comment-')).toBeTruthy();
            expect(screen.getByTestId('comment-content').textContent).toBe('');
            expect(screen.getByTestId('comment-user').textContent).toBe('');
        });

        it('handles null/undefined mentions provider', () => {
            const comment = createMockComment('comment1');
            const props = { ...defaultProps, comments: [comment], mentionsProvider: undefined };

            render(<NestedCommentList {...props} />);

            expect(screen.getByTestId('has-mentions-provider').textContent).toBe('no');
        });

        it('renders when fetchUsers throws error', () => {
            const mockFetchUsers = jest.fn().mockRejectedValue(new Error('Network error'));
            const comment = createMockComment('comment1');
            const props = { ...defaultProps, comments: [comment], fetchUsers: mockFetchUsers };

            expect(() => render(<NestedCommentList {...props} />)).not.toThrow();
            expect(screen.getByTestId('nested-comment-comment1')).toBeTruthy();
        });

        it('renders when onDelete throws error', () => {
            const mockOnDelete = jest.fn().mockRejectedValue(new Error('Delete error'));
            const comment = createMockComment('comment1');
            const props = { ...defaultProps, comments: [comment], onDelete: mockOnDelete };

            expect(() => render(<NestedCommentList {...props} />)).not.toThrow();
            expect(screen.getByTestId('nested-comment-comment1')).toBeTruthy();
        });
    });
});
