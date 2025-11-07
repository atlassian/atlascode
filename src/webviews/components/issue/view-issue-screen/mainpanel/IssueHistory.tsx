import Avatar from '@atlaskit/avatar';
import { format, parseISO } from 'date-fns';
import * as React from 'react';

import { IssueHistoryItem } from '../../../../../ipc/issueMessaging';
import { HistoryItemChange } from './HistoryItemChange';

interface IssueHistoryProps {
    history: IssueHistoryItem[];
    historyLoading: boolean;
}

const formatTimestamp = (timestamp: string): string => {
    try {
        const date = parseISO(timestamp);
        return format(date, "d MMMM yyyy 'at' HH:mm");
    } catch {
        return timestamp;
    }
};

const formatDuration = (seconds: number): string => {
    if (seconds === 0) {
        return '0m';
    }

    const weeks = Math.floor(seconds / (7 * 24 * 60 * 60));
    const days = Math.floor((seconds % (7 * 24 * 60 * 60)) / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);

    const parts: string[] = [];
    if (weeks > 0) {
        parts.push(`${weeks}w`);
    }
    if (days > 0) {
        parts.push(`${days}d`);
    }
    if (hours > 0) {
        parts.push(`${hours}h`);
    }
    if (minutes > 0) {
        parts.push(`${minutes}m`);
    }

    if (parts.length === 0) {
        return '0m';
    }

    return parts.join(' ');
};

const isTimeField = (field: string | undefined, fieldDisplayName: string): boolean => {
    if (!field && !fieldDisplayName) {
        return false;
    }

    const lowerField = (field || '').toLowerCase();
    const lowerDisplayName = fieldDisplayName.toLowerCase();

    const timeFields = [
        'timeestimate',
        'timespent',
        'remainingestimate',
        'originalestimate',
        'timetracking',
        'time estimate',
        'time spent',
        'remaining estimate',
        'original estimate',
        'worklog',
        'work log',
    ];

    return timeFields.some((tf) => lowerField.includes(tf) || lowerDisplayName.includes(tf));
};

const formatValue = (value: string | null | undefined, field?: string, fieldDisplayName?: string): string => {
    const isTime = isTimeField(field, fieldDisplayName || '');

    if (isTime && (value === null || value === undefined || value === '')) {
        return '0m';
    }

    if (value === null || value === undefined || value === '') {
        return 'None';
    }

    if (isTime) {
        const stringValue = String(value);
        const isAlreadyFormatted = /[a-zA-Z]/.test(stringValue);

        if (!isAlreadyFormatted) {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            if (!isNaN(numValue) && typeof numValue === 'number') {
                return formatDuration(numValue);
            }
        }
    }

    return value;
};

const getActionText = (fieldDisplayName: string, field?: string): string => {
    if (fieldDisplayName === '__CREATED__') {
        return 'created the Work item';
    }
    if (field === 'worklog' || fieldDisplayName.toLowerCase() === 'work log') {
        return 'logged time';
    }
    const lowerField = fieldDisplayName.toLowerCase();
    if (lowerField === 'status') {
        return 'changed the Status';
    } else if (lowerField === 'assignee') {
        return 'changed the Assignee';
    } else if (lowerField === 'priority') {
        return 'changed the Priority';
    } else if (lowerField === 'description') {
        return 'updated the Description';
    } else {
        return `updated the ${fieldDisplayName}`;
    }
};

export const IssueHistory: React.FC<IssueHistoryProps> = ({ history, historyLoading }) => {
    if (historyLoading) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <span>Loading history...</span>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--vscode-descriptionForeground)' }}>
                <span>No history available</span>
            </div>
        );
    }

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                padding: '16px 0',
            }}
            data-testid="issue-history.ui.feed-container"
        >
            {history.map((item) => (
                <div
                    key={item.id}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        paddingBottom: '16px',
                        borderBottom: '1px solid var(--vscode-panel-border)',
                    }}
                    data-testid="issue-history.ui.history-items.generic-history-item.history-item"
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Avatar src={item.author.avatarUrl} name={item.author.displayName} size="small" />
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.author.displayName}</div>
                            <div
                                style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', opacity: 0.7 }}
                            >
                                {getActionText(item.fieldDisplayName, item.field)} • {formatTimestamp(item.timestamp)}
                            </div>
                        </div>
                    </div>
                    <HistoryItemChange item={item} formatValue={formatValue} />
                </div>
            ))}
        </div>
    );
};
