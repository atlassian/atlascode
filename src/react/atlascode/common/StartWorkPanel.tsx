import { ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { ConfigSection, ConfigSubSection } from '../../../lib/ipc/models/config';
import { StartWorkSettings } from '../config/StartWorkSettings';
import { CommonSubpanelProps } from './commonPanelProps';
import { PanelSubtitle } from './PanelSubtitle';
import { PanelTitle } from './PanelTitle';
import * as l10n from '@vscode/l10n';

type StartWorkPanelProps = CommonSubpanelProps & {
    customPrefixes: string[];
    customTemplate: string;
};

export const StartWorkPanel: React.FunctionComponent<StartWorkPanelProps> = memo(
    ({ visible, expanded, customPrefixes, customTemplate, onSubsectionChange }) => {
        const [internalExpanded, setInternalExpanded] = useState<boolean>(expanded);

        const expansionHandler = useCallback(
            (event: React.ChangeEvent<{}>, expanded: boolean) => {
                setInternalExpanded(expanded);
                onSubsectionChange(ConfigSubSection.StartWork, expanded);
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
                    aria-controls={`${ConfigSection.Jira}-${ConfigSubSection.StartWork}-content`}
                    id={`${ConfigSection.Jira}-${ConfigSubSection.StartWork}-header`}
                >
                    <PanelTitle>{l10n.t('Start Work')}</PanelTitle>
                    <PanelSubtitle>{l10n.t('configure the start work screen')}</PanelSubtitle>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                    <StartWorkSettings customPrefixes={customPrefixes} customTemplate={customTemplate} />
                </ExpansionPanelDetails>
            </ExpansionPanel>
        );
    },
);
