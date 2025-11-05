import '@testing-library/dom';

import { render, screen } from '@testing-library/react';
import React from 'react';
import { DetailedSiteInfo, Product } from 'src/atlclients/authInfo';
import { IssueHistoryItem } from 'src/ipc/issueMessaging';
import { disableConsole } from 'testsutil/console';

import { IssueHistory } from './IssueHistory';

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

describe('IssueHistory', () => {
    beforeAll(() => {
        disableConsole('warn', 'error');
    });

    it('renders loading state', () => {
        render(<IssueHistory history={[]} historyLoading={true} siteDetails={mockSiteDetails} />);
        expect(screen.getByText('Loading history...')).toBeTruthy();
    });

    it('renders empty state when no history', () => {
        render(<IssueHistory history={[]} historyLoading={false} siteDetails={mockSiteDetails} />);
        expect(screen.getByText('No history available')).toBeTruthy();
    });

    it('renders work item created event', () => {
        const history: IssueHistoryItem[] = [
            {
                id: '__CREATED__',
                timestamp: '2025-11-05T15:58:00.000Z',
                author: {
                    displayName: 'John Doe',
                    accountId: 'user-1',
                    avatarUrl: 'https://example.com/avatar.png',
                },
                field: '__CREATED__',
                fieldDisplayName: '__CREATED__',
            } as IssueHistoryItem,
        ];

        render(<IssueHistory history={history} historyLoading={false} siteDetails={mockSiteDetails} />);
        expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
        expect(screen.getByText(/created the Work item/)).toBeTruthy();
    });

    it('renders regular field change', () => {
        const history: IssueHistoryItem[] = [
            {
                id: '123-status',
                timestamp: '2025-11-05T15:58:00.000Z',
                author: {
                    displayName: 'John Doe',
                    accountId: 'user-1',
                },
                field: 'status',
                fieldDisplayName: 'Status',
                from: 'To Do',
                to: 'In Progress',
                fromString: 'To Do',
                toString: 'In Progress',
            } as IssueHistoryItem,
        ];

        render(<IssueHistory history={history} historyLoading={false} siteDetails={mockSiteDetails} />);
        expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
        expect(screen.getByText(/changed the Status/)).toBeTruthy();
        expect(screen.getByText('To Do')).toBeTruthy();
        expect(screen.getByText('In Progress')).toBeTruthy();
    });

    it('renders worklog entry', () => {
        const history: any[] = [
            {
                id: 'worklog-123',
                timestamp: '2025-11-05T15:58:00.000Z',
                author: {
                    displayName: 'John Doe',
                    accountId: 'user-1',
                },
                field: 'worklog',
                fieldDisplayName: 'Work Log',
                worklogTimeSpent: '1h',
                worklogComment: 'Test comment',
            },
        ];

        render(<IssueHistory history={history} historyLoading={false} siteDetails={mockSiteDetails} />);
        expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
        expect(screen.getByText(/logged time/)).toBeTruthy();
        expect(screen.getByText(/Time logged:/)).toBeTruthy();
        expect(screen.getByText(/1h/)).toBeTruthy();
        expect(screen.getByText('Test comment')).toBeTruthy();
    });

    it('formats time fields with "0m" instead of "None"', () => {
        const history: IssueHistoryItem[] = [
            {
                id: '123-timespent',
                timestamp: '2025-11-05T15:58:00.000Z',
                author: {
                    displayName: 'John Doe',
                    accountId: 'user-1',
                },
                field: 'timespent',
                fieldDisplayName: 'Time Spent',
                from: null,
                to: '1h',
                fromString: undefined,
                toString: '1h',
            } as IssueHistoryItem,
        ];

        render(<IssueHistory history={history} historyLoading={false} siteDetails={mockSiteDetails} />);
        expect(screen.getByText('0m')).toBeTruthy();
        expect(screen.getByText('1h')).toBeTruthy();
        expect(screen.queryByText('None')).toBeNull();
    });

    it('formats time estimate with "0m" instead of "None"', () => {
        const history: IssueHistoryItem[] = [
            {
                id: '123-timeestimate',
                timestamp: '2025-11-05T15:58:00.000Z',
                author: {
                    displayName: 'John Doe',
                    accountId: 'user-1',
                },
                field: 'timeestimate',
                fieldDisplayName: 'Remaining Estimate',
                from: null,
                to: '0m',
                fromString: undefined,
                toString: '0m',
            } as IssueHistoryItem,
        ];

        render(<IssueHistory history={history} historyLoading={false} siteDetails={mockSiteDetails} />);
        const zeroMValues = screen.getAllByText('0m');
        expect(zeroMValues.length).toBeGreaterThan(0);
        expect(screen.queryByText('None')).toBeNull();
    });

    it('formats seconds to duration format for time fields', () => {
        const history: IssueHistoryItem[] = [
            {
                id: '123-timespent',
                timestamp: '2025-11-05T15:58:00.000Z',
                author: {
                    displayName: 'John Doe',
                    accountId: 'user-1',
                },
                field: 'timespent',
                fieldDisplayName: 'Time Spent',
                from: '3600',
                to: '7200',
                fromString: '3600',
                toString: '7200',
            } as IssueHistoryItem,
        ];

        render(<IssueHistory history={history} historyLoading={false} siteDetails={mockSiteDetails} />);
        expect(screen.getByText('1h')).toBeTruthy();
        expect(screen.getByText('2h')).toBeTruthy();
    });

    it('displays non-time field null values as "None"', () => {
        const history: IssueHistoryItem[] = [
            {
                id: '123-assignee',
                timestamp: '2025-11-05T15:58:00.000Z',
                author: {
                    displayName: 'John Doe',
                    accountId: 'user-1',
                },
                field: 'assignee',
                fieldDisplayName: 'Assignee',
                from: null,
                to: 'Jane Doe',
                fromString: undefined,
                toString: 'Jane Doe',
            } as IssueHistoryItem,
        ];

        render(<IssueHistory history={history} historyLoading={false} siteDetails={mockSiteDetails} />);
        expect(screen.getByText('None')).toBeTruthy();
        expect(screen.getByText('Jane Doe')).toBeTruthy();
    });

    it('renders multiple history items in chronological order', () => {
        const history: IssueHistoryItem[] = [
            {
                id: '1-status',
                timestamp: '2025-11-05T15:00:00.000Z',
                author: {
                    displayName: 'John Doe',
                    accountId: 'user-1',
                },
                field: 'status',
                fieldDisplayName: 'Status',
                from: 'To Do',
                to: 'In Progress',
                fromString: 'To Do',
                toString: 'In Progress',
            } as IssueHistoryItem,
            {
                id: '2-assignee',
                timestamp: '2025-11-05T15:30:00.000Z',
                author: {
                    displayName: 'Jane Smith',
                    accountId: 'user-2',
                },
                field: 'assignee',
                fieldDisplayName: 'Assignee',
                from: null,
                to: 'Jane Smith',
                fromString: undefined,
                toString: 'Jane Smith',
            } as IssueHistoryItem,
        ];

        render(<IssueHistory history={history} historyLoading={false} siteDetails={mockSiteDetails} />);
        expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);
        expect(screen.getAllByText(/changed the Status/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/changed the Assignee/).length).toBeGreaterThan(0);
    });

    it('formats timestamp correctly', () => {
        const history: IssueHistoryItem[] = [
            {
                id: '123-status',
                timestamp: '2025-11-05T15:58:00.000Z',
                author: {
                    displayName: 'John Doe',
                    accountId: 'user-1',
                },
                field: 'status',
                fieldDisplayName: 'Status',
                from: 'To Do',
                to: 'In Progress',
                fromString: 'To Do',
                toString: 'In Progress',
            } as IssueHistoryItem,
        ];

        render(<IssueHistory history={history} historyLoading={false} siteDetails={mockSiteDetails} />);
        expect(screen.getByText(/5 November 2025 at/)).toBeTruthy();
    });

    it('handles worklog entry without comment', () => {
        const history: any[] = [
            {
                id: 'worklog-123',
                timestamp: '2025-11-05T15:58:00.000Z',
                author: {
                    displayName: 'John Doe',
                    accountId: 'user-1',
                },
                field: 'worklog',
                fieldDisplayName: 'Work Log',
                worklogTimeSpent: '1h',
            },
        ];

        render(<IssueHistory history={history} historyLoading={false} siteDetails={mockSiteDetails} />);
        expect(screen.getByText(/Time logged:/)).toBeTruthy();
        expect(screen.getByText(/1h/)).toBeTruthy();
        expect(screen.queryByText(/Test comment/)).toBeNull();
    });

    it('handles worklog entry without time spent', () => {
        const history: any[] = [
            {
                id: 'worklog-123',
                timestamp: '2025-11-05T15:58:00.000Z',
                author: {
                    displayName: 'John Doe',
                    accountId: 'user-1',
                },
                field: 'worklog',
                fieldDisplayName: 'Work Log',
                worklogComment: 'Test comment',
            },
        ];

        render(<IssueHistory history={history} historyLoading={false} siteDetails={mockSiteDetails} />);
        expect(screen.getByText(/logged time/)).toBeTruthy();
        expect(screen.queryByText(/Time logged:/)).toBeNull();
    });

    it('displays proper action text for different field types', () => {
        const history: IssueHistoryItem[] = [
            {
                id: '1-status',
                timestamp: '2025-11-05T15:58:00.000Z',
                author: { displayName: 'John Doe', accountId: 'user-1' },
                field: 'status',
                fieldDisplayName: 'Status',
                from: 'A',
                to: 'B',
                fromString: 'A',
                toString: 'B',
            } as IssueHistoryItem,
            {
                id: '2-assignee',
                timestamp: '2025-11-05T15:58:00.000Z',
                author: { displayName: 'John Doe', accountId: 'user-1' },
                field: 'assignee',
                fieldDisplayName: 'Assignee',
                from: 'A',
                to: 'B',
                fromString: 'A',
                toString: 'B',
            } as IssueHistoryItem,
            {
                id: '3-priority',
                timestamp: '2025-11-05T15:58:00.000Z',
                author: { displayName: 'John Doe', accountId: 'user-1' },
                field: 'priority',
                fieldDisplayName: 'Priority',
                from: 'A',
                to: 'B',
                fromString: 'A',
                toString: 'B',
            } as IssueHistoryItem,
            {
                id: '4-description',
                timestamp: '2025-11-05T15:58:00.000Z',
                author: { displayName: 'John Doe', accountId: 'user-1' },
                field: 'description',
                fieldDisplayName: 'Description',
                from: 'A',
                to: 'B',
                fromString: 'A',
                toString: 'B',
            } as IssueHistoryItem,
        ];

        render(<IssueHistory history={history} historyLoading={false} siteDetails={mockSiteDetails} />);
        expect(screen.getByText(/changed the Status/)).toBeTruthy();
        expect(screen.getByText(/changed the Assignee/)).toBeTruthy();
        expect(screen.getByText(/changed the Priority/)).toBeTruthy();
        expect(screen.getByText(/updated the Description/)).toBeTruthy();
    });
});
