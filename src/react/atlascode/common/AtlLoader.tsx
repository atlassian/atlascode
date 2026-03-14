import { Container, Grid, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
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
    spinnerContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        minHeight: '200px',
    },
    spinner: {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: `conic-gradient(from 0deg, transparent 0deg, transparent 126deg, #1868DB 126deg, #1868DB 360deg)`,
        mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
        '-webkit-mask': 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
        animation: '$spin 0.8s linear infinite',
        boxSizing: 'border-box' as const,
    },
    ['@keyframes spin']: {
        from: {
            transform: 'rotate(0deg)',
        },
        to: {
            transform: 'rotate(360deg)',
        },
    },
};

const useStyles = makeStyles(styles);

interface AtlLoaderProps {
    variant?: 'default' | 'rovoDev';
}

export const AtlLoader: React.FunctionComponent<AtlLoaderProps> = ({ variant = 'default' }) => {
    const classes = useStyles();

    if (variant === 'rovoDev') {
        return (
            <div className={classes.spinnerContainer}>
                <div className={classes.spinner} />
            </div>
        );
    }

    return (
        <Container maxWidth="xl">
            <Grid container direction="column" justifyContent="center" alignItems="center">
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
