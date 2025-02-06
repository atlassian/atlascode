import { ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import equal from 'fast-deep-equal/es6';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { ConfigSection, ConfigSubSection } from '../../../../../lib/ipc/models/config';
import { CommonSubpanelProps } from '../../../common/commonPanelProps';
import { PanelSubtitle } from '../../../common/PanelSubtitle';
import { PanelTitle } from '../../../common/PanelTitle';
import { CreateTriggerEditor } from '../CreateTriggerEditor';
import * as l10n from '@vscode/l10n';

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
            <ExpansionPanel hidden={!visible} square={false} expanded={internalExpanded} onChange={expansionHandler}>
                <ExpansionPanelSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls={`${ConfigSection.Jira}-${ConfigSubSection.Triggers}-content`}
                    id={`${ConfigSection.Jira}-${ConfigSubSection.Triggers}-header`}
                >
                    <PanelTitle>{l10n.t('Create Jira Issue Triggers')}</PanelTitle>
                    <PanelSubtitle>{l10n.t('configure creation of Jira issues from TODOs and similar')}</PanelSubtitle>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                    <CreateTriggerEditor disabled={!enabled} triggers={internalList} />
                </ExpansionPanelDetails>
            </ExpansionPanel>
        );
    },
);
