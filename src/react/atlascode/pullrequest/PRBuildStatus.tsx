import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { Box, Grid, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import * as React from 'react';

import { BuildStatus } from '../../../bitbucket/model';
import { formatTime } from '../util/date-fns';

const successIcon = <CheckCircleIcon style={{ color: 'green' }} />;
const inprogressIcon = <ScheduleIcon style={{ color: 'blue' }} />;
const errorIcon = <ErrorIcon style={{ color: 'red' }} />;

type PRBuildStatusProps = {
    buildStatuses: BuildStatus[];
    openBuildStatus: (buildStatus: BuildStatus) => void;
};

const useStyles = makeStyles({
    buildlLinkButton: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        color: 'var(--vscode-textLink-foreground)',
        textAlign: 'left',
        '&:hover': {
            textDecoration: 'underline',
        },
    },
});

export const PRBuildStatus: React.FunctionComponent<PRBuildStatusProps> = ({ buildStatuses, openBuildStatus }) => {
    const classes = useStyles();
    const sortedBuildStatuses = [...buildStatuses].sort((a, b) => {
        const statePriority: { [key in BuildStatus['state']]: number } = {
            FAILED: 0,
            STOPPED: 1,
            INPROGRESS: 2,
            SUCCESSFUL: 3,
        };
        return statePriority[a.state] - statePriority[b.state];
    });

    return (
        <Grid container direction="column" spacing={2}>
            {sortedBuildStatuses.map((status) => {
                const timestamp = status.last_updated || status.ts;
                const timePrefix = status.last_updated ? '' : 'Started';
                const timeSinceUpdate = formatTime(timestamp);

                return (
                    <Grid item key={status.url}>
                        <Box display="flex" alignItems="center" style={{ width: '250px' }}>
                            {status.state === 'INPROGRESS'
                                ? inprogressIcon
                                : status.state === 'SUCCESSFUL'
                                  ? successIcon
                                  : errorIcon}
                            <Box ml={1} display="flex" flexDirection="column" style={{ minWidth: 0 }}>
                                <button
                                    onClick={() => openBuildStatus(status)}
                                    className={classes.buildlLinkButton}
                                    title={status.name}
                                >
                                    {status.name || status.key}
                                </button>
                                <Typography variant="caption" style={{ color: 'var(--vscode-editor-foreground)' }}>
                                    {`${timePrefix} ${timeSinceUpdate}`}
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>
                );
            })}
        </Grid>
    );
};
