import { ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
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
            <ExpansionPanel hidden={!visible} square={false} expanded={internalExpanded} onChange={expansionHandler}>
                <ExpansionPanelSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls={`${ConfigSection.General}-${ConfigSubSection.Misc}-content`}
                    id={`${ConfigSection.General}-${ConfigSubSection.Misc}-header`}
                >
                    <PanelTitle>Miscellaneous Settings</PanelTitle>
                    <PanelSubtitle>configure logging level, welcome screen, etc</PanelSubtitle>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                    <Misc
                        showWelcome={showWelcome}
                        helpExplorerEnabled={helpExplorerEnabled}
                        outputLevel={outputLevel}
                    />
                </ExpansionPanelDetails>
            </ExpansionPanel>
        );
    },
);
