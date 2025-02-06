import { ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { ConfigSection, ConfigSubSection } from '../../../../../lib/ipc/models/config';
import { CommonSubpanelProps } from '../../../common/commonPanelProps';
import { PanelSubtitle } from '../../../common/PanelSubtitle';
import { PanelTitle } from '../../../common/PanelTitle';
import { BitbucketIssues } from '../BitbucketIssues';
import * as l10n from '@vscode/l10n';

type BitbucketIssuesPanelProps = CommonSubpanelProps & {
    enabled: boolean;
    notifications: boolean;
    jiraButton: boolean;
    refreshInterval: number;
};

export const BitbucketIssuesPanel: React.FunctionComponent<BitbucketIssuesPanelProps> = memo(
    ({ visible, expanded, onSubsectionChange, enabled, notifications, jiraButton, refreshInterval }) => {
        const [internalExpanded, setInternalExpanded] = useState(expanded);

        const expansionHandler = useCallback(
            (event: React.ChangeEvent<{}>, expanded: boolean) => {
                setInternalExpanded(expanded);
                onSubsectionChange(ConfigSubSection.Issues, expanded);
            },
            [onSubsectionChange],
        );

        useEffect(() => {
            setInternalExpanded((oldExpanded) => {
                if (oldExpanded !== expanded) {
                    return expanded;
                }
                return oldExpanded;
            });
        }, [expanded]);

        return (
            <ExpansionPanel hidden={!visible} square={false} expanded={internalExpanded} onChange={expansionHandler}>
                <ExpansionPanelSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls={`${ConfigSection.Bitbucket}-${ConfigSubSection.Issues}-content`}
                    id={`${ConfigSection.Bitbucket}-${ConfigSubSection.Issues}-header`}
                >
                    <PanelTitle>{l10n.t('Bitbucket Issues Explorer')}</PanelTitle>
                    <PanelSubtitle>{l10n.t('configure the Bitbucket issues explorer and notifications')}</PanelSubtitle>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                    <BitbucketIssues
                        enabled={enabled}
                        notifications={notifications}
                        jiraButton={jiraButton}
                        refreshInterval={refreshInterval}
                    />
                </ExpansionPanelDetails>
            </ExpansionPanel>
        );
    },
);
