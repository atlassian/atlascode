import { ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import equal from 'fast-deep-equal/es6';
import React, { memo, useCallback, useEffect, useState } from 'react';

import { DetailedSiteInfo } from '../../../../../../../atlclients/authInfo';
import { JQLEntry } from '../../../../../../../config/model';
import { ConfigV3Section, ConfigV3SubSection } from '../../../../../../../lib/ipc/models/config';
import { CommonSubpanelV3Props } from '../../../../../common/commonPanelProps';
import { PanelSubtitle } from '../../../../../common/PanelSubtitle';
import { PanelTitle } from '../../../../../common/PanelTitle';
import { JiraExplorer } from './JiraExplorer';

type JiraExplorerJqlPanelProps = CommonSubpanelV3Props & {
    enabled: boolean;
    jqlList: JQLEntry[];
    sites: DetailedSiteInfo[];
};

export const JiraExplorerJqlPanel: React.FunctionComponent<JiraExplorerJqlPanelProps> = memo(
    ({ visible, expanded, onSubsectionChange, enabled, sites, jqlList }) => {
        const [internalExpanded, setInternalExpanded] = useState(expanded);
        const [internalSites, setInternalSites] = useState(sites);
        const [internalJql, setInternalJql] = useState(jqlList);

        const expansionHandler = useCallback(
            (event: React.ChangeEvent<{}>, expanded: boolean) => {
                setInternalExpanded(expanded);
                onSubsectionChange(ConfigV3SubSection.Issues, expanded);
            },
            [onSubsectionChange],
        );

        useEffect(() => {
            setInternalSites((oldSites) => {
                if (!equal(oldSites, sites)) {
                    return sites;
                }
                return oldSites;
            });
        }, [sites]);

        useEffect(() => {
            setInternalJql((oldJql) => {
                if (!equal(oldJql, jqlList)) {
                    return jqlList;
                }
                return oldJql;
            });
        }, [jqlList]);

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
                    aria-controls={`${ConfigV3Section.Jira}-${ConfigV3SubSection.Issues}-content`}
                    id={`${ConfigV3Section.Jira}-${ConfigV3SubSection.Issues}-header`}
                >
                    <PanelTitle>Jira Work Items Explorer</PanelTitle>
                    <PanelSubtitle>configure custom JQL and filters</PanelSubtitle>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                    <JiraExplorer sites={internalSites} jqlList={internalJql} enabled={enabled} />
                </ExpansionPanelDetails>
            </ExpansionPanel>
        );
    },
);
