import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import equal from 'fast-deep-equal/es6';
import React, { memo, useCallback, useEffect, useState } from 'react';

import { DetailedSiteInfo } from '../../../../../../atlclients/authInfo';
import { JQLEntry } from '../../../../../../config/model';
import { ConfigSection, ConfigV3SubSection } from '../../../../../../lib/ipc/models/config';
import { CommonSubpanelV3Props } from '../../../../common/commonPanelProps';
import { PanelSubtitle } from '../../../../common/PanelSubtitle';
import { PanelTitle } from '../../../../common/PanelTitle';
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
            <Accordion hidden={!visible} square={false} expanded={internalExpanded} onChange={expansionHandler}>
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls={`${ConfigSection.Jira}-${ConfigV3SubSection.Issues}-content`}
                    id={`${ConfigSection.Jira}-${ConfigV3SubSection.Issues}-header`}
                >
                    <PanelTitle>Filters and Custom JQL</PanelTitle>
                    <PanelSubtitle>configure custom JQL and filters</PanelSubtitle>
                </AccordionSummary>
                <AccordionDetails>
                    <JiraExplorer sites={internalSites} jqlList={internalJql} enabled={enabled} />
                </AccordionDetails>
            </Accordion>
        );
    },
);
