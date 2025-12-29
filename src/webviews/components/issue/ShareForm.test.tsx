import { User } from '@atlassianlabs/jira-pi-common-models';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import ShareForm from './ShareForm';

describe('ShareForm', () => {
    const mockOnShare = jest.fn();
    const mockOnCancel = jest.fn();
    const mockFetchUsers = jest.fn();

    const defaultProps = {
        onShare: mockOnShare,
        onCancel: mockOnCancel,
        fetchUsers: mockFetchUsers,
        isLoading: false,
        issueKey: 'TEST-123',
        issueSummary: 'Test Issue Summary',
        issueUrl: 'https://test.atlassian.net/browse/TEST-123',
    };

    const mockUsers: User[] = [
        {
            accountId: 'user-1',
            displayName: 'John Doe',
            avatarUrls: { '48x48': 'https://example.com/avatar1.png' },
        } as User,
        {
            accountId: 'user-2',
            displayName: 'Jane Smith',
            avatarUrls: { '48x48': 'https://example.com/avatar2.png' },
        } as User,
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetchUsers.mockResolvedValue(mockUsers);
    });

    it('renders without crashing', () => {
        render(<ShareForm {...defaultProps} />);
        expect(screen.getByText('Share issue')).toBeTruthy();
    });

    it('renders the share form with all required elements', () => {
        render(<ShareForm {...defaultProps} />);

        expect(screen.getByText('Share issue')).toBeTruthy();
        expect(screen.getByText('Names')).toBeTruthy();
        expect(screen.getByText('Message')).toBeTruthy();
        expect(screen.getByText('Copy link')).toBeTruthy();
        expect(screen.getByText('Cancel')).toBeTruthy();
        expect(screen.getByText('Share')).toBeTruthy();
    });

    it('calls onCancel when Cancel button is clicked', () => {
        render(<ShareForm {...defaultProps} />);

        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);

        expect(mockOnCancel).toHaveBeenCalled();
    });

    it('Share button is disabled when no recipients are selected', () => {
        render(<ShareForm {...defaultProps} />);

        const shareButton = screen.getByText('Share').closest('button') as HTMLButtonElement;
        expect(shareButton.disabled).toBe(true);
    });

    it('displays loading state when isLoading is true', () => {
        render(<ShareForm {...defaultProps} isLoading={true} />);

        expect(screen.getByText('Sharing...')).toBeTruthy();
    });

    it('allows entering a message', async () => {
        render(<ShareForm {...defaultProps} />);

        const messageInput = screen.getByPlaceholderText('Anything they should know?') as HTMLTextAreaElement;
        await userEvent.type(messageInput, 'This is a test message');

        expect(messageInput.value).toBe('This is a test message');
    });

    it('copies link to clipboard when Copy link is clicked', async () => {
        const mockClipboard = {
            writeText: jest.fn().mockResolvedValue(undefined),
        };
        Object.assign(navigator, { clipboard: mockClipboard });

        render(<ShareForm {...defaultProps} />);

        const copyLinkButton = screen.getByText('Copy link');
        fireEvent.click(copyLinkButton);

        await waitFor(() => {
            expect(mockClipboard.writeText).toHaveBeenCalledWith('https://test.atlassian.net/browse/TEST-123');
        });

        await waitFor(() => {
            expect(screen.getByText('Link copied!')).toBeTruthy();
        });
    });
});
