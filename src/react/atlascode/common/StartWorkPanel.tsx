import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import React, { memo, useCallback, useEffect, useState } from 'react';

import { ConfigSection, ConfigSubSection } from '../../../lib/ipc/models/config';
import { StartWorkSettings } from '../config/StartWorkSettings';
import { CommonSubpanelProps } from './commonPanelProps';
import { PanelSubtitle } from './PanelSubtitle';
import { PanelTitle } from './PanelTitle';

type StartWorkPanelProps = CommonSubpanelProps & {
    customPrefixes: string[];
    customTemplate: string;
};

export const StartWorkPanel: React.FunctionComponent<StartWorkPanelProps> = memo(
    ({ visible, expanded, customPrefixes, customTemplate, onSubsectionChange }) => {
        const [internalExpanded, setInternalExpanded] = useState<boolean>(expanded);

        const expansionHandler = useCallback(
            (event: React.ChangeEvent<{}>, expanded: boolean) => {
                setInternalExpanded(expanded);
                onSubsectionChange(ConfigSubSection.StartWork, expanded);
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
                    aria-controls={`${ConfigSection.Jira}-${ConfigSubSection.StartWork}-content`}
                    id={`${ConfigSection.Jira}-${ConfigSubSection.StartWork}-header`}
                >
                    <PanelTitle>Start Work</PanelTitle>
                    <PanelSubtitle>configure the start work screen</PanelSubtitle>
                </AccordionSummary>
                <AccordionDetails>
                    <StartWorkSettings customPrefixes={customPrefixes} customTemplate={customTemplate} />
                </AccordionDetails>
            </Accordion>
        );
    },
);
