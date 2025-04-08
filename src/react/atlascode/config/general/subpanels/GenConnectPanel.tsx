import { ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import React, { memo, useCallback, useEffect, useState } from 'react';

import { ConfigSection, ConfigSubSection } from '../../../../../lib/ipc/models/config';
import { CommonSubpanelProps } from '../../../common/commonPanelProps';
import { PanelSubtitle } from '../../../common/PanelSubtitle';
import { PanelTitle } from '../../../common/PanelTitle';
import { Connectivity } from '../Connectivity';

type GenConnectPanelProps = CommonSubpanelProps & {
    enableHttpsTunnel: boolean;
    offlineMode: boolean;
    onlineCheckerUrls: string[];
};

export const GenConnectPanel: React.FunctionComponent<GenConnectPanelProps> = memo(
    ({ visible, expanded, onSubsectionChange, enableHttpsTunnel, offlineMode, onlineCheckerUrls }) => {
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
            <ExpansionPanel hidden={!visible} square={false} expanded={internalExpanded} onChange={expansionHandler}>
                <ExpansionPanelSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls={`${ConfigSection.General}-${ConfigSubSection.Connectivity}-content`}
                    id={`${ConfigSection.General}-${ConfigSubSection.Connectivity}-header`}
                >
                    <PanelTitle>Connectivity</PanelTitle>
                    <PanelSubtitle>configure general connectivity settings</PanelSubtitle>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                    <Connectivity
                        enableHttpsTunnel={enableHttpsTunnel}
                        offlineMode={offlineMode}
                        onlineCheckerUrls={onlineCheckerUrls}
                    />
                </ExpansionPanelDetails>
            </ExpansionPanel>
        );
    },
);
