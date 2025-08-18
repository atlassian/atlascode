// import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import React, { memo } from 'react'; // , useCallback, useEffect, useState

import { Product } from '../../../../atlclients/authInfo';
import { ConfigV3Section, ConfigV3SubSection } from '../../../../lib/ipc/models/config';
import { SiteWithAuthInfo } from '../../../../lib/ipc/toUI/config';
import { PanelSubtitle } from '../../common/PanelSubtitle';
import { PanelTitle } from '../../common/PanelTitle';
import { SiteAuthenticator } from './../auth/SiteAuthenticator';

type AuthPanelProps = {
    isRemote: boolean;
    sites: SiteWithAuthInfo[];
    product: Product;
    section: ConfigV3Section;
};

export const AuthPanel: React.FunctionComponent<AuthPanelProps> = memo(({ isRemote, sites, product, section }) => {
    const currentAuthSubSection = product.key === 'jira' ? ConfigV3SubSection.JiraAuth : ConfigV3SubSection.BbAuth;

    return (
        <Accordion hidden={false} square={false} expanded={true}>
            <AccordionSummary
                aria-controls={`${section}-${currentAuthSubSection}-content`}
                id={`${section}-${currentAuthSubSection}-header`}
            >
                <PanelTitle>{product.name}</PanelTitle>
                <PanelSubtitle>authenticate with {product.name} instances</PanelSubtitle>
            </AccordionSummary>
            <AccordionDetails>
                <SiteAuthenticator product={product} isRemote={isRemote} sites={sites} />
            </AccordionDetails>
        </Accordion>
    );
});
