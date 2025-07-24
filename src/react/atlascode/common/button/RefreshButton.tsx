import { createStyles, IconButton, makeStyles, Theme, Tooltip } from '@material-ui/core';
import Sync from '@material-ui/icons/Sync';
import * as React from 'react';

type RefreshButtonProps = {
    loading: boolean;
    disabled?: boolean;
    onClick: () => void;
};

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        refreshLoader: {
            transition: theme.transitions.create('transform'),
            animation: '$circular-rotate 1.4s linear infinite',
        },
        '@keyframes circular-rotate': {
            '100%': {
                transform: 'rotate(-360deg)',
            },
        },
    }),
);

export const RefreshButton: React.FunctionComponent<RefreshButtonProps> = ({ loading, disabled, onClick }) => {
    const classes = useStyles();

    return (
        <Tooltip title="click to refresh">
            <IconButton
                size="small"
                color="inherit"
                onClick={onClick}
                className={loading ? classes.refreshLoader : undefined}
                disabled={disabled}
            >
                <Sync />
            </IconButton>
        </Tooltip>
    );
};
