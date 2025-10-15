import React, { memo, useCallback } from 'react';
import { AtlascodeMentionProvider } from 'src/webviews/components/issue/common/AtlaskitEditor/AtlascodeMentionsProvider';

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
    handleEditorFocus: (isFocused: boolean) => void;
    mentionsProvider?: AtlascodeMentionProvider;
}

export const SummaryPanel: React.FC<SummaryPanelProps> = memo(
    ({
        rawSummary,
        htmlSummary,
        fetchUsers,
        summaryChange,
        isLoading,
        isDefaultExpanded,
        handleEditorFocus,
        mentionsProvider,
    }) => {
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
            <BasicPanel
                title="Summary"
                isLoading={isLoading}
                isDefaultExpanded={isDefaultExpanded}
                dataTestId="pullrequest.summary-panel"
            >
                <InlineRenderedTextEditor
                    rawContent={rawSummary}
                    htmlContent={htmlSummary}
                    onSave={handleSummaryChange}
                    fetchUsers={handleFetchUsers}
                    handleEditorFocus={handleEditorFocus}
                    mentionsProvider={mentionsProvider}
                />
            </BasicPanel>
        );
    },
);
