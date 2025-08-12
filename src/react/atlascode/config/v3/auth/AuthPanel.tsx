import { ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import React, { memo, useCallback, useEffect, useState } from 'react';

import { Product } from '../../../../../atlclients/authInfo';
import { ConfigV3Section, ConfigV3SubSection } from '../../../../../lib/ipc/models/config';
import { SiteWithAuthInfo } from '../../../../../lib/ipc/toUI/config';
import { CommonSubpanelV3Props } from '../../../common/commonPanelProps';
import { PanelSubtitle } from '../../../common/PanelSubtitle';
import { PanelTitle } from '../../../common/PanelTitle';
import { SiteAuthenticator } from './SiteAuthenticator';

type AuthPanelProps = CommonSubpanelV3Props & {
    isRemote: boolean;
    sites: SiteWithAuthInfo[];
    product: Product;
    section: ConfigV3Section;
};

export const AuthPanel: React.FunctionComponent<AuthPanelProps> = memo(
    ({ visible, expanded, onSubsectionChange, isRemote, sites, product, section }) => {
        const [internalExpanded, setInternalExpanded] = useState(expanded);
        const currentAuthSubSection = product.key === 'jira' ? ConfigV3SubSection.JiraAuth : ConfigV3SubSection.BbAuth;

        const expansionHandler = useCallback(
            (event: React.ChangeEvent<{}>, expanded: boolean) => {
                setInternalExpanded(expanded);
                onSubsectionChange(currentAuthSubSection, expanded);
            },
            [onSubsectionChange, currentAuthSubSection],
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
                    aria-controls={`${section}-${currentAuthSubSection}-content`}
                    id={`${section}-${currentAuthSubSection}-header`}
                >
                    <PanelTitle>{product.name}</PanelTitle>
                    <PanelSubtitle>authenticate with {product.name} instances</PanelSubtitle>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                    <SiteAuthenticator product={product} isRemote={isRemote} sites={sites} />
                </ExpansionPanelDetails>
            </ExpansionPanel>
        );
    },
);
