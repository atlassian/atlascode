import { Box, Button, darken, Divider, Grid, lighten, Skeleton, Theme, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import React, { useCallback, useState } from 'react';

const useStyles = makeStyles((theme: Theme) => ({
    button: {
        width: '100%',
        height: '100%',
        textTransform: 'none',
        padding: theme.spacing(3),
        backgroundColor:
            theme.palette.mode === 'dark'
                ? lighten(theme.palette.background.paper, 0.05)
                : darken(theme.palette.background.paper, 0.05),
        color: theme.palette.text.primary,
        '&:hover': {
            color: theme.palette.text.primary,
            backgroundColor:
                theme.palette.mode === 'dark'
                    ? lighten(theme.palette.background.paper, 0.2)
                    : darken(theme.palette.background.paper, 0.2),
        },
    },
    gifBox: {
        maxWidth: '100%',
        maxHeight: 'auto',
        borderWidth: 3,
        borderStyle: 'solid',
        borderColor: 'DeepSkyBlue',
        borderRadius: 3,
    },
}));

export type AltDemoButtonProps = {
    gifLink: string;
    label: string;
    description: React.ReactNode;
    productIcon: React.ReactNode;
    action: () => void;
    onClick: (
        gifLink: string,
        modalTitle: string,
        description: React.ReactNode,
        action: () => void,
        actionNotAvailable?: boolean,
    ) => void;
    actionNotAvailable?: boolean;
};

export const AltDemoButton: React.FunctionComponent<AltDemoButtonProps> = ({
    gifLink,
    label,
    description,
    productIcon,
    action,
    onClick,
    actionNotAvailable,
}) => {
    const classes = useStyles();
    const [imageLoaded, setImageLoaded] = useState(false);

    const handleClick = useCallback((): void => {
        onClick(gifLink, label, description, action, actionNotAvailable);
    }, [onClick, gifLink, label, description, action, actionNotAvailable]);

    const handleImageLoaded = useCallback((): void => {
        setImageLoaded(true);
    }, []);

    return (
        <Button className={classes.button} onClick={handleClick}>
            <Grid container spacing={2} direction="row" justifyContent="center" alignItems="flex-start">
                <Grid item xs={12}>
                    <Typography variant="h4" align="left">
                        {label} {productIcon}
                    </Typography>
                </Grid>
                <Grid item xs={12}>
                    <Divider />
                </Grid>
                <Grid item lg={3} md={6} sm={12} xs={12}>
                    <Box hidden={imageLoaded}>
                        <Skeleton variant="rectangular" width="100%" height="200px" />
                    </Box>
                    <Box hidden={!imageLoaded}>
                        <img
                            aria-label={`Gif showing "${description}" action`}
                            className={classes.gifBox}
                            src={gifLink}
                            onLoad={handleImageLoaded}
                        />
                    </Box>
                </Grid>
                <Grid item lg={9} md={6} sm={12} xs={12}>
                    <Typography variant="body1" align="left">
                        {description}
                    </Typography>
                </Grid>
            </Grid>
        </Button>
    );
};

export default AltDemoButton;
