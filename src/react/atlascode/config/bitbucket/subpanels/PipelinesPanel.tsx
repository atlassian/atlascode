import { ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import equal from 'fast-deep-equal/es6';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { ConfigSection, ConfigSubSection } from '../../../../../lib/ipc/models/config';
import { CommonSubpanelProps } from '../../../common/commonPanelProps';
import { PanelSubtitle } from '../../../common/PanelSubtitle';
import { PanelTitle } from '../../../common/PanelTitle';
import { PipelinesExplorer } from '../pipelines/PipelinesExplorer';
import * as l10n from '@vscode/l10n';

type PipelinesPanelProps = CommonSubpanelProps & {
    enabled: boolean;
    monitorEnabled: boolean;
    hideEmpty: boolean;
    hideFiltered: boolean;
    refreshInterval: number;
    filters: string[];
};

export const PipelinesPanel: React.FunctionComponent<PipelinesPanelProps> = memo(
    ({
        visible,
        expanded,
        onSubsectionChange,
        enabled,
        hideEmpty,
        hideFiltered,
        monitorEnabled,
        refreshInterval,
        filters,
    }) => {
        const [internalExpanded, setInternalExpanded] = useState(expanded);
        const [internalFilters, setInternalFilters] = useState(filters);

        const expansionHandler = useCallback(
            (event: React.ChangeEvent<{}>, expanded: boolean) => {
                setInternalExpanded(expanded);
                onSubsectionChange(ConfigSubSection.Pipelines, expanded);
            },
            [onSubsectionChange],
        );

        useEffect(() => {
            setInternalFilters((oldFilters) => {
                if (!equal(oldFilters, filters)) {
                    return filters;
                }
                return oldFilters;
            });
        }, [filters]);

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
                    aria-controls={`${ConfigSection.Bitbucket}-${ConfigSubSection.Pipelines}-content`}
                    id={`${ConfigSection.Bitbucket}-${ConfigSubSection.Pipelines}-header`}
                >
                    <PanelTitle>{l10n.t('Bitbucket Pipelines Explorer')}</PanelTitle>
                    <PanelSubtitle>
                        {l10n.t('configure the Bitbucket pipelines explorer and notifications')}
                    </PanelSubtitle>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                    <PipelinesExplorer
                        filters={internalFilters}
                        enabled={enabled}
                        hideEmpty={hideEmpty}
                        hideFiltered={hideFiltered}
                        monitorEnabled={monitorEnabled}
                        refreshInterval={refreshInterval}
                    />
                </ExpansionPanelDetails>
            </ExpansionPanel>
        );
    },
);
