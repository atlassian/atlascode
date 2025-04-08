import { ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import React, { memo, useCallback, useEffect, useState } from 'react';

import { Product } from '../../../../atlclients/authInfo';
import { ConfigSection, ConfigSubSection } from '../../../../lib/ipc/models/config';
import { SiteWithAuthInfo } from '../../../../lib/ipc/toUI/config';
import { CommonSubpanelProps } from '../../common/commonPanelProps';
import { PanelSubtitle } from '../../common/PanelSubtitle';
import { PanelTitle } from '../../common/PanelTitle';
import { SiteAuthenticator } from './SiteAuthenticator';

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
                    <PanelTitle>Authentication</PanelTitle>
                    <PanelSubtitle>authenticate with {product.name} instances</PanelSubtitle>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                    <SiteAuthenticator product={product} isRemote={isRemote} sites={sites} />
                </ExpansionPanelDetails>
            </ExpansionPanel>
        );
    },
);
