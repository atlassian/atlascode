import { Box, Grid, Link, Typography } from '@mui/material';
import React from 'react';

import { TaskInfoSectionProps } from '../types';

export const TaskInfoSection: React.FC<TaskInfoSectionProps> = ({ state, controller }) => {
    return (
        <Box marginBottom={2}>
            <Grid container alignItems="center" spacing={1}>
                <Grid item>
                    <Grid container alignItems="center" spacing={1} wrap="nowrap">
                        <Grid item>
                            <Typography variant="h5">For</Typography>
                        </Grid>
                        <Grid item>
                            <Box
                                border={1}
                                borderRadius="3px"
                                padding={0.5}
                                borderColor={'var(--vscode-list-inactiveSelectionBackground)'}
                            >
                                <Grid container alignItems="center" spacing={1} wrap="nowrap">
                                    <Grid item>
                                        <Box
                                            width="14px"
                                            height="14px"
                                            style={{
                                                backgroundImage: `url(${state.issue.issuetype.iconUrl})`,
                                                backgroundSize: 'contain',
                                            }}
                                            title={state.issue.issuetype.name}
                                        />
                                    </Grid>
                                    <Grid item>
                                        <Typography variant="h5">
                                            <Link onClick={controller.openJiraIssue} style={{ cursor: 'pointer' }}>
                                                {state.issue.key}
                                            </Link>
                                        </Typography>
                                    </Grid>
                                    <Grid item>
                                        <Typography variant="h5">{state.issue.summary}</Typography>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </Box>
    );
};
