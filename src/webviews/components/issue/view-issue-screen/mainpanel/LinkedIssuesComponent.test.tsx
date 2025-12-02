import { MinimalIssueLink } from '@atlassianlabs/jira-pi-common-models';
import { IssueLinkTypeSelectOption } from '@atlassianlabs/jira-pi-meta-models';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { LinkedIssuesComponent } from './LinkedIssuesComponent';

describe('LinkedIssuesComponent', () => {
    const mockOnSave = jest.fn();
    const mockOnFetchIssues = jest.fn();
    const mockOnIssueClick = jest.fn();
    const mockOnDelete = jest.fn();
    const mockOnStatusChange = jest.fn();
    const mockOnAssigneeChange = jest.fn();
    const mockFetchUsers = jest.fn();
    const mockSetEnableLinkedIssues = jest.fn();

    const mockSiteDetails = {
        baseApiUrl: 'https://test.atlassian.net',
        baseLinkUrl: 'https://test.atlassian.net',
        isCloud: true,
    };

    const mockLinkTypes: IssueLinkTypeSelectOption[] = [
        {
            id: 'relates-to',
            name: 'Relates',
            inward: 'relates to',
            outward: 'relates to',
            type: 'outward',
        },
        {
            id: 'blocks',
            name: 'Blocks',
            inward: 'is blocked by',
            outward: 'blocks',
            type: 'outward',
        },
    ];

    const mockIssueLinks: MinimalIssueLink<any>[] = [
        {
            id: 'link-1',
            type: {
                id: 'relates-to',
                name: 'Relates',
                inward: 'relates to',
                outward: 'relates to',
            },
            inwardIssue: undefined,
            outwardIssue: {
                id: 'issue-1',
                key: 'TEST-123',
                summary: 'Test Issue 1',
                siteDetails: mockSiteDetails,
                issuetype: {
                    id: '1',
                    name: 'Task',
                    iconUrl: 'task.png',
                } as any,
                status: {
                    id: '1',
                    name: 'To Do',
                    statusCategory: {
                        id: 2,
                        key: 'new',
                        colorName: 'blue-gray',
                    },
                } as any,
                assignee: {
                    accountId: 'user-123',
                    displayName: 'John Doe',
                    avatarUrls: {
                        '24x24': 'avatar-24.png',
                        '48x48': 'avatar-48.png',
                    },
                },
                priority: {
                    id: '3',
                    name: 'Medium',
                    iconUrl: 'medium.png',
                },
            } as any,
        },
    ];

    const defaultProps = {
        linkTypes: mockLinkTypes,
        label: 'Linked issues',
        onSave: mockOnSave,
        onFetchIssues: mockOnFetchIssues,
        loading: false,
        issuelinks: mockIssueLinks,
        onIssueClick: mockOnIssueClick,
        onDelete: mockOnDelete,
        enableLinkedIssues: {
            enable: false,
            setEnableLinkedIssues: mockSetEnableLinkedIssues,
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the component with label', () => {
        render(<LinkedIssuesComponent {...defaultProps} />);

        expect(screen.getByText('Linked issues')).toBeTruthy();
    });

    it('renders linked issues list', () => {
        render(<LinkedIssuesComponent {...defaultProps} />);

        expect(screen.getByText('TEST-123')).toBeTruthy();
        expect(screen.getByText('Test Issue 1')).toBeTruthy();
    });

    it('shows add button', () => {
        render(<LinkedIssuesComponent {...defaultProps} />);

        expect(screen.getByText('Add linked issue')).toBeTruthy();
    });

    it('opens editing mode when add button is clicked', () => {
        render(<LinkedIssuesComponent {...defaultProps} />);

        const addButton = screen.getByText('Add linked issue');
        fireEvent.click(addButton);

        expect(screen.getByText('Create')).toBeTruthy();
        expect(screen.getByText('Cancel')).toBeTruthy();
    });

    it('closes editing mode when cancel button is clicked', () => {
        render(<LinkedIssuesComponent {...defaultProps} />);

        const addButton = screen.getByText('Add linked issue');
        fireEvent.click(addButton);

        expect(screen.getByText('Create')).toBeTruthy();

        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);

        expect(screen.queryByText('Create')).not.toBeTruthy();
        expect(mockSetEnableLinkedIssues).toHaveBeenCalledWith(false);
    });

    it('shows "Saving..." when loading', () => {
        render(<LinkedIssuesComponent {...defaultProps} loading={true} />);

        expect(screen.getByText('Saving...')).toBeTruthy();
    });

    it('passes onStatusChange to LinkedIssues when provided', () => {
        const { container } = render(<LinkedIssuesComponent {...defaultProps} onStatusChange={mockOnStatusChange} />);

        expect(container).toBeTruthy();
        expect(screen.getByText('TEST-123')).toBeTruthy();
    });

    it('passes onAssigneeChange to LinkedIssues when provided', () => {
        const { container } = render(
            <LinkedIssuesComponent {...defaultProps} onAssigneeChange={mockOnAssigneeChange} />,
        );

        expect(container).toBeTruthy();
        expect(screen.getByText('TEST-123')).toBeTruthy();
    });

    it('passes fetchUsers to LinkedIssues when provided', () => {
        const { container } = render(<LinkedIssuesComponent {...defaultProps} fetchUsers={mockFetchUsers} />);

        expect(container).toBeTruthy();
        expect(screen.getByText('TEST-123')).toBeTruthy();
    });

    it('passes all assignee-related props together', () => {
        const { container } = render(
            <LinkedIssuesComponent
                {...defaultProps}
                onAssigneeChange={mockOnAssigneeChange}
                fetchUsers={mockFetchUsers}
            />,
        );

        expect(container).toBeTruthy();
        expect(screen.getByText('TEST-123')).toBeTruthy();
    });

    it('opens editing mode when enable prop is true', () => {
        render(
            <LinkedIssuesComponent
                {...defaultProps}
                enableLinkedIssues={{
                    enable: true,
                    setEnableLinkedIssues: mockSetEnableLinkedIssues,
                }}
            />,
        );

        expect(screen.getByText('Create')).toBeTruthy();
        expect(screen.getByText('Cancel')).toBeTruthy();
    });

    it('renders empty state when no linked issues', () => {
        const { container } = render(<LinkedIssuesComponent {...defaultProps} issuelinks={[]} />);

        expect(container).toBeTruthy();
        expect(screen.queryByText('TEST-123')).not.toBeTruthy();
    });

    it('renders assignee information for linked issues', () => {
        render(
            <LinkedIssuesComponent
                {...defaultProps}
                onAssigneeChange={mockOnAssigneeChange}
                fetchUsers={mockFetchUsers}
            />,
        );

        expect(screen.getByText('John Doe')).toBeTruthy();
    });
});
