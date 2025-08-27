import { Theme } from '@mui/material';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import { makeStyles } from '@mui/styles';
import React, { memo } from 'react';

import { Product } from '../../../../atlclients/authInfo';
import { ConfigV3Section, ConfigV3SubSection } from '../../../../lib/ipc/models/config';
import { SiteWithAuthInfo } from '../../../../lib/ipc/toUI/config';
import { PanelSubtitle } from '../../common/PanelSubtitle';
import { PanelTitle } from '../../common/PanelTitle';
import { SiteAuthenticator } from './../auth/SiteAuthenticator';

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            panelStyles: {
                '&:hover': {
                    cursor: 'default !important',
                },
            },
        }) as const,
);

type AuthPanelProps = {
    isRemote: boolean;
    sites: SiteWithAuthInfo[];
    product: Product;
    section: ConfigV3Section;
};

export const AuthPanel: React.FunctionComponent<AuthPanelProps> = memo(({ isRemote, sites, product, section }) => {
    const currentAuthSubSection = product.key === 'jira' ? ConfigV3SubSection.JiraAuth : ConfigV3SubSection.BbAuth;
    const classes = useStyles();

    return (
        <Accordion hidden={false} square={false} expanded={true}>
            <AccordionSummary
                className={classes.panelStyles}
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
