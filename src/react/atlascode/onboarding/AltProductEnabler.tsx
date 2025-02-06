import { Box, Grid, lighten, makeStyles, Tooltip, Typography } from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import { ToggleButton } from '@material-ui/lab';
import React, { useCallback } from 'react';
import * as l10n from '@vscode/l10n';

const useStyles = makeStyles((theme) => ({
    buttonInterior: {
        textAlign: 'center',
        width: 'inherit',
        height: 'inherit',
    },
    label: {
        fontSize: 70,
        color: theme.palette.type === 'dark' ? lighten(theme.palette.text.primary, 1) : theme.palette.text.primary,
        //'Primary' in dark mode is not white, which creates too low of a contrast
    },
    button: {
        textTransform: 'none',
        width: '100%',
        height: '100%',
        background: theme.palette.background.paper,
    },
    buttonSubtext: {
        fontSize: 30,
        marginBottom: 32,
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
        color: theme.palette.text.disabled,
    },
    productIcon: {
        marginTop: 24, //Icon is in a 32 x 32 box so adjust its origin before expanding it (this centers the icon inline)
        fontSize: 70,
    },
    circleCheckIcon: {
        top: '0px',
        right: '0px',
        position: 'absolute',
        margin: '7px',
        color: 'LimeGreen',
    },
}));

export type AltProductEnablerProps = {
    label: string;
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    subtext: string;
    ProductIcon: React.ReactNode;
};

export const AltProductEnabler: React.FunctionComponent<AltProductEnablerProps> = ({
    label,
    enabled,
    onToggle,
    subtext,
    ProductIcon,
}) => {
    const classes = useStyles();

    const handleToggle = useCallback(() => {
        onToggle(!enabled);
    }, [enabled, onToggle]);

    return (
        <Tooltip title={enabled ? l10n.t('Disable {0} features', label) : l10n.t('Enable {0} features', label)}>
            <ToggleButton className={classes.button} onClick={handleToggle} selected={enabled}>
                <Grid container direction="column">
                    <Grid container direction="row" alignItems="center" justify="center" spacing={1}>
                        <Grid item>
                            <Typography className={classes.label}>{label}</Typography>
                        </Grid>
                        <Grid item>
                            <Box className={classes.productIcon}>{ProductIcon}</Box>
                        </Grid>
                    </Grid>
                    <Typography variant="h2" className={classes.buttonSubtext}>
                        {subtext}
                    </Typography>
                </Grid>
                <Box hidden={!enabled}>
                    <CheckCircleIcon fontSize={'large'} className={classes.circleCheckIcon} />
                </Box>
            </ToggleButton>
        </Tooltip>
    );
};
