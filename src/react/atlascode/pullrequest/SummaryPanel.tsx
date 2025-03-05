import { ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary, CircularProgress } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import React, { memo, useCallback, useState } from 'react';
import { User } from '../../../bitbucket/model';
import { PanelTitle } from '../common/PanelTitle';
import InlineRenderedTextEditor from './InlineRenderedTextEditor';
type SummaryPanelProps = {
    rawSummary: string;
    htmlSummary: string;
    fetchUsers: (input: string) => Promise<User[]>;
    summaryChange: (text: string) => void;
    isLoading: boolean;
};

export const SummaryPanel: React.FunctionComponent<SummaryPanelProps> = memo(
    ({ rawSummary, htmlSummary, fetchUsers, summaryChange, isLoading }) => {
        const [internalExpanded, setInternalExpanded] = useState(true);

        const expansionHandler = useCallback((event: React.ChangeEvent<{}>, expanded: boolean) => {
            setInternalExpanded(expanded);
        }, []);

        const handleFetchUsers = useCallback(
            async (input: string) => {
                return await fetchUsers(input);
            },
            [fetchUsers],
        );

        const handleSummaryChange = useCallback(
            async (text: string) => {
                summaryChange(text);
            },
            [summaryChange],
        );

        return (
            <ExpansionPanel square={false} expanded={internalExpanded} onChange={expansionHandler}>
                <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                    <PanelTitle>Summary</PanelTitle>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                    {isLoading ? (
                        <CircularProgress />
                    ) : (
                        <InlineRenderedTextEditor
                            rawContent={rawSummary}
                            htmlContent={htmlSummary}
                            onSave={handleSummaryChange}
                            fetchUsers={handleFetchUsers}
                        />
                    )}
                </ExpansionPanelDetails>
            </ExpansionPanel>
        );
    },
);
