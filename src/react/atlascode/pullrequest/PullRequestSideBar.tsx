import { Avatar, Box, CircularProgress, Grid, Tooltip, Typography } from '@mui/material';
import React, { useMemo } from 'react';

import { BasicPanel } from '../common/BasicPanel';
import { formatDate } from './bitbucketDateFormatter';
import { PageTaskList } from './PageTaskList';
import { PRBuildStatus } from './PRBuildStatus';
import { PullRequestDetailsControllerApi, PullRequestDetailsState } from './pullRequestDetailsController';
import { Reviewers } from './Reviewers';

interface PullRequestSidebarProps {
    state: PullRequestDetailsState;
    controller: PullRequestDetailsControllerApi;
}

export const PullRequestSidebar: React.FC<PullRequestSidebarProps> = ({ state, controller }) => {
    const taskTitle = useMemo(() => {
        const numTasks = state.tasks.length;
        const numCompletedTasks = state.tasks.filter((task) => task.isComplete).length;
        return numTasks === 0 ? '0 tasks' : `${numCompletedTasks} of ${numTasks} complete`;
    }, [state.tasks]);

    return (
        <Box margin={2}>
            <Grid container spacing={1} direction={'column'} data-testid="pullrequest.sidebar">
                <Grid item>
                    <Typography variant="h6">
                        <strong>Author</strong>
                    </Typography>
                    <Box hidden={state.loadState.basicData}>
                        <Grid container spacing={1} direction="row" alignItems="center">
                            <Grid item>
                                {' '}
                                <Tooltip title={state.pr.data.author.displayName}>
                                    <Avatar
                                        alt={state.pr.data.author.displayName}
                                        src={state.pr.data.author.avatarUrl}
                                    />
                                </Tooltip>
                            </Grid>

                            <Grid item>
                                <Typography>{state.pr.data.author.displayName}</Typography>
                            </Grid>
                        </Grid>
                    </Box>
                    <Box hidden={!state.loadState.basicData}>
                        <CircularProgress />
                    </Box>
                </Grid>
                <Grid item>
                    <BasicPanel
                        isLoading={state.loadState.basicData}
                        isDefaultExpanded
                        hidden={false}
                        title={`Reviewers`}
                    >
                        <Reviewers
                            site={state.pr.site}
                            participants={state.pr.data.participants}
                            onUpdateReviewers={controller.updateReviewers}
                            isLoading={state.loadState.basicData}
                        />
                    </BasicPanel>
                </Grid>

                <Grid item>
                    <Typography variant="h6">
                        <strong>Created</strong>
                    </Typography>
                    <Tooltip title={state.pr.data.ts || 'unknown'}>
                        <Typography>{formatDate(state.pr.data.ts)}</Typography>
                    </Tooltip>
                </Grid>

                <Grid item>
                    <Typography variant="h6">
                        <strong>Updated</strong>
                    </Typography>
                    <Tooltip title={state.pr.data.updatedTs || 'unknown'}>
                        <Typography>{formatDate(state.pr.data.updatedTs)}</Typography>
                    </Tooltip>
                </Grid>

                <Grid item>
                    <BasicPanel
                        isLoading={state.loadState.buildStatuses}
                        isDefaultExpanded
                        hidden={state.buildStatuses.length === 0}
                        title={`${
                            state.buildStatuses.filter((status) => status.state === 'SUCCESSFUL').length
                        } of ${state.buildStatuses.length} build${state.buildStatuses.length > 0 ? 's' : ''} passed`}
                    >
                        <PRBuildStatus
                            buildStatuses={state.buildStatuses}
                            openBuildStatus={controller.openBuildStatus}
                        />
                    </BasicPanel>
                </Grid>

                <Grid item>
                    <BasicPanel
                        title={'Tasks'}
                        subtitle={taskTitle}
                        isDefaultExpanded
                        isLoading={state.loadState.tasks}
                    >
                        <PageTaskList
                            tasks={state.tasks}
                            onEdit={controller.editTask}
                            onDelete={controller.deleteTask}
                        />
                    </BasicPanel>
                </Grid>
            </Grid>
        </Box>
    );
};
