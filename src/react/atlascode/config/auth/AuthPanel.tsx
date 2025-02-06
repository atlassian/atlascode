import { ConfigSection, ConfigSubSection } from '../../../../lib/ipc/models/config';
import { ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary } from '@material-ui/core';
import React, { memo, useCallback, useEffect, useState } from 'react';

import { CommonSubpanelProps } from '../../common/commonPanelProps';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { PanelSubtitle } from '../../common/PanelSubtitle';
import { PanelTitle } from '../../common/PanelTitle';
import { Product } from '../../../../atlclients/authInfo';
import { SiteAuthenticator } from './SiteAuthenticator';
import { SiteWithAuthInfo } from '../../../../lib/ipc/toUI/config';
import * as l10n from '@vscode/l10n';

type AuthPanelProps = CommonSubpanelProps & {
    isRemote: boolean;
    sites: SiteWithAuthInfo[];
    product: Product;
    section: ConfigSection;
};

export const AuthPanel: React.FunctionComponent<AuthPanelProps> = memo(
    ({ visible, expanded, onSubsectionChange, isRemote, sites, product, section }) => {
        const [internalExpanded, setInternalExpanded] = useState(expanded);

        const expansionHandler = useCallback(
            (event: React.ChangeEvent<{}>, expanded: boolean) => {
                setInternalExpanded(expanded);
                onSubsectionChange(ConfigSubSection.Auth, expanded);
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
                    aria-controls={`${section}-${ConfigSubSection.Auth}-content`}
                    id={`${section}-${ConfigSubSection.Auth}-header`}
                >
                    <PanelTitle>{l10n.t('Authentication')}</PanelTitle>
                    <PanelSubtitle>{l10n.t('authenticate with {0} instances', product.name)}</PanelSubtitle>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                    <SiteAuthenticator product={product} isRemote={isRemote} sites={sites} />
                </ExpansionPanelDetails>
            </ExpansionPanel>
        );
    },
);
