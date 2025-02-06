import { Button, Grid, lighten, makeStyles, Tooltip, Typography } from '@material-ui/core';
import StorageIcon from '@material-ui/icons/Storage';
import React, { useCallback, useContext } from 'react';
import { Product } from '../../../atlclients/authInfo';
import { AuthDialogControllerContext } from '../config/auth/useAuthDialog';
import * as l10n from '@vscode/l10n';

const useStyles = makeStyles((theme) => ({
    box: {
        textAlign: 'center',
        width: 'inherit',
        height: 'inherit',
        backgroundColor: 'inherit',
    },
    label: {
        fontSize: 70,
    },
    productIcon: {
        marginTop: 16, //Icon is in a 24 x 24 box, but needs to be pushed down 16px to look centered
        fontSize: 70,
    },
    button: {
        textTransform: 'none',
        width: '100%',
        height: '100%',
        background: theme.palette.action.disabled,
        color: theme.palette.type === 'dark' ? lighten(theme.palette.text.primary, 1) : theme.palette.text.primary,
        '&:hover': {
            color: theme.palette.type === 'dark' ? lighten(theme.palette.text.primary, 1) : 'white',
        },
    },
    buttonSubtext: {
        fontSize: 30,
        marginBottom: 32,
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
        color: theme.palette.text.disabled,
    },
}));

type AltServerAuthButtonProps = {
    product: Product;
};

export const AltServerAuthButton: React.FunctionComponent<AltServerAuthButtonProps> = ({ product }) => {
    const classes = useStyles();
    const subtext = 'For users with custom servers';
    const authDialogController = useContext(AuthDialogControllerContext);
    const openProductAuth = useCallback(() => {
        authDialogController.openDialog(product, undefined);
    }, [authDialogController, product]);

    return (
        <Tooltip title={l10n.t('Opens a dialog window to log in with custom instance')}>
            <Button variant="contained" className={classes.button} onClick={openProductAuth}>
                <Grid container direction="column">
                    <Grid container direction="row" alignItems="center" justify="center" spacing={3}>
                        <Grid item>
                            <Typography className={classes.label}>Custom</Typography>
                        </Grid>
                        <Grid item>
                            <Typography className={classes.label}>{product.name}</Typography>
                        </Grid>
                        <Grid item>{<StorageIcon className={classes.productIcon} />}</Grid>
                    </Grid>
                    <Typography variant="h2" className={classes.buttonSubtext}>
                        {subtext}
                    </Typography>
                </Grid>
            </Button>
        </Tooltip>
    );
};
