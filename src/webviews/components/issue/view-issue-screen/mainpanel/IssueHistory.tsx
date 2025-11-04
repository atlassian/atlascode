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

const formatValue = (value: string | null | undefined): string => {
    if (value === null || value === undefined || value === '') {
        return 'None';
    }
    return value;
};

const getActionText = (fieldDisplayName: string): string => {
    if (fieldDisplayName === '__CREATED__') {
        return 'created the Work item';
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
                                {getActionText(item.fieldDisplayName)} • {formatTimestamp(item.timestamp)}
                            </div>
                        </div>
                    </div>
                    {item.fieldDisplayName !== '__CREATED__' &&
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
                                    {formatValue(item.fromString || item.from)}
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
                                    {formatValue(item.toString || item.to)}
                                </span>
                            </div>
                        )}
                </div>
            ))}
        </div>
    );
};
