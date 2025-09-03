/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import * as React from 'react';

import { DetailedSiteInfo, ProductJira } from '../../../atlclients/authInfo';
import { LinkedIssues } from './LinkedIssues';

jest.mock('../colors', () => ({
    colorToLozengeAppearanceMap: {
        'blue-gray': 'default',
        blue: 'inprogress',
        green: 'success',
        yellow: 'inprogress',
        red: 'removed',
    },
}));

describe('LinkedIssues', () => {
    const mockOnIssueClick = jest.fn();
    const mockOnDelete = jest.fn();
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

    const mockLinkedIssue = {
        id: 'link-1',
        type: {
            id: 'type-1',
            name: 'Blocks',
            inward: 'is blocked by',
            outward: 'blocks',
        },
        outwardIssue: {
            id: 'issue-1',
            self: 'https://test.atlassian.net/rest/api/2/issue/TEST-123',
            key: 'TEST-123',
            summary: 'Test linked issue',
            siteDetails: mockSiteDetails,
            issuetype: {
                id: '1',
                name: 'Task',
                iconUrl: 'task-icon.png',
                avatarId: 10001,
                description: 'A task to be completed',
                self: 'https://test.atlassian.net/rest/api/2/issuetype/1',
                subtask: false,
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
                id: '1',
                name: 'Medium',
                iconUrl: 'priority-icon.png',
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
                    name: 'Complete',
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
        },
        inwardIssue: undefined,
    };

    const defaultProps = {
        issuelinks: [mockLinkedIssue],
        onIssueClick: mockOnIssueClick,
        onDelete: mockOnDelete,
        onStatusChange: mockOnStatusChange,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders linked issues with status dropdown when onStatusChange is provided', async () => {
        await act(async () => {
            render(React.createElement(LinkedIssues, defaultProps));
        });

        expect(await screen.findByText('TEST-123')).toBeTruthy();
        expect(await screen.findByText('Test linked issue')).toBeTruthy();
        expect(await screen.findByText('To Do')).toBeTruthy();
    });

    it('shows status dropdown when clicking on status', async () => {
        await act(async () => {
            render(React.createElement(LinkedIssues, defaultProps));
        });

        const statusButton = await screen.findByRole('button', { name: /To Do/i });
        await act(async () => {
            fireEvent.click(statusButton);
        });

        expect(await screen.findByText('In Progress')).toBeTruthy();
        expect(await screen.findByText('Done')).toBeTruthy();
    });

    it('calls onStatusChange with custom transition names', async () => {
        const propsWithCustomStatus: React.ComponentProps<typeof LinkedIssues> = {
            ...defaultProps,
            issuelinks: [mockLinkedIssue],
        };

        await act(async () => {
            render(React.createElement(LinkedIssues, propsWithCustomStatus));
        });

        const statusButton = await screen.findByRole('button', { name: /To Do/i });
        await act(async () => {
            fireEvent.click(statusButton);
        });

        const inProgressOption = await screen.findByText('In Progress');
        await act(async () => {
            fireEvent.click(inProgressOption);
        });

        expect(mockOnStatusChange).toHaveBeenCalledWith('TEST-123', 'In Progress');
    });
});
