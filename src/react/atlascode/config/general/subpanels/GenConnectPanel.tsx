import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import React, { memo, useCallback, useEffect, useState } from 'react';

import { ConfigSection, ConfigSubSection } from '../../../../../lib/ipc/models/config';
import { CommonSubpanelProps } from '../../../common/commonPanelProps';
import { PanelSubtitle } from '../../../common/PanelSubtitle';
import { PanelTitle } from '../../../common/PanelTitle';
import { Connectivity } from '../Connectivity';

type GenConnectPanelProps = CommonSubpanelProps & {
    enableHttpsTunnel: boolean;
};

export const GenConnectPanel: React.FunctionComponent<GenConnectPanelProps> = memo(
    ({ visible, expanded, onSubsectionChange, enableHttpsTunnel }) => {
        const [internalExpanded, setInternalExpanded] = useState(expanded);

        const expansionHandler = useCallback(
            (event: React.ChangeEvent<{}>, expanded: boolean) => {
                setInternalExpanded(expanded);
                onSubsectionChange(ConfigSubSection.Connectivity, expanded);
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
                    aria-controls={`${ConfigSection.General}-${ConfigSubSection.Connectivity}-content`}
                    id={`${ConfigSection.General}-${ConfigSubSection.Connectivity}-header`}
                >
                    <PanelTitle>Connectivity</PanelTitle>
                    <PanelSubtitle>configure general connectivity settings</PanelSubtitle>
                </AccordionSummary>
                <AccordionDetails>
                    <Connectivity enableHttpsTunnel={enableHttpsTunnel} />
                </AccordionDetails>
            </Accordion>
        );
    },
);
