import { Box, Container, Grid, makeStyles, Paper, Theme, Divider, useMediaQuery, useTheme } from '@material-ui/core';
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import React, { useMemo } from 'react';
import { User } from '../../../bitbucket/model';
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
import EmptyState from '@atlaskit/empty-state';

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
        backgroundColor: 'transparent',
        boxShadow: 'none',
        border: 'none',
    },
    paperOverflow: {
        overflow: 'hidden',
        backgroundColor: 'transparent',
        boxShadow: 'none',
        border: 'none',
    },
    verticalDivider: {
        height: '100%',
        marginLeft: theme.spacing(1),
        marginRight: theme.spacing(1),
        display: 'none',
        [theme.breakpoints.up('md')]: {
            display: 'block',
        },
    },
}));

interface PullRequestMainContentProps {
    state: PullRequestDetailsState;
    controller: PullRequestDetailsControllerApi;
    handleFetchUsers: (input: string, abortSignal?: AbortSignal) => Promise<User[]>;
}

const PullRequestMainContent: React.FC<PullRequestMainContentProps> = ({ state, controller, handleFetchUsers }) => {
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
                {state.relatedJiraIssues.length > 0 && (
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
                )}
                {state.relatedBitbucketIssues.length > 0 && (
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
                )}
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

export const PullRequestDetailsPage: React.FunctionComponent = () => {
    const [state, controller] = usePullRequestDetailsController();

    return (
        <PullRequestDetailsControllerContext.Provider value={controller}>
            <AtlascodeErrorBoundary
                context={{ view: AnalyticsView.PullRequestPage }}
                postMessageFunc={controller.postMessage}
            >
                <Container maxWidth="xl">
                    {state.loadState.basicData ? (
                        <EmptyState header="Loading..." headingLevel={3} />
                    ) : (
                        <PullRequestDetailsPageContent state={state} controller={controller} />
                    )}
                </Container>
            </AtlascodeErrorBoundary>
        </PullRequestDetailsControllerContext.Provider>
    );
};

interface PullRequestDetailsPageContentProps {
    state: PullRequestDetailsState;
    controller: PullRequestDetailsControllerApi;
}
function PullRequestDetailsPageContent({ state, controller }: PullRequestDetailsPageContentProps) {
    const classes = useStyles();
    const theme = useTheme();
    const isWideScreen = useMediaQuery(theme.breakpoints.up('md'));
    const handleFetchUsers = AwesomeDebouncePromise(
        async (input: string, abortSignal?: AbortSignal): Promise<User[]> => {
            return await controller.fetchUsers(state.pr.site, input, abortSignal);
        },
        300,
        { leading: false },
    );
    return (
        <>
            <PullRequestHeader state={state} controller={controller} />
            <Divider />
            <Box marginTop={1} />
            <Grid container spacing={1} direction="row">
                <Grid item xs={12} md={9} lg={9} xl={9}>
                    <Paper className={classes.paper100}>
                        <PullRequestMainContent
                            state={state}
                            controller={controller}
                            handleFetchUsers={handleFetchUsers}
                        />
                    </Paper>
                </Grid>
                <Grid
                    item
                    xs={12}
                    md={3}
                    lg={3}
                    xl={3}
                    style={{ borderLeft: isWideScreen ? '1px solid var(--vscode-input-border)' : 'none' }}
                >
                    <Paper className={classes.paperOverflow}>
                        <PullRequestSidebar state={state} controller={controller} />
                    </Paper>
                </Grid>
            </Grid>
        </>
    );
}
export default PullRequestDetailsPage;
