import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import React, { memo, useCallback, useEffect, useState } from 'react';

import { ConfigSection, ConfigSubSection } from '../../../lib/ipc/models/config';
import { StatusBar } from '../config/StatusBar';
import { CommonSubpanelProps } from './commonPanelProps';
import { PanelSubtitle } from './PanelSubtitle';
import { PanelTitle } from './PanelTitle';

type StatusBarPanelProps = CommonSubpanelProps & {
    configSection: ConfigSection;
    productName: string;
    enabled: boolean;
    showProduct: boolean;
    showUser: boolean;
    showLogin: boolean;
};

export const StatusBarPanel: React.FunctionComponent<StatusBarPanelProps> = memo(
    ({
        visible,
        expanded,
        onSubsectionChange,
        configSection,
        productName,
        enabled,
        showProduct,
        showUser,
        showLogin,
    }) => {
        const [internalExpanded, setInternalExpanded] = useState(expanded);

        const expansionHandler = useCallback(
            (event: React.ChangeEvent<{}>, expanded: boolean) => {
                setInternalExpanded(expanded);
                onSubsectionChange(ConfigSubSection.Status, expanded);
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
                    aria-controls={`${configSection}-${ConfigSubSection.Auth}-content`}
                    id={`${configSection}-${ConfigSubSection.Status}-header`}
                >
                    <PanelTitle>Status Bar</PanelTitle>
                    <PanelSubtitle>{`configure the status bar display for ${productName}`}</PanelSubtitle>
                </AccordionSummary>
                <AccordionDetails>
                    <StatusBar
                        configSection={configSection}
                        productName={productName}
                        enabled={enabled}
                        showProduct={showProduct}
                        showUser={showUser}
                        showLogin={showLogin}
                    />
                </AccordionDetails>
            </Accordion>
        );
    },
);
