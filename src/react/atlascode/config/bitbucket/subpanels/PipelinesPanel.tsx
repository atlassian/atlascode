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
import { PipelinesExplorer } from '../pipelines/PipelinesExplorer';

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
            <Accordion hidden={!visible} square={false} expanded={internalExpanded} onChange={expansionHandler}>
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls={`${ConfigSection.Bitbucket}-${ConfigSubSection.Pipelines}-content`}
                    id={`${ConfigSection.Bitbucket}-${ConfigSubSection.Pipelines}-header`}
                >
                    <PanelTitle>Bitbucket Pipelines Explorer</PanelTitle>
                    <PanelSubtitle>configure the Bitbucket pipelines explorer and notifications</PanelSubtitle>
                </AccordionSummary>
                <AccordionDetails>
                    <PipelinesExplorer
                        filters={internalFilters}
                        enabled={enabled}
                        hideEmpty={hideEmpty}
                        hideFiltered={hideFiltered}
                        monitorEnabled={monitorEnabled}
                        refreshInterval={refreshInterval}
                    />
                </AccordionDetails>
            </Accordion>
        );
    },
);
