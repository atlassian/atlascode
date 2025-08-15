import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import React, { memo, useCallback, useEffect, useState } from 'react';

import { ConfigSection, ConfigSubSection } from '../../../../../lib/ipc/models/config';
import { CommonSubpanelProps } from '../../../common/commonPanelProps';
import { PanelSubtitle } from '../../../common/PanelSubtitle';
import { PanelTitle } from '../../../common/PanelTitle';
import { Debug } from '../Debug';

type GenDebugPanelProps = CommonSubpanelProps & {
    enableCurl: boolean;
    enableCharles: boolean;
    charlesCertPath: string;
    charlesDebugOnly: boolean;
    showCreateIssueProblems: boolean;
};

export const GenDebugPanel: React.FunctionComponent<GenDebugPanelProps> = memo(
    ({
        visible,
        expanded,
        onSubsectionChange,
        enableCurl,
        enableCharles,
        charlesCertPath,
        charlesDebugOnly,
        showCreateIssueProblems,
    }) => {
        const [internalExpanded, setInternalExpanded] = useState(expanded);

        const expansionHandler = useCallback(
            (event: React.ChangeEvent<{}>, expanded: boolean) => {
                setInternalExpanded(expanded);
                onSubsectionChange(ConfigSubSection.Debug, expanded);
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
                    aria-controls={`${ConfigSection.General}-${ConfigSubSection.Debug}-content`}
                    id={`${ConfigSection.General}-${ConfigSubSection.Debug}-header`}
                >
                    <PanelTitle>Debugging</PanelTitle>
                    <PanelSubtitle>configure debugging tools</PanelSubtitle>
                </AccordionSummary>
                <AccordionDetails>
                    <Debug
                        enableCurl={enableCurl}
                        enableCharles={enableCharles}
                        charlesCertPath={charlesCertPath}
                        charlesDebugOnly={charlesDebugOnly}
                        showCreateIssueProblems={showCreateIssueProblems}
                    />
                </AccordionDetails>
            </Accordion>
        );
    },
);
