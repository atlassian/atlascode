import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { User } from '../../../bitbucket/model';
import CommentForm from './CommentForm';

jest.mock('src/webviews/components/issue/common/AtlaskitEditor/AtlaskitEditor', () => {
    return function MockAtlaskitEditor({
        defaultValue,
        onSave,
        onCancel,
        isBitbucket,
    }: {
        defaultValue?: string;
        onSave?: (content: string) => void;
        onCancel?: () => void;
        isBitbucket?: boolean;
    }) {
        const [content, setContent] = React.useState(defaultValue || '');

        return (
            <div data-testid="mock-atlaskit-editor">
                <textarea
                    data-testid="editor-textarea"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write a comment..."
                />
                <div data-testid="editor-props">
                    <span data-testid="is-bitbucket" data-is-bitbucket={isBitbucket ? 'true' : 'false'}></span>
                </div>
                <button data-testid="save-button" onClick={() => onSave?.(content)} disabled={!content.trim()}>
                    Save
                </button>
                {onCancel && (
                    <button data-testid="cancel-button" onClick={onCancel}>
                        Cancel
                    </button>
                )}
            </div>
        );
    };
});

jest.mock('@mui/material', () => ({
    Avatar: ({ src, ...props }: { src?: string }) => (
        <div data-testid="avatar" data-src={src} {...props}>
            Avatar
        </div>
    ),
    Grid: ({ children, ...props }: { children: React.ReactNode }) => (
        <div data-testid="grid" {...props}>
            {children}
        </div>
    ),
}));

describe('CommentForm', () => {
    const mockUser: User = {
        accountId: 'user-123',
        displayName: 'John Doe',
        emailAddress: 'john@example.com',
        url: 'https://example.com/user/john',
        avatarUrl: 'https://example.com/avatar/john.jpg',
        mention: '@john',
    };

    const defaultProps = {
        currentUser: mockUser,
        onSave: jest.fn(),
        mentionsProvider: undefined,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should render the comment form with all required elements', () => {
            render(<CommentForm {...defaultProps} />);

            expect(screen.getByTestId('common.comment-form')).toBeTruthy();
            expect(screen.getByTestId('avatar')).toBeTruthy();
            expect(screen.getByTestId('common.atlaskit-editor')).toBeTruthy();
            expect(screen.getByTestId('mock-atlaskit-editor')).toBeTruthy();
        });

        it('should display user avatar with correct src', () => {
            render(<CommentForm {...defaultProps} />);

            const avatar = screen.getByTestId('avatar');
            expect(avatar.getAttribute('data-src')).toBe(mockUser.avatarUrl);
        });

        it('should render the editor with correct test id', () => {
            render(<CommentForm {...defaultProps} />);

            expect(screen.getByTestId('common.atlaskit-editor')).toBeTruthy();
        });
    });

    describe('Props Passing', () => {
        it('should pass initial content to the editor', () => {
            const initialContent = 'Initial comment content';
            render(<CommentForm {...defaultProps} initialContent={initialContent} />);

            expect(screen.getByText('Initial comment content')).toBeTruthy();
        });

        it('should pass onSave callback to the editor', async () => {
            const onSave = jest.fn().mockResolvedValue(undefined);
            render(<CommentForm {...defaultProps} onSave={onSave} />);

            const textarea = screen.getByTestId('editor-textarea');
            const saveButton = screen.getByTestId('save-button');

            await userEvent.type(textarea, 'Test comment');
            await userEvent.click(saveButton);

            expect(onSave).toHaveBeenCalledTimes(1);
            expect(onSave).toHaveBeenCalledWith('Test comment');
        });

        it('should pass onCancel callback to the editor when provided', () => {
            const onCancel = jest.fn();
            render(<CommentForm {...defaultProps} onCancel={onCancel} />);

            const cancelButton = screen.getByTestId('cancel-button');
            expect(cancelButton).toBeTruthy();
        });

        it('should not render cancel button when onCancel is not provided', () => {
            render(<CommentForm {...defaultProps} />);

            expect(screen.queryByTestId('cancel-button')).toBeFalsy();
        });

        it('should always pass isBitbucket as true to the editor', () => {
            render(<CommentForm {...defaultProps} />);
            expect(screen.getByTestId('is-bitbucket').getAttribute('data-is-bitbucket')).toBe('true');
        });
    });

    describe('User Interactions', () => {
        it('should handle save action correctly', async () => {
            const onSave = jest.fn().mockResolvedValue(undefined);
            render(<CommentForm {...defaultProps} onSave={onSave} />);

            const textarea = screen.getByTestId('editor-textarea');
            const saveButton = screen.getByTestId('save-button');

            await userEvent.type(textarea, 'My test comment');
            await userEvent.click(saveButton);

            expect(onSave).toHaveBeenCalledWith('My test comment');
        });

        it('should handle cancel action correctly', async () => {
            const onCancel = jest.fn();
            render(<CommentForm {...defaultProps} onCancel={onCancel} />);

            const cancelButton = screen.getByTestId('cancel-button');
            await userEvent.click(cancelButton);

            expect(onCancel).toHaveBeenCalledTimes(1);
        });
    });

    describe('Edge Cases', () => {
        it('should handle user without avatar URL', () => {
            const userWithoutAvatar = {
                ...mockUser,
                avatarUrl: '',
            };

            render(<CommentForm {...defaultProps} currentUser={userWithoutAvatar} />);

            const avatar = screen.getByTestId('avatar');
            expect(avatar.getAttribute('data-src')).toBe('');
        });

        it('should handle user with minimal required fields', () => {
            const minimalUser: User = {
                accountId: 'min-user',
                displayName: 'Minimal User',
                url: '',
                avatarUrl: '',
                mention: '@minimal',
            };

            render(<CommentForm {...defaultProps} currentUser={minimalUser} />);

            expect(screen.getByTestId('common.comment-form')).toBeTruthy();
            expect(screen.getByTestId('avatar').getAttribute('data-src')).toBe('');
        });
    });
});
