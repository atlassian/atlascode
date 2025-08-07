import { ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import React, { memo, useCallback, useEffect, useState } from 'react';

import { ConfigSection, ConfigSubSection } from '../../../../../lib/ipc/models/config';
import { CommonSubpanelProps } from '../../../common/commonPanelProps';
import { PanelSubtitle } from '../../../common/PanelSubtitle';
import { PanelTitle } from '../../../common/PanelTitle';
import { PRExplorer } from '../PRExplorer';

type PRExplorerPanelProps = CommonSubpanelProps & {
    enabled: boolean;
    relatedJiraIssues: boolean;
    pullRequestCreated: boolean;
    nestFiles: boolean;
    refreshInterval: number;
};

export const PRExplorerPanel: React.FunctionComponent<PRExplorerPanelProps> = memo(
    ({
        visible,
        expanded,
        onSubsectionChange,
        enabled,
        relatedJiraIssues,
        pullRequestCreated,
        nestFiles,
        refreshInterval,
    }) => {
        const [internalExpanded, setInternalExpanded] = useState(expanded);

        const expansionHandler = useCallback(
            (event: React.ChangeEvent<{}>, expanded: boolean) => {
                setInternalExpanded(expanded);
                onSubsectionChange(ConfigSubSection.PR, expanded);
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
                    aria-controls={`${ConfigSection.Bitbucket}-${ConfigSubSection.PR}-content`}
                    id={`${ConfigSection.Bitbucket}-${ConfigSubSection.PR}-header`}
                >
                    <PanelTitle>Pull Requests Explorer</PanelTitle>
                    <PanelSubtitle>configure the pull requests explorer and notifications</PanelSubtitle>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                    <PRExplorer
                        enabled={enabled}
                        relatedJiraIssues={relatedJiraIssues}
                        pullRequestCreated={pullRequestCreated}
                        nestFiles={nestFiles}
                        refreshInterval={refreshInterval}
                    />
                </ExpansionPanelDetails>
            </ExpansionPanel>
        );
    },
);
