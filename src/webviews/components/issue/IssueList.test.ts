/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import * as React from 'react';

import { DetailedSiteInfo, ProductJira } from '../../../atlclients/authInfo';
import IssueList from './IssueList';

jest.mock('../colors', () => ({
    colorToLozengeAppearanceMap: {
        'blue-gray': 'default',
        blue: 'inprogress',
        green: 'success',
        yellow: 'inprogress',
        red: 'removed',
    },
}));

describe('IssueList', () => {
    const mockOnIssueClick = jest.fn();
    const mockOnStatusChange = jest.fn();

    const mockSiteDetails: DetailedSiteInfo = {
        id: 'test-site',
        name: 'Test Site',
        host: 'test.atlassian.net',
        baseLinkUrl: 'https://test.atlassian.net',
        baseApiUrl: 'https://test.atlassian.net/rest',
        product: ProductJira,
        isCloud: true,
        userId: 'user123',
        avatarUrl: 'avatar.png',
        credentialId: 'test-credential',
    };

    const mockChildIssue = {
        id: 'child-issue-1',
        self: 'https://test.atlassian.net/rest/api/2/issue/CHILD-456',
        key: 'CHILD-456',
        summary: 'Test child issue',
        siteDetails: mockSiteDetails,
        issuetype: {
            id: '1',
            name: 'Subtask',
            iconUrl: 'subtask-icon.png',
            avatarId: 10001,
            description: 'A subtask of the issue',
            self: 'https://test.atlassian.net/rest/api/2/issuetype/1',
            subtask: true,
            epic: false,
        },
        status: {
            id: '1',
            name: 'To Do',
            description: 'This issue is in the To Do status',
            iconUrl: 'https://test.atlassian.net/status-icon.png',
            self: 'https://test.atlassian.net/rest/api/2/status/1',
            statusCategory: {
                id: 1,
                key: 'new',
                colorName: 'blue-gray',
                name: 'New',
                self: 'https://test.atlassian.net/rest/api/2/statuscategory/1',
            },
        },
        priority: {
            id: '2',
            name: 'High',
            iconUrl: 'high-priority-icon.png',
        },
        transitions: [
            {
                id: '2',
                name: 'Start Progress',
                to: {
                    id: '2',
                    name: 'In Progress',
                    statusCategory: {
                        id: 2,
                        key: 'indeterminate',
                        colorName: 'blue',
                        name: 'In Progress',
                        self: 'https://test.atlassian.net/rest/api/2/statuscategory/2',
                    },
                },
            },
            {
                id: '3',
                name: 'Resolve',
                to: {
                    id: '3',
                    name: 'Done',
                    statusCategory: {
                        id: 3,
                        key: 'done',
                        colorName: 'green',
                        name: 'Complete',
                        self: 'https://test.atlassian.net/rest/api/2/statuscategory/3',
                    },
                },
            },
        ],
    };

    const mockChildIssueWithCustomStatus = {
        ...mockChildIssue,
        id: 'child-issue-2',
        self: 'https://test.atlassian.net/rest/api/2/issue/CHILD-999',
        key: 'CHILD-999',
        summary: 'Issue in review',
        status: {
            id: '4',
            name: 'Code Review',
            description: 'This issue is in code review',
            iconUrl: 'https://test.atlassian.net/code-review-icon.png',
            self: 'https://test.atlassian.net/rest/api/2/status/4',
            statusCategory: {
                id: 2,
                key: 'indeterminate',
                colorName: 'yellow',
                name: 'In Progress',
                self: 'https://test.atlassian.net/rest/api/2/statuscategory/2',
            },
        },
        transitions: [
            {
                id: '5',
                name: 'Approve',
                to: {
                    id: '5',
                    name: 'QA Testing',
                    statusCategory: {
                        id: 2,
                        key: 'indeterminate',
                        colorName: 'blue',
                        name: 'In Progress',
                        self: 'https://test.atlassian.net/rest/api/2/statuscategory/2',
                    },
                },
            },
            {
                id: '6',
                name: 'Reject',
                to: {
                    id: 1,
                    name: 'To Do',
                    statusCategory: {
                        id: 1,
                        key: 'new',
                        colorName: 'blue-gray',
                        name: 'New',
                        self: 'https://test.atlassian.net/rest/api/2/statuscategory/1',
                    },
                },
            },
        ],
    };

    const defaultProps = {
        issues: [mockChildIssue],
        onIssueClick: mockOnIssueClick,
        onStatusChange: mockOnStatusChange,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders child issues with status dropdown when onStatusChange is provided', async () => {
        await act(async () => {
            render(React.createElement(IssueList, defaultProps));
        });

        expect(await screen.findByText('CHILD-456')).toBeTruthy();
        expect(await screen.findByText('Test child issue')).toBeTruthy();
        expect(await screen.findByText('To Do')).toBeTruthy();
    });

    it('shows status dropdown when clicking on status', async () => {
        await act(async () => {
            render(React.createElement(IssueList, defaultProps));
        });

        const statusButton = await screen.findByRole('button', { name: /To Do/i });
        await act(async () => {
            fireEvent.click(statusButton);
        });

        expect(await screen.findByText('In Progress')).toBeTruthy();
        expect(await screen.findByText('Done')).toBeTruthy();
    });

    it('calls onStatusChange when a transition is selected', async () => {
        await act(async () => {
            render(React.createElement(IssueList, defaultProps));
        });

        const statusButton = await screen.findByRole('button', { name: /To Do/i });
        await act(async () => {
            fireEvent.click(statusButton);
        });

        const inProgressOption = await screen.findByText('In Progress');
        await act(async () => {
            fireEvent.click(inProgressOption);
        });

        expect(mockOnStatusChange).toHaveBeenCalledWith('CHILD-456', 'In Progress');
    });

    it('handles custom statuses and transitions correctly', async () => {
        const propsWithCustomStatus: React.ComponentProps<typeof IssueList> = {
            ...defaultProps,
            issues: [mockChildIssueWithCustomStatus],
        };

        await act(async () => {
            render(React.createElement(IssueList, propsWithCustomStatus));
        });

        expect(await screen.findByText('Code Review')).toBeTruthy();

        const statusButton = await screen.findByRole('button', { name: /Code Review/i });
        await act(async () => {
            fireEvent.click(statusButton);
        });

        expect(await screen.findByText('QA Testing')).toBeTruthy();
        expect(await screen.findByText('To Do')).toBeTruthy();
    });

    it('calls onStatusChange with custom transition names', async () => {
        const propsWithCustomStatus: React.ComponentProps<typeof IssueList> = {
            ...defaultProps,
            issues: [mockChildIssueWithCustomStatus],
        };

        await act(async () => {
            render(React.createElement(IssueList, propsWithCustomStatus));
        });

        const statusButton = await screen.findByRole('button', { name: /Code Review/i });
        await act(async () => {
            fireEvent.click(statusButton);
        });

        const qaTestingOption = await screen.findByText('QA Testing');
        await act(async () => {
            fireEvent.click(qaTestingOption);
        });

        expect(mockOnStatusChange).toHaveBeenCalledWith('CHILD-999', 'QA Testing');
    });

    it('renders status without dropdown when onStatusChange is not provided', async () => {
        const propsWithoutStatusChange = {
            issues: [mockChildIssue],
            onIssueClick: mockOnIssueClick,
        };

        await act(async () => {
            render(React.createElement(IssueList, propsWithoutStatusChange));
        });

        expect(await screen.findByText('To Do')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /To Do/i })).toBeNull();
    });

    it('renders status as non-clickable lozenge when no valid transitions exist', async () => {
        const issueWithNoTransitions = {
            ...mockChildIssue,
            transitions: [
                {
                    id: '1',
                    name: 'Stay in To Do',
                    to: {
                        id: '1',
                        name: 'To Do',
                        statusCategory: {
                            id: 1,
                            key: 'new',
                            colorName: 'blue-gray',
                            name: 'New',
                            self: 'https://test.atlassian.net/rest/api/2/statuscategory/1',
                        },
                    },
                },
            ],
        };

        const propsWithNoValidTransitions = {
            ...defaultProps,
            issues: [issueWithNoTransitions],
        };

        await act(async () => {
            render(React.createElement(IssueList, propsWithNoValidTransitions));
        });

        expect(await screen.findByText('To Do')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /To Do/i })).toBeNull();
    });

    it('renders priority with tooltip when priority exists', async () => {
        await act(async () => {
            render(React.createElement(IssueList, defaultProps));
        });

        const priorityImage = await screen.findByAltText('High');
        expect(priorityImage).toBeTruthy();
        expect(priorityImage.getAttribute('src')).toBe('high-priority-icon.png');
    });

    it('renders issue type with tooltip when issue type exists', async () => {
        await act(async () => {
            render(React.createElement(IssueList, defaultProps));
        });

        const issueTypeImage = await screen.findByAltText('Subtask');
        expect(issueTypeImage).toBeTruthy();
        expect(issueTypeImage.getAttribute('src')).toBe('subtask-icon.png');
    });

    it('renders multiple issues correctly', async () => {
        const multipleIssuesProps = {
            ...defaultProps,
            issues: [mockChildIssue, mockChildIssueWithCustomStatus],
        };

        await act(async () => {
            render(React.createElement(IssueList, multipleIssuesProps));
        });

        expect(await screen.findByText('CHILD-456')).toBeTruthy();
        expect(await screen.findByText('CHILD-999')).toBeTruthy();
        expect(await screen.findByText('Test child issue')).toBeTruthy();
        expect(await screen.findByText('Issue in review')).toBeTruthy();
        expect(await screen.findByText('To Do')).toBeTruthy();
        expect(await screen.findByText('Code Review')).toBeTruthy();
    });
});
