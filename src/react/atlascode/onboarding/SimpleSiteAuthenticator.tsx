import { Container, Grid, makeStyles, Typography } from '@material-ui/core';
import React from 'react';
import { ProductBitbucket, ProductJira } from '../../../atlclients/authInfo';
import { SiteWithAuthInfo } from '../../../lib/ipc/toUI/config';
import { AltCloudAuthButton } from './AltCloudAuthButton';
import { AltServerAuthButton } from './AltServerAuthButton';
import * as l10n from '@vscode/l10n';

const useStyles = makeStyles((theme) => ({
    root: {
        flexGrow: 1,
    },
}));

type SimpleSiteAuthenticatorProps = {
    enableBitbucket: boolean;
    enableJira: boolean;
    bitbucketSites: SiteWithAuthInfo[];
    jiraSites: SiteWithAuthInfo[];
    onFinished: () => void;
};

export const SimpleSiteAuthenticator: React.FunctionComponent<SimpleSiteAuthenticatorProps> = ({
    enableBitbucket,
    enableJira,
    bitbucketSites,
    jiraSites,
    onFinished,
}) => {
    const classes = useStyles();

    const bitbucketAuthComplete = !enableBitbucket || bitbucketSites.length > 0;
    const jiraAuthComplete = !enableJira || jiraSites.length > 0;

    if (bitbucketAuthComplete && jiraAuthComplete) {
        onFinished();
    }

    return (
        <div className={classes.root}>
            <Grid container justify="center" spacing={3}>
                <Grid hidden={jiraAuthComplete} item xs={12}>
                    <Typography variant="h1" align="center">
                        {l10n.t('Authenticate with {0}', ProductJira.name)}
                    </Typography>
                </Grid>
                <Grid hidden={jiraAuthComplete} item lg={6} md={12} sm={12} xs={12} alignItems={'flex-end'}>
                    <AltCloudAuthButton product={ProductJira} />
                </Grid>
                <Grid hidden={jiraAuthComplete} item lg={6} md={12} sm={12} xs={12} alignItems={'flex-end'}>
                    <AltServerAuthButton product={ProductJira} />
                </Grid>
                <Grid hidden={!jiraAuthComplete || bitbucketAuthComplete} item xs={12}>
                    <Typography variant="h1" align="center">
                        {l10n.t('Authenticate with {0}', ProductBitbucket.name)}
                    </Typography>
                </Grid>
                <Grid
                    hidden={!jiraAuthComplete || bitbucketAuthComplete}
                    item
                    lg={6}
                    md={12}
                    sm={12}
                    xs={12}
                    alignItems={'flex-end'}
                >
                    <Container maxWidth="lg" disableGutters style={{ height: '100%' }}>
                        <AltCloudAuthButton product={ProductBitbucket} />
                    </Container>
                </Grid>
                <Grid
                    hidden={!jiraAuthComplete || bitbucketAuthComplete}
                    item
                    lg={6}
                    md={12}
                    sm={12}
                    xs={12}
                    alignItems={'flex-end'}
                >
                    <Container maxWidth="lg" disableGutters style={{ height: '100%' }}>
                        <AltServerAuthButton product={ProductBitbucket} />
                    </Container>
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h3" align="center">
                        {l10n.t('Additional sites can be added later')}
                    </Typography>
                </Grid>
            </Grid>
        </div>
    );
};
