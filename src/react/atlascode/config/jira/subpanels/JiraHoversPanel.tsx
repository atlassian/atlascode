import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import React, { memo, useCallback, useEffect, useState } from 'react';

import { ConfigSection, ConfigSubSection } from '../../../../../lib/ipc/models/config';
import { CommonSubpanelProps } from '../../../common/commonPanelProps';
import { PanelSubtitle } from '../../../common/PanelSubtitle';
import { PanelTitle } from '../../../common/PanelTitle';
import { IssueHovers } from '../IssueHovers';

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
            <Accordion hidden={!visible} square={false} expanded={internalExpanded} onChange={expansionHandler}>
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls={`${ConfigSection.Jira}-${ConfigSubSection.Hovers}-content`}
                    id={`${ConfigSection.Jira}-${ConfigSubSection.Hovers}-header`}
                >
                    <PanelTitle>Jira Issue Hovers</PanelTitle>
                    <PanelSubtitle>configure hovering for Jira issue keys</PanelSubtitle>
                </AccordionSummary>
                <AccordionDetails>
                    <IssueHovers enabled={enabled} />
                </AccordionDetails>
            </Accordion>
        );
    },
);
