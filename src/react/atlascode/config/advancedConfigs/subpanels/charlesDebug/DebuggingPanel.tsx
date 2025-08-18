import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { ConfigV3SubSection } from 'src/lib/ipc/models/config';
import { CommonSubpanelV3Props } from 'src/react/atlascode/common/commonPanelProps';
import { PanelSubtitle } from 'src/react/atlascode/common/PanelSubtitle';
import { PanelTitle } from 'src/react/atlascode/common/PanelTitle';

import { Debug } from './Debug';

type DebuggingPanelProps = CommonSubpanelV3Props & {
    enableCharles: boolean;
    charlesCertPath: string;
    charlesDebugOnly: boolean;
};

export const DebuggingPanel: React.FunctionComponent<DebuggingPanelProps> = memo(
    ({ visible, expanded, onSubsectionChange, enableCharles, charlesCertPath, charlesDebugOnly }) => {
        const [internalExpanded, setInternalExpanded] = useState(expanded);

        const expansionHandler = useCallback(
            (event: React.ChangeEvent<{}>, expanded: boolean) => {
                setInternalExpanded(expanded);
                onSubsectionChange(ConfigV3SubSection.Debug, expanded);
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
                    aria-controls={`charles-${ConfigV3SubSection.Debug}-content`}
                    id={`charles-${ConfigV3SubSection.Debug}-header`}
                >
                    <PanelTitle>Debugging with Charles Web Proxy</PanelTitle>
                    <PanelSubtitle>configure debugging tools</PanelSubtitle>
                </AccordionSummary>
                <AccordionDetails>
                    <Debug
                        enableCharles={enableCharles}
                        charlesCertPath={charlesCertPath}
                        charlesDebugOnly={charlesDebugOnly}
                    />
                </AccordionDetails>
            </Accordion>
        );
    },
);
