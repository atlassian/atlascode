import * as React from 'react';

import { IssueHistoryItem } from '../../../../../ipc/issueMessaging';

interface HistoryItemChangeProps {
    item: IssueHistoryItem;
    formatValue: (value: string | null | undefined, field?: string, fieldDisplayName?: string) => string;
}

export const HistoryItemChange: React.FC<HistoryItemChangeProps> = ({ item, formatValue }) => {
    if (item.fieldDisplayName === '__CREATED__') {
        return null;
    }

    if (item.field === 'worklog') {
        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    marginLeft: '32px',
                    marginTop: '4px',
                }}
            >
                {item.worklogTimeSpent && (
                    <div
                        style={{
                            padding: '4px 8px',
                            borderRadius: '3px',
                            fontSize: '13px',
                            color: 'var(--vscode-descriptionForeground)',
                            display: 'inline-block',
                            width: 'fit-content',
                        }}
                    >
                        Time logged: {formatValue(item.worklogTimeSpent || item.to, item.field, item.fieldDisplayName)}
                    </div>
                )}
                {item.worklogComment && (
                    <div
                        style={{
                            padding: '4px 8px',
                            borderRadius: '3px',
                            fontSize: '13px',
                            color: 'var(--vscode-descriptionForeground)',
                            fontStyle: 'italic',
                            marginTop: '4px',
                        }}
                    >
                        {item.worklogComment}
                    </div>
                )}
            </div>
        );
    }

    if (item.fromString !== undefined || item.toString !== undefined || item.from !== null || item.to !== null) {
        return (
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
                        color: 'var(--vscode-descriptionForeground)',
                    }}
                >
                    {formatValue(item.fromString || item.from, item.field, item.fieldDisplayName)}
                </span>
                <span style={{ color: 'var(--vscode-descriptionForeground)' }}>→</span>
                <span
                    style={{
                        padding: '4px 8px',
                        borderRadius: '3px',
                        fontSize: '13px',
                        color: 'var(--vscode-descriptionForeground)',
                    }}
                >
                    {formatValue(item.toString || item.to, item.field, item.fieldDisplayName)}
                </span>
            </div>
        );
    }

    return null;
};
