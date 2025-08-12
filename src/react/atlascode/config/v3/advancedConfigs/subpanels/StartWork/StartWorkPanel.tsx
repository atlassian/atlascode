import { ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { CommonSubpanelV3Props } from 'src/react/atlascode/common/commonPanelProps';
import { PanelSubtitle } from 'src/react/atlascode/common/PanelSubtitle';
import { PanelTitle } from 'src/react/atlascode/common/PanelTitle';

import { ConfigV3Section, ConfigV3SubSection } from '../../../../../../../lib/ipc/models/config';
import { StartWorkSettings } from './StartWorkSettings';

type StartWorkPanelProps = CommonSubpanelV3Props & {
    customPrefixes: string[];
    customTemplate: string;
};

export const StartWorkPanel: React.FunctionComponent<StartWorkPanelProps> = memo(
    ({ visible, expanded, customPrefixes, customTemplate, onSubsectionChange }) => {
        const [internalExpanded, setInternalExpanded] = useState<boolean>(expanded);

        const expansionHandler = useCallback(
            (event: React.ChangeEvent<{}>, expanded: boolean) => {
                setInternalExpanded(expanded);
                onSubsectionChange(ConfigV3SubSection.StartWork, expanded);
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
                    aria-controls={`${ConfigV3Section.Jira}-${ConfigV3SubSection.StartWork}-content`}
                    id={`${ConfigV3Section.Jira}-${ConfigV3SubSection.StartWork}-header`}
                >
                    <PanelTitle>Start Work</PanelTitle>
                    <PanelSubtitle>configure the start work screen</PanelSubtitle>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                    <StartWorkSettings customPrefixes={customPrefixes} customTemplate={customTemplate} />
                </ExpansionPanelDetails>
            </ExpansionPanel>
        );
    },
);
