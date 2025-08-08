import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import React, { memo, useCallback, useEffect, useState } from 'react';

import { ConfigSection, ConfigSubSection } from '../../../../../lib/ipc/models/config';
import { CommonSubpanelProps } from '../../../common/commonPanelProps';
import { PanelSubtitle } from '../../../common/PanelSubtitle';
import { PanelTitle } from '../../../common/PanelTitle';
import { Misc, OutputLevelOption } from '../Misc';

type GenMiscPanelProps = CommonSubpanelProps & {
    showWelcome: boolean;
    helpExplorerEnabled: boolean;
    outputLevel: OutputLevelOption;
};

export const GenMiscPanel: React.FunctionComponent<GenMiscPanelProps> = memo(
    ({ visible, expanded, onSubsectionChange, showWelcome, helpExplorerEnabled, outputLevel }) => {
        const [internalExpanded, setInternalExpanded] = useState(expanded);

        const expansionHandler = useCallback(
            (event: React.ChangeEvent<{}>, expanded: boolean) => {
                setInternalExpanded(expanded);
                onSubsectionChange(ConfigSubSection.Misc, expanded);
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
                    aria-controls={`${ConfigSection.General}-${ConfigSubSection.Misc}-content`}
                    id={`${ConfigSection.General}-${ConfigSubSection.Misc}-header`}
                >
                    <PanelTitle>Miscellaneous Settings</PanelTitle>
                    <PanelSubtitle>configure logging level, welcome screen, etc</PanelSubtitle>
                </AccordionSummary>
                <AccordionDetails>
                    <Misc
                        showWelcome={showWelcome}
                        helpExplorerEnabled={helpExplorerEnabled}
                        outputLevel={outputLevel}
                    />
                </AccordionDetails>
            </Accordion>
        );
    },
);
