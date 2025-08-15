import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import equal from 'fast-deep-equal/es6';
import React, { memo, useCallback, useEffect, useState } from 'react';

import { ConfigSection, ConfigSubSection } from '../../../../../lib/ipc/models/config';
import { CommonSubpanelProps } from '../../../common/commonPanelProps';
import { PanelSubtitle } from '../../../common/PanelSubtitle';
import { PanelTitle } from '../../../common/PanelTitle';
import { CreateTriggerEditor } from '../CreateTriggerEditor';

type JiraTriggersPanelProps = CommonSubpanelProps & {
    enabled: boolean;
    triggers: string[];
};

export const JiraTriggersPanel: React.FunctionComponent<JiraTriggersPanelProps> = memo(
    ({ visible, expanded, onSubsectionChange, enabled, triggers }) => {
        const [internalExpanded, setInternalExpanded] = useState(expanded);
        const [internalList, setInternalList] = useState<string[]>(triggers);

        const expansionHandler = useCallback(
            (event: React.ChangeEvent<{}>, expanded: boolean) => {
                setInternalExpanded(expanded);
                onSubsectionChange(ConfigSubSection.Triggers, expanded);
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

        useEffect(() => {
            setInternalList((oldList) => {
                if (!equal(oldList, triggers)) {
                    return triggers;
                }

                return oldList;
            });
        }, [triggers]);

        return (
            <Accordion hidden={!visible} square={false} expanded={internalExpanded} onChange={expansionHandler}>
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls={`${ConfigSection.Jira}-${ConfigSubSection.Triggers}-content`}
                    id={`${ConfigSection.Jira}-${ConfigSubSection.Triggers}-header`}
                >
                    <PanelTitle>Create Jira Issue Triggers</PanelTitle>
                    <PanelSubtitle>configure creation of Jira issues from TODOs and similar</PanelSubtitle>
                </AccordionSummary>
                <AccordionDetails>
                    <CreateTriggerEditor disabled={!enabled} triggers={internalList} />
                </AccordionDetails>
            </Accordion>
        );
    },
);
