import React, { memo, useCallback } from 'react';

import { User } from '../../../bitbucket/model';
import { BasicPanel } from '../common/BasicPanel';
import InlineRenderedTextEditor from './InlineRenderedTextEditor';

interface SummaryPanelProps {
    rawSummary: string;
    htmlSummary: string;
    fetchUsers: (input: string) => Promise<User[]>;
    summaryChange: (text: string) => void;
    isLoading: boolean;
    isDefaultExpanded?: boolean;
}

export const SummaryPanel: React.FC<SummaryPanelProps> = memo(
    ({ rawSummary, htmlSummary, fetchUsers, summaryChange, isLoading, isDefaultExpanded }) => {
        const handleFetchUsers = useCallback(
            async (input: string) => {
                return await fetchUsers(input);
            },
            [fetchUsers],
        );

        const handleSummaryChange = useCallback(
            (text: string) => {
                summaryChange(text);
            },
            [summaryChange],
        );

        return (
            <BasicPanel title="Summary" isLoading={isLoading} isDefaultExpanded={isDefaultExpanded}>
                <InlineRenderedTextEditor
                    rawContent={rawSummary}
                    htmlContent={htmlSummary}
                    onSave={handleSummaryChange}
                    fetchUsers={handleFetchUsers}
                />
            </BasicPanel>
        );
    },
);
