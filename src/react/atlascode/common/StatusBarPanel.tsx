import { ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { ConfigSection, ConfigSubSection } from '../../../lib/ipc/models/config';
import { StatusBar } from '../config/StatusBar';
import { CommonSubpanelProps } from './commonPanelProps';
import { PanelSubtitle } from './PanelSubtitle';
import { PanelTitle } from './PanelTitle';
import * as l10n from '@vscode/l10n';

type StatusBarPanelProps = CommonSubpanelProps & {
    configSection: ConfigSection;
    productName: string;
    enabled: boolean;
    showProduct: boolean;
    showUser: boolean;
    showLogin: boolean;
};

export const StatusBarPanel: React.FunctionComponent<StatusBarPanelProps> = memo(
    ({
        visible,
        expanded,
        onSubsectionChange,
        configSection,
        productName,
        enabled,
        showProduct,
        showUser,
        showLogin,
    }) => {
        const [internalExpanded, setInternalExpanded] = useState(expanded);

        const expansionHandler = useCallback(
            (event: React.ChangeEvent<{}>, expanded: boolean) => {
                setInternalExpanded(expanded);
                onSubsectionChange(ConfigSubSection.Status, expanded);
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
                    aria-controls={`${configSection}-${ConfigSubSection.Auth}-content`}
                    id={`${configSection}-${ConfigSubSection.Status}-header`}
                >
                    <PanelTitle>Status Bar</PanelTitle>
                    <PanelSubtitle>{l10n.t('configure the status bar display for {0}', productName)}</PanelSubtitle>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                    <StatusBar
                        configSection={configSection}
                        productName={productName}
                        enabled={enabled}
                        showProduct={showProduct}
                        showUser={showUser}
                        showLogin={showLogin}
                    />
                </ExpansionPanelDetails>
            </ExpansionPanel>
        );
    },
);
