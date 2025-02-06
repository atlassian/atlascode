import { ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { ConfigSection, ConfigSubSection } from '../../../../../lib/ipc/models/config';
import { CommonSubpanelProps } from '../../../common/commonPanelProps';
import { PanelSubtitle } from '../../../common/PanelSubtitle';
import { PanelTitle } from '../../../common/PanelTitle';
import { ContextMenus } from '../ContextMenus';
import * as l10n from '@vscode/l10n';

type ContextMenuPanelProps = CommonSubpanelProps & {
    enabled: boolean;
};

export const ContextMenuPanel: React.FunctionComponent<ContextMenuPanelProps> = memo(
    ({ visible, expanded, onSubsectionChange, enabled }) => {
        const [internalExpanded, setInternalExpanded] = useState(expanded);

        const expansionHandler = useCallback(
            (event: React.ChangeEvent<{}>, expanded: boolean) => {
                setInternalExpanded(expanded);
                onSubsectionChange(ConfigSubSection.ContextMenus, expanded);
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
                    aria-controls={`${ConfigSection.Bitbucket}-${ConfigSubSection.ContextMenus}-content`}
                    id={`${ConfigSection.Bitbucket}-${ConfigSubSection.ContextMenus}-header`}
                >
                    <PanelTitle>{l10n.t('Bitbucket Context Menus')}</PanelTitle>
                    <PanelSubtitle>{l10n.t('configure the context menus in editor')}</PanelSubtitle>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                    <ContextMenus enabled={enabled} />
                </ExpansionPanelDetails>
            </ExpansionPanel>
        );
    },
);
