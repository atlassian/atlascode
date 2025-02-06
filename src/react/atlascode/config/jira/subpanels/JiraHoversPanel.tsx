import { ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { ConfigSection, ConfigSubSection } from '../../../../../lib/ipc/models/config';
import { CommonSubpanelProps } from '../../../common/commonPanelProps';
import { PanelSubtitle } from '../../../common/PanelSubtitle';
import { PanelTitle } from '../../../common/PanelTitle';
import { IssueHovers } from '../IssueHovers';
import * as l10n from '@vscode/l10n';

type JiraHoversPanelProps = CommonSubpanelProps & {
    enabled: boolean;
};

export const JiraHoversPanel: React.FunctionComponent<JiraHoversPanelProps> = memo(
    ({ visible, expanded, onSubsectionChange, enabled }) => {
        const [internalExpanded, setInternalExpanded] = useState(expanded);

        const expansionHandler = useCallback(
            (event: React.ChangeEvent<{}>, expanded: boolean) => {
                setInternalExpanded(expanded);
                onSubsectionChange(ConfigSubSection.Hovers, expanded);
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
                    aria-controls={`${ConfigSection.Jira}-${ConfigSubSection.Hovers}-content`}
                    id={`${ConfigSection.Jira}-${ConfigSubSection.Hovers}-header`}
                >
                    <PanelTitle>{l10n.t('Jira Issue Hovers')}</PanelTitle>
                    <PanelSubtitle>{l10n.t('configure hovering for Jira issue keys')}</PanelSubtitle>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                    <IssueHovers enabled={enabled} />
                </ExpansionPanelDetails>
            </ExpansionPanel>
        );
    },
);
