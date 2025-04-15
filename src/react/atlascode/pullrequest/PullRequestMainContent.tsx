import { Box, Grid } from '@material-ui/core';
import React from 'react';

import { User } from '../../../bitbucket/model';
import { BasicPanel } from '../common/BasicPanel';
import CommentForm from '../common/CommentForm';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { Commits } from './Commits';
import { DiffList } from './DiffList';
import { NestedCommentList } from './NestedCommentList';
import { PullRequestDetailsControllerApi, PullRequestDetailsState } from './pullRequestDetailsController';
import { RelatedJiraIssues } from './RelatedJiraIssues';
import { SummaryPanel } from './SummaryPanel';

interface PullRequestMainContentProps {
    state: PullRequestDetailsState;
    controller: PullRequestDetailsControllerApi;
    handleFetchUsers: (input: string, abortSignal?: AbortSignal) => Promise<User[]>;
}

export const PullRequestMainContent: React.FC<PullRequestMainContentProps> = ({
    state,
    controller,
    handleFetchUsers,
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
