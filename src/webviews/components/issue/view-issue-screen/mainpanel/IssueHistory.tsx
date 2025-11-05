import Avatar from '@atlaskit/avatar';
import { format, parseISO } from 'date-fns';
import * as React from 'react';

import { DetailedSiteInfo } from '../../../../../atlclients/authInfo';
import { IssueHistoryItem } from '../../../../../ipc/issueMessaging';

interface IssueHistoryProps {
    history: IssueHistoryItem[];
    historyLoading: boolean;
    siteDetails: DetailedSiteInfo;
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
    if (value === null || value === undefined || value === '') {
        return 'None';
    }

    if (isTimeField(field, fieldDisplayName || '')) {
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

export const IssueHistory: React.FC<IssueHistoryProps> = ({ history, historyLoading, siteDetails }) => {
    if (historyLoading) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <span>Loading history...</span>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b778c' }}>
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
                            <div style={{ fontSize: '12px', color: '--vscode-descriptionForeground', opacity: 0.7 }}>
                                {getActionText(item.fieldDisplayName, item.field)} • {formatTimestamp(item.timestamp)}
                            </div>
                        </div>
                    </div>
                    {item.fieldDisplayName !== '__CREATED__' &&
                        (item.field === 'worklog' ? (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    marginLeft: '32px',
                                    marginTop: '4px',
                                }}
                            >
                                {(item as any).worklogTimeSpent && (
                                    <div
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '3px',
                                            fontSize: '13px',
                                            color: '--vscode-descriptionForeground',
                                            display: 'inline-block',
                                            width: 'fit-content',
                                        }}
                                    >
                                        Time logged:{' '}
                                        {formatValue(
                                            (item as any).worklogTimeSpent || item.to,
                                            item.field,
                                            item.fieldDisplayName,
                                        )}
                                    </div>
                                )}
                                {(item as any).worklogComment && (
                                    <div
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '3px',
                                            fontSize: '13px',
                                            color: '--vscode-descriptionForeground',
                                            fontStyle: 'italic',
                                            marginTop: '4px',
                                        }}
                                    >
                                        {(item as any).worklogComment}
                                    </div>
                                )}
                            </div>
                        ) : (
                            (item.fromString !== undefined ||
                                item.toString !== undefined ||
                                item.from !== null ||
                                item.to !== null) && (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        marginLeft: '32px',
                                        marginTop: '4px',
                                    }}
                                >
                                    <span
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '3px',
                                            fontSize: '13px',
                                            color: '--vscode-descriptionForeground',
                                        }}
                                    >
                                        {formatValue(item.fromString || item.from, item.field, item.fieldDisplayName)}
                                    </span>
                                    <span style={{ color: '--vscode-descriptionForeground' }}>→</span>
                                    <span
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '3px',
                                            fontSize: '13px',
                                            color: '--vscode-descriptionForeground',
                                        }}
                                    >
                                        {formatValue(item.toString || item.to, item.field, item.fieldDisplayName)}
                                    </span>
                                </div>
                            )
                        ))}
                </div>
            ))}
        </div>
    );
};
