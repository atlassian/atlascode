import { Box, Grid } from '@material-ui/core';
import React, { useMemo } from 'react';

import { BasicPanel } from '../common/BasicPanel';
import { PageTaskList } from './PageTaskList';
import { PRBuildStatus } from './PRBuildStatus';
import { PullRequestDetailsControllerApi, PullRequestDetailsState } from './pullRequestDetailsController';
import { Reviewers } from './Reviewers';

interface PullRequestSidebarProps {
    state: PullRequestDetailsState;
    controller: PullRequestDetailsControllerApi;
}

export const PullRequestSidebar: React.FC<PullRequestSidebarProps> = ({ state, controller }) => {
    const taskSubtitle = useMemo(() => {
        const numTasks = state.tasks.length;
        const numCompletedTasks = state.tasks.filter((task) => task.isComplete).length;
        return numTasks === 0 ? '0 tasks' : `${numCompletedTasks} of ${numTasks} complete`;
    }, [state.tasks]);

    const buildStatusSubtitle = useMemo(() => {
        const numBuilds = state.buildStatuses.length;
        const numSuccessfulBuilds = state.buildStatuses.filter((status) => status.state === 'SUCCESSFUL').length;
        return numBuilds === 0 ? '0 builds' : `${numSuccessfulBuilds} of ${numBuilds} passed`;
    }, [state.buildStatuses]);

    return (
        <Box margin={2}>
            <Grid container spacing={1} direction={'column'}>
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
                    <BasicPanel
                        isLoading={state.loadState.buildStatuses}
                        isDefaultExpanded
                        hidden={false}
                        subtitle={buildStatusSubtitle}
                        title={'Builds'}
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
                        subtitle={taskSubtitle}
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
