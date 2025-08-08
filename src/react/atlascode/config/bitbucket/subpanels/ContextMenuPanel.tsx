import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import React, { memo, useCallback, useEffect, useState } from 'react';

import { ConfigSection, ConfigSubSection } from '../../../../../lib/ipc/models/config';
import { CommonSubpanelProps } from '../../../common/commonPanelProps';
import { PanelSubtitle } from '../../../common/PanelSubtitle';
import { PanelTitle } from '../../../common/PanelTitle';
import { ContextMenus } from '../ContextMenus';

type ContextMenuPanelProps = CommonSubpanelProps & {
    enabled: boolean;
};

export const ContextMenuPanel: React.FunctionComponent<ContextMenuPanelProps> = memo(
    ({ visible, expanded, onSubsectionChange, enabled }) => {
        const [internalExpanded, setInternalExpanded] = useState(expanded);

        const expansionHandler = useCallback(
            (event: React.ChangeEvent<{}>, expanded: boolean) => {
                setInternalExpanded(expanded);
                onSubsectionChange(ConfigSubSection.ContextMenus, expanded);
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
                    aria-controls={`${ConfigSection.Bitbucket}-${ConfigSubSection.ContextMenus}-content`}
                    id={`${ConfigSection.Bitbucket}-${ConfigSubSection.ContextMenus}-header`}
                >
                    <PanelTitle>Bitbucket Context Menus</PanelTitle>
                    <PanelSubtitle>configure the context menus in editor</PanelSubtitle>
                </AccordionSummary>
                <AccordionDetails>
                    <ContextMenus enabled={enabled} />
                </AccordionDetails>
            </Accordion>
        );
    },
);
