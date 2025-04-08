import { Container, Grid, makeStyles, Typography } from '@material-ui/core';
import React from 'react';

const styles = {
    root: {
        width: '400px',
        height: '400px',
        animation: '$hideshow 1.5s ease-in-out',
        'animation-iteration-count': 'infinite',
        'animation-direction': 'alternate',
    },
    ['@keyframes hideshow']: {
        '0%': {
            opacity: 0.3,
        },
        '100%': {
            opacity: 0.1,
        },
    },
};

const useStyles = makeStyles(styles);

export const AtlLoader: React.FunctionComponent = () => {
    const classes = useStyles();

    return (
        <Container maxWidth="xl">
            <Grid container direction="column" justify="center" alignItems="center">
                <Grid item>
                    <img className={classes.root} src={'images/atlassian-icon.svg'} />
                </Grid>
                <Grid item>
                    <Typography variant="subtitle1">Loading data...</Typography>
                </Grid>
            </Grid>
        </Container>
    );
};
