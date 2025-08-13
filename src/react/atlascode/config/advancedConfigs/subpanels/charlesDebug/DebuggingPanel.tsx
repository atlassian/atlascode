import { ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
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
            <ExpansionPanel hidden={!visible} square={false} expanded={internalExpanded} onChange={expansionHandler}>
                <ExpansionPanelSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls={`charles-${ConfigV3SubSection.Debug}-content`}
                    id={`charles-${ConfigV3SubSection.Debug}-header`}
                >
                    <PanelTitle>Debugging with Charles Web Proxy</PanelTitle>
                    <PanelSubtitle>configure debugging tools</PanelSubtitle>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                    <Debug
                        enableCharles={enableCharles}
                        charlesCertPath={charlesCertPath}
                        charlesDebugOnly={charlesDebugOnly}
                    />
                </ExpansionPanelDetails>
            </ExpansionPanel>
        );
    },
);
