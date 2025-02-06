import { Button, Grid, lighten, makeStyles, Tooltip, Typography } from '@material-ui/core';
import CloudIcon from '@material-ui/icons/Cloud';
import React, { useCallback, useContext } from 'react';
import { AuthInfoState, emptyUserInfo, Product, ProductJira } from '../../../atlclients/authInfo';
import { OnboardingControllerContext } from './onboardingController';
import * as l10n from '@vscode/l10n';

const useStyles = makeStyles((theme) => ({
    box: {
        textAlign: 'center',
        width: 'inherit',
        height: 'inherit',
    },
    label: {
        fontSize: 70,
        color: theme.palette.type === 'dark' ? lighten(theme.palette.text.primary, 1) : 'white',
        // White is chosen for light mode because it creates a nice "sky" effect when paired with a white cloud and blue (primary) background
    },
    productIcon: {
        marginTop: 16, //Needs to be pushed down 16px to look centered
        fontSize: 70,
        color: theme.palette.type === 'dark' ? lighten(theme.palette.text.primary, 1) : 'white',
    },
    button: {
        padding: 0,
        textTransform: 'none',
        width: '100%',
        height: '100%',
        textAlign: 'center',
        backgroundColor: theme.palette.type === 'dark' ? theme.palette.primary.dark : theme.palette.primary.light,
    },
    buttonSubtext: {
        fontSize: 30,
        marginBottom: 30,
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
        color: theme.palette.text.disabled,
    },
}));

type AltCloudAuthButtonProps = {
    product: Product;
};

export const AltCloudAuthButton: React.FunctionComponent<AltCloudAuthButtonProps> = ({ product }) => {
    const classes = useStyles();
    const controller = useContext(OnboardingControllerContext);
    const subtext = 'For most of our users';

    const handleCloudProd = useCallback(() => {
        const hostname = product.key === ProductJira.key ? 'atlassian.net' : 'bitbucket.org';
        controller.login({ host: hostname, product: product }, { user: emptyUserInfo, state: AuthInfoState.Valid });
    }, [controller, product]);

    return (
        <Tooltip title={l10n.t('Opens a browser window to log in via OAuth')}>
            <Button
                id="onboarding-cloud-button"
                variant="contained"
                color="primary"
                className={classes.button}
                onClick={handleCloudProd}
            >
                <Grid container direction="column">
                    <Grid container direction="row" alignItems="center" justify="center" spacing={3}>
                        <Grid item>
                            <Typography className={classes.label}>{product.name}</Typography>
                        </Grid>
                        <Grid item>
                            <Typography className={classes.label}>Cloud</Typography>
                        </Grid>
                        <Grid item>{<CloudIcon className={classes.productIcon} />}</Grid>
                    </Grid>
                    <Typography variant="h2" className={classes.buttonSubtext}>
                        {subtext}
                    </Typography>
                </Grid>
            </Button>
        </Tooltip>
    );
};
