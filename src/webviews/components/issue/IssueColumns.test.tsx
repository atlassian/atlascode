import { User } from '@atlassianlabs/jira-pi-common-models';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { AssigneeColumn } from './IssueColumns';

describe('AssigneeColumn', () => {
    const mockOnAssigneeChange = jest.fn();
    const mockFetchUsers = jest.fn();

    const mockIssue = {
        id: 'issue-123',
        key: 'TEST-123',
        summary: 'Test Issue',
        self: 'https://test.atlassian.net/rest/api/2/issue/123',
        siteDetails: {
            baseApiUrl: 'https://test.atlassian.net',
            baseLinkUrl: 'https://test.atlassian.net',
            isCloud: true,
        } as any,
        issuetype: {
            id: '1',
            name: 'Task',
            iconUrl: 'task.png',
        },
        status: {
            id: '1',
            name: 'To Do',
            description: 'Work to be done',
            iconUrl: 'status.png',
            self: 'https://test.atlassian.net/rest/api/2/status/1',
            statusCategory: {
                id: 2,
                key: 'new',
                name: 'New',
                colorName: 'blue-gray',
                self: 'https://test.atlassian.net/rest/api/2/statuscategory/2',
            },
        },
        priority: {
            id: '3',
            name: 'Medium',
            iconUrl: 'medium.png',
        },
    } as any;

    const mockAssignee = {
        accountId: 'user-123',
        displayName: 'John Doe',
        avatarUrls: {
            '16x16': 'avatar-16.png',
            '24x24': 'avatar-24.png',
            '32x32': 'avatar-32.png',
            '48x48': 'avatar-48.png',
        },
    };

    const mockUsers: User[] = [
        {
            accountId: 'user-456',
            displayName: 'Jane Smith',
            avatarUrls: {
                '16x16': 'jane-avatar-16.png',
                '24x24': 'jane-avatar-24.png',
                '32x32': 'jane-avatar-32.png',
                '48x48': 'jane-avatar-48.png',
            },
        } as User,
        {
            accountId: 'user-789',
            displayName: 'Bob Johnson',
            avatarUrls: {
                '16x16': 'bob-avatar-16.png',
                '24x24': 'bob-avatar-24.png',
                '32x32': 'bob-avatar-32.png',
                '48x48': 'bob-avatar-48.png',
            },
        } as User,
    ];

    const mockOnIssueClick = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    describe('Read-only mode', () => {
        it('renders assignee name and avatar when assignee exists', () => {
            const data = {
                issue: { ...mockIssue, assignee: mockAssignee },
                onIssueClick: mockOnIssueClick,
            };

            const { container } = render(<AssigneeColumn {...data} />);

            expect(screen.getByText('John Doe')).toBeTruthy();
            const avatar = container.querySelector('img');
            expect(avatar?.getAttribute('src')).toBe('avatar-24.png');
        });

        it('renders "Unassigned" when no assignee exists', () => {
            const data = {
                issue: { ...mockIssue, assignee: null },
                onIssueClick: mockOnIssueClick,
            };

            render(<AssigneeColumn {...data} />);

            expect(screen.getByText('Unassigned')).toBeTruthy();
        });

        it('does not render dropdown when onAssigneeChange is not provided', () => {
            const data = {
                issue: { ...mockIssue, assignee: mockAssignee },
                onIssueClick: mockOnIssueClick,
            };

            const { container } = render(<AssigneeColumn {...data} />);

            expect(container.querySelector('button')).toBeNull();
        });
    });

    describe('Editable mode', () => {
        it('renders dropdown button when onAssigneeChange is provided', () => {
            const data = {
                issue: { ...mockIssue, assignee: mockAssignee },
                onIssueClick: mockOnIssueClick,
                onAssigneeChange: mockOnAssigneeChange,
                fetchUsers: mockFetchUsers,
            };

            render(<AssigneeColumn {...data} />);

            const button = screen.getByRole('button');
            expect(button).toBeTruthy();
            expect(screen.getByText('John Doe')).toBeTruthy();
        });

        it('shows "Unassigned" in button when no assignee', () => {
            const data = {
                issue: { ...mockIssue, assignee: null },
                onIssueClick: mockOnIssueClick,
                onAssigneeChange: mockOnAssigneeChange,
                fetchUsers: mockFetchUsers,
            };

            render(<AssigneeColumn {...data} />);

            expect(screen.getByText('Unassigned')).toBeTruthy();
        });

        it('opens dropdown and shows search input when button is clicked', async () => {
            const data = {
                issue: { ...mockIssue, assignee: mockAssignee },
                onIssueClick: mockOnIssueClick,
                onAssigneeChange: mockOnAssigneeChange,
                fetchUsers: mockFetchUsers,
            };

            render(<AssigneeColumn {...data} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Search users...')).toBeTruthy();
            });
        });

        it('searches for users when typing in search input', async () => {
            mockFetchUsers.mockResolvedValue(mockUsers);

            const data = {
                issue: { ...mockIssue, assignee: mockAssignee },
                onIssueClick: mockOnIssueClick,
                onAssigneeChange: mockOnAssigneeChange,
                fetchUsers: mockFetchUsers,
            };

            render(<AssigneeColumn {...data} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Search users...')).toBeTruthy();
            });

            const searchInput = screen.getByPlaceholderText('Search users...');
            fireEvent.change(searchInput, { target: { value: 'Jane' } });

            jest.advanceTimersByTime(300);

            await waitFor(() => {
                expect(mockFetchUsers).toHaveBeenCalledWith('Jane');
            });
        });

        it('displays search results when users are returned', async () => {
            mockFetchUsers.mockResolvedValue(mockUsers);

            const data = {
                issue: { ...mockIssue, assignee: mockAssignee },
                onIssueClick: mockOnIssueClick,
                onAssigneeChange: mockOnAssigneeChange,
                fetchUsers: mockFetchUsers,
            };

            render(<AssigneeColumn {...data} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Search users...')).toBeTruthy();
            });

            const searchInput = screen.getByPlaceholderText('Search users...');
            fireEvent.change(searchInput, { target: { value: 'Jane' } });

            jest.advanceTimersByTime(300);

            await waitFor(() => {
                expect(screen.getByText('Jane Smith')).toBeTruthy();
                expect(screen.getByText('Bob Johnson')).toBeTruthy();
            });
        });

        it('calls onAssigneeChange when a user is selected', async () => {
            mockFetchUsers.mockResolvedValue(mockUsers);

            const data = {
                issue: { ...mockIssue, assignee: mockAssignee },
                onIssueClick: mockOnIssueClick,
                onAssigneeChange: mockOnAssigneeChange,
                fetchUsers: mockFetchUsers,
            };

            render(<AssigneeColumn {...data} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Search users...')).toBeTruthy();
            });

            const searchInput = screen.getByPlaceholderText('Search users...');
            fireEvent.change(searchInput, { target: { value: 'Jane' } });

            jest.advanceTimersByTime(300);

            await waitFor(() => {
                expect(screen.getByText('Jane Smith')).toBeTruthy();
            });

            const janeOption = screen.getByText('Jane Smith');
            fireEvent.click(janeOption);

            expect(mockOnAssigneeChange).toHaveBeenCalledWith('TEST-123', mockUsers[0]);
        });

        it('shows "Unassign" option when issue has assignee', async () => {
            const data = {
                issue: { ...mockIssue, assignee: mockAssignee },
                onIssueClick: mockOnIssueClick,
                onAssigneeChange: mockOnAssigneeChange,
                fetchUsers: mockFetchUsers,
            };

            render(<AssigneeColumn {...data} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText('Unassign')).toBeTruthy();
            });
        });

        it('calls onAssigneeChange with null when "Unassign" is clicked', async () => {
            const data = {
                issue: { ...mockIssue, assignee: mockAssignee },
                onIssueClick: mockOnIssueClick,
                onAssigneeChange: mockOnAssigneeChange,
                fetchUsers: mockFetchUsers,
            };

            render(<AssigneeColumn {...data} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText('Unassign')).toBeTruthy();
            });

            const unassignButton = screen.getByText('Unassign');
            fireEvent.click(unassignButton);

            expect(mockOnAssigneeChange).toHaveBeenCalledWith('TEST-123', null);
        });

        it('shows "No users found" when search returns empty results', async () => {
            mockFetchUsers.mockResolvedValue([]);

            const data = {
                issue: { ...mockIssue, assignee: mockAssignee },
                onIssueClick: mockOnIssueClick,
                onAssigneeChange: mockOnAssigneeChange,
                fetchUsers: mockFetchUsers,
            };

            render(<AssigneeColumn {...data} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Search users...')).toBeTruthy();
            });

            const searchInput = screen.getByPlaceholderText('Search users...');
            fireEvent.change(searchInput, { target: { value: 'NonExistentUser' } });

            jest.advanceTimersByTime(300);

            await waitFor(() => {
                expect(mockFetchUsers).toHaveBeenCalledWith('NonExistentUser');
            });

            await waitFor(() => {
                expect(screen.getByText('No users found')).toBeTruthy();
            });
        });

        it('shows "Type at least 2 characters" when search text is less than 2 characters', async () => {
            const data = {
                issue: { ...mockIssue, assignee: mockAssignee },
                onIssueClick: mockOnIssueClick,
                onAssigneeChange: mockOnAssigneeChange,
                fetchUsers: mockFetchUsers,
            };

            render(<AssigneeColumn {...data} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Search users...')).toBeTruthy();
            });

            const searchInput = screen.getByPlaceholderText('Search users...');
            fireEvent.change(searchInput, { target: { value: 'J' } });

            jest.advanceTimersByTime(300);

            await waitFor(() => {
                expect(screen.getByText('Type at least 2 characters')).toBeTruthy();
            });

            expect(mockFetchUsers).not.toHaveBeenCalled();
        });

        it('does not fetch users when query is less than 2 characters', async () => {
            const data = {
                issue: { ...mockIssue, assignee: mockAssignee },
                onIssueClick: mockOnIssueClick,
                onAssigneeChange: mockOnAssigneeChange,
                fetchUsers: mockFetchUsers,
            };

            render(<AssigneeColumn {...data} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Search users...')).toBeTruthy();
            });

            const searchInput = screen.getByPlaceholderText('Search users...');
            fireEvent.change(searchInput, { target: { value: 'J' } });

            jest.advanceTimersByTime(300);

            expect(mockFetchUsers).not.toHaveBeenCalled();
        });

        it('shows loading spinner while fetching users', async () => {
            let resolveUsers: (value: User[]) => void;
            const userPromise = new Promise<User[]>((resolve) => {
                resolveUsers = resolve;
            });
            mockFetchUsers.mockReturnValue(userPromise);

            const data = {
                issue: { ...mockIssue, assignee: mockAssignee },
                onIssueClick: mockOnIssueClick,
                onAssigneeChange: mockOnAssigneeChange,
                fetchUsers: mockFetchUsers,
            };

            render(<AssigneeColumn {...data} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Search users...')).toBeTruthy();
            });

            const searchInput = screen.getByPlaceholderText('Search users...');
            fireEvent.change(searchInput, { target: { value: 'Jane' } });

            jest.advanceTimersByTime(300);

            await waitFor(() => {
                expect(mockFetchUsers).toHaveBeenCalled();
            });

            expect(mockFetchUsers).toHaveBeenCalledWith('Jane');

            resolveUsers!(mockUsers);

            await waitFor(() => {
                expect(screen.getByText('Jane Smith')).toBeTruthy();
            });
        });

        it('handles fetch errors gracefully', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            mockFetchUsers.mockRejectedValue(new Error('Network error'));

            const data = {
                issue: { ...mockIssue, assignee: mockAssignee },
                onIssueClick: mockOnIssueClick,
                onAssigneeChange: mockOnAssigneeChange,
                fetchUsers: mockFetchUsers,
            };

            render(<AssigneeColumn {...data} />);

            const button = screen.getByRole('button');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Search users...')).toBeTruthy();
            });

            const searchInput = screen.getByPlaceholderText('Search users...');
            fireEvent.change(searchInput, { target: { value: 'Jane' } });

            jest.advanceTimersByTime(300);

            await waitFor(() => {
                expect(mockFetchUsers).toHaveBeenCalled();
            });

            await waitFor(() => {
                expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch users:', expect.any(Error));
            });

            consoleErrorSpy.mockRestore();
        });
    });
});
