import { Fade, Grid } from '@mui/material';
import React from 'react';

import { ProductBitbucket, ProductJira } from '../../../../atlclients/authInfo';
import { ConfigV3Section } from '../../../../lib/ipc/models/config';
import { SiteWithAuthInfo } from '../../../../lib/ipc/toUI/config';
import { AuthPanel } from './AuthPanel';

type AuthenicationPanelProps = {
    visible: boolean;
    jiraSites: SiteWithAuthInfo[];
    bitbucketSites: SiteWithAuthInfo[];
    isRemote: boolean;
};

export const AuthenticationPanel: React.FunctionComponent<AuthenicationPanelProps> = ({
    visible,
    jiraSites,
    bitbucketSites,
    isRemote,
}) => {
    return (
        <>
            <Fade in={visible}>
                <div hidden={!visible} role="tabpanel">
                    <Grid container spacing={3} direction="column">
                        <Grid item>
                            <AuthPanel
                                isRemote={isRemote}
                                sites={jiraSites}
                                product={ProductJira}
                                section={ConfigV3Section.Auth}
                            />
                        </Grid>
                        <Grid item>
                            <AuthPanel
                                isRemote={isRemote}
                                sites={bitbucketSites}
                                product={ProductBitbucket}
                                section={ConfigV3Section.Auth}
                            />
                        </Grid>
                    </Grid>
                </div>
            </Fade>
        </>
    );
};
