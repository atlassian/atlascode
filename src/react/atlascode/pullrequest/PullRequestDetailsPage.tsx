import { Box, Container, Grid, makeStyles, Paper, Theme, Typography } from '@material-ui/core';
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import React, { useCallback, useEffect, useState } from 'react';
import { ApprovalStatus, User } from '../../../bitbucket/model';
import { BasicPanel } from '../common/BasicPanel';
import CommentForm from '../common/CommentForm';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { Commits } from './Commits';
import { DiffList } from './DiffList';
import { NestedCommentList } from './NestedCommentList';
import { PageTaskList } from './PageTaskList';
import { PRBuildStatus } from './PRBuildStatus';
import {
    PullRequestDetailsControllerApi,
    PullRequestDetailsControllerContext,
    PullRequestDetailsState,
    usePullRequestDetailsController,
} from './pullRequestDetailsController';
import { RelatedBitbucketIssues } from './RelatedBitbucketIssues';
import { RelatedJiraIssues } from './RelatedJiraIssues';
import { Reviewers } from './Reviewers';
import { SummaryPanel } from './SummaryPanel';
import { AtlascodeErrorBoundary } from '../common/ErrorBoundary';
import { AnalyticsView } from 'src/analyticsTypes';
import { PullRequestHeader } from './PullRequestHeader';

const useStyles = makeStyles((theme: Theme) => ({
    grow: {
        flexGrow: 1,
    },
    title: {
        flexGrow: 0,
        marginRight: theme.spacing(3),
        marginLeft: theme.spacing(1),
    },
    paper100: {
        overflow: 'hidden',
        height: '100%',
    },
    paperOverflow: {
        overflow: 'hidden',
    },
}));

interface PullRequestMainContentProps {
    state: PullRequestDetailsState;
    controller: PullRequestDetailsControllerApi;
    handleFetchUsers: (input: string, abortSignal?: AbortSignal) => Promise<User[]>;
    taskTitle: () => string;
}

const PullRequestMainContent: React.FC<PullRequestMainContentProps> = ({
    state,
    controller,
    handleFetchUsers,
    taskTitle,
}) => {
    return (
        <Box margin={2}>
            <Grid container spacing={3} direction="column" justify="center">
                <ErrorDisplay />

                <Grid item>
                    <SummaryPanel
                        rawSummary={state.pr.data.rawSummary}
                        htmlSummary={state.pr.data.htmlSummary}
                        fetchUsers={handleFetchUsers}
                        isLoading={state.loadState.basicData}
                        summaryChange={controller.updateSummary}
                    />
                </Grid>
                <Grid item>
                    <BasicPanel
                        title={'Related Jira Issues'}
                        subtitle={`${state.relatedJiraIssues.length} issues`}
                        isLoading={state.loadState.relatedJiraIssues}
                        hidden={state.relatedJiraIssues.length === 0}
                    >
                        <RelatedJiraIssues
                            relatedIssues={state.relatedJiraIssues}
                            openJiraIssue={controller.openJiraIssue}
                        />
                    </BasicPanel>
                </Grid>
                <Grid item>
                    <BasicPanel
                        title={'Related Bitbucket Issues'}
                        subtitle={`${state.relatedBitbucketIssues.length} issues`}
                        isLoading={state.loadState.relatedBitbucketIssues}
                        hidden={state.relatedBitbucketIssues.length === 0}
                    >
                        <RelatedBitbucketIssues
                            relatedIssues={state.relatedBitbucketIssues}
                            openBitbucketIssue={controller.openBitbucketIssue}
                        />
                    </BasicPanel>
                </Grid>
                <Grid item>
                    <BasicPanel
                        title={'Commits'}
                        subtitle={`${state.commits.length} commits`}
                        isDefaultExpanded
                        isLoading={state.loadState.commits}
                    >
                        <Commits commits={state.commits} />
                    </BasicPanel>
                </Grid>
                <Grid item>
                    <BasicPanel
                        title={'Tasks'}
                        subtitle={taskTitle()}
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
                <Grid item>
                    <BasicPanel
                        title={'Files Changed'}
                        subtitle={'Click on file names to open diff in editor'}
                        isDefaultExpanded
                        isLoading={state.loadState.diffs}
                    >
                        <DiffList
                            fileDiffs={state.fileDiffs}
                            openDiffHandler={controller.openDiff}
                            conflictedFiles={state.conflictedFiles}
                        />
                    </BasicPanel>
                </Grid>
                <Grid item>
                    <BasicPanel title={'Comments'} isDefaultExpanded isLoading={state.loadState.comments}>
                        <Grid container spacing={2} direction="column">
                            <Grid item>
                                <NestedCommentList
                                    comments={state.comments}
                                    currentUser={state.currentUser}
                                    fetchUsers={handleFetchUsers}
                                    onDelete={controller.deleteComment}
                                />
                            </Grid>
                            <Grid item>
                                <CommentForm
                                    currentUser={state.currentUser}
                                    fetchUsers={handleFetchUsers}
                                    onSave={controller.postComment}
                                />
                            </Grid>
                        </Grid>
                    </BasicPanel>
                </Grid>
            </Grid>
        </Box>
    );
};

interface PullRequestSidebarProps {
    state: PullRequestDetailsState;
    controller: PullRequestDetailsControllerApi;
}

const PullRequestSidebar: React.FC<PullRequestSidebarProps> = ({ state, controller }) => {
    return (
        <Box margin={2}>
            <Grid container spacing={1} direction={'column'}>
                <Grid item>
                    <Typography variant="h6">
                        <strong>Reviewers</strong>
                    </Typography>
                    <Box marginLeft={2} marginTop={1}>
                        <Reviewers
                            site={state.pr.site}
                            participants={state.pr.data.participants}
                            onUpdateReviewers={controller.updateReviewers}
                            isLoading={state.loadState.basicData}
                        />
                    </Box>
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
            </Grid>
        </Box>
    );
};

export const PullRequestDetailsPage: React.FunctionComponent = () => {
    const classes = useStyles();
    const [state, controller] = usePullRequestDetailsController();
    const [currentUserApprovalStatus, setCurrentUserApprovalStatus] = useState<ApprovalStatus>('UNAPPROVED');

    const handleFetchUsers = AwesomeDebouncePromise(
        async (input: string, abortSignal?: AbortSignal): Promise<User[]> => {
            return await controller.fetchUsers(state.pr.site, input, abortSignal);
        },
        300,
        { leading: false },
    );

    const isSomethingLoading = useCallback(() => {
        return Object.entries(state.loadState).some(
            (entry) => entry[1] /* Second index is the value in the key/value pair */,
        );
    }, [state.loadState]);

    const taskTitle = useCallback(() => {
        const numTasks = state.tasks.length;
        const numCompletedTasks = state.tasks.filter((task) => task.isComplete).length;
        return numTasks === 0 ? '0 tasks' : `${numCompletedTasks} of ${numTasks} complete`;
    }, [state.tasks]);

    useEffect(() => {
        const foundCurrentUser = state.pr.data.participants.find(
            (participant) => participant.accountId === state.currentUser.accountId,
        );
        if (foundCurrentUser) {
            setCurrentUserApprovalStatus(foundCurrentUser.status);
        }
    }, [state.pr.data.participants, state.currentUser.accountId]);

    return (
        <PullRequestDetailsControllerContext.Provider value={controller}>
            <AtlascodeErrorBoundary
                context={{ view: AnalyticsView.PullRequestPage }}
                postMessageFunc={controller.postMessage}
            >
                <Container maxWidth="xl">
                    <PullRequestHeader
                        state={state}
                        controller={controller}
                        currentUserApprovalStatus={currentUserApprovalStatus}
                        isSomethingLoading={isSomethingLoading}
                    />
                    <Box marginTop={1} />
                    <Grid container spacing={1} direction="row" wrap="wrap-reverse">
                        <Grid item xs={12} md={9} lg={9} xl={9}>
                            <Paper className={classes.paper100}>
                                <PullRequestMainContent
                                    state={state}
                                    controller={controller}
                                    handleFetchUsers={handleFetchUsers}
                                    taskTitle={taskTitle}
                                />
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={3} lg={3} xl={3}>
                            <Paper className={classes.paperOverflow}>
                                <PullRequestSidebar state={state} controller={controller} />
                            </Paper>
                        </Grid>
                    </Grid>
                </Container>
            </AtlascodeErrorBoundary>
        </PullRequestDetailsControllerContext.Provider>
    );
};

export default PullRequestDetailsPage;
