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
    initiateJiraApiTokenAuth: boolean;
    initiateBitbucketApiTokenAuth: boolean;
    config: { [key: string]: any };
    jiraToggle: (enabled: boolean) => void;
    bbToggle: (enabled: boolean) => void;
};

export const AuthenticationPanel: React.FunctionComponent<AuthenicationPanelProps> = ({
    visible,
    jiraSites,
    bitbucketSites,
    isRemote,
    initiateJiraApiTokenAuth,
    initiateBitbucketApiTokenAuth,
    config,
    jiraToggle,
    bbToggle,
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
                                initiateApiTokenAuth={initiateJiraApiTokenAuth}
                                config={config}
                                productToggle={jiraToggle}
                            />
                        </Grid>
                        <Grid item>
                            <AuthPanel
                                isRemote={isRemote}
                                sites={bitbucketSites}
                                product={ProductBitbucket}
                                section={ConfigV3Section.Auth}
                                initiateApiTokenAuth={initiateBitbucketApiTokenAuth}
                                config={config}
                                productToggle={bbToggle}
                            />
                        </Grid>
                    </Grid>
                </div>
            </Fade>
        </>
    );
};
