import { Box, Button, makeStyles, Tooltip, Typography } from '@material-ui/core';
import CloudIcon from '@material-ui/icons/Cloud';
import React, { useCallback, useContext } from 'react';
import { emptyUserInfo, Product, ProductJira } from '../../../atlclients/authInfo';
import { OnboardingControllerContext } from './onboardingController';

const useStyles = makeStyles((theme) => ({
    box: {
        textAlign: 'center',
        width: 'inherit',
        height: 'inherit',
    },
    icon: {
        fontSize: 100,
        color: 'white',
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
        marginBottom: 30,
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
        color: theme.palette.type === 'dark' ? '#7f8082' : '#b4c5cf',
    },
}));

type AltCloudAuthButtonProps = {
    product: Product;
};

export const AltCloudAuthButton: React.FunctionComponent<AltCloudAuthButtonProps> = ({ product }) => {
    const classes = useStyles();
    const loginText = `${product.name} Cloud`;
    const controller = useContext(OnboardingControllerContext);
    const subtext = 'For most of our users';

    const handleCloudProd = useCallback(() => {
        const hostname = product.key === ProductJira.key ? 'atlassian.net' : 'bitbucket.org';
        controller.login({ host: hostname, product: product }, { user: emptyUserInfo });
    }, [controller, product]);

    return (
        <Tooltip title={'Opens a browser window to log in via OAuth'}>
            <Button variant="contained" color="primary" className={classes.button} onClick={handleCloudProd}>
                <Box className={classes.box}>
                    <div className={classes.icon}>
                        {loginText} {<CloudIcon fontSize={'inherit'} />}
                    </div>
                    <Typography variant="h2" className={classes.buttonSubtext}>
                        {subtext}
                    </Typography>
                </Box>
            </Button>
        </Tooltip>
    );
};
