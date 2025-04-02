import React from 'react';
import { ApproveButton } from './ApproveButton';
import { ApprovalStatus } from 'src/bitbucket/model';
import { PullRequestDetailsControllerApi, PullRequestDetailsState } from './pullRequestDetailsController';
import { MergeDialog } from './MergeDialog';
import ButtonGroup from '@atlaskit/button/button-group';
import { RequestChangesButton } from './RequestChangesButton';

type PullRequestHeaderActionsProps = {
    state: PullRequestDetailsState;
    controller: PullRequestDetailsControllerApi;
    currentUserApprovalStatus: ApprovalStatus;
    isCurrentUserAuthor: boolean;
    isDraftPr: boolean;
    notMerged: boolean;
};

export function PullRequestHeaderActions({
    controller,
    state,
    currentUserApprovalStatus,
    isCurrentUserAuthor,
    isDraftPr,
    notMerged,
}: PullRequestHeaderActionsProps) {
    const canShowApprove = !isCurrentUserAuthor || state.pr.site.details.isCloud;
    const canShowRequestChanges = !isCurrentUserAuthor;
    const canShowMerge = !isDraftPr && notMerged;

    return (
        <ButtonGroup>
            {canShowRequestChanges && (
                <RequestChangesButton
                    status={currentUserApprovalStatus}
                    onApprove={controller.updateApprovalStatus}
                    isDisabled={!notMerged}
                />
            )}
            {canShowApprove && (
                <ApproveButton
                    status={currentUserApprovalStatus}
                    onApprove={controller.updateApprovalStatus}
                    isDisabled={!notMerged}
                />
            )}
            {canShowMerge && (
                <MergeDialog
                    prData={state.pr.data}
                    commits={state.commits}
                    relatedJiraIssues={state.relatedJiraIssues}
                    relatedBitbucketIssues={state.relatedBitbucketIssues}
                    mergeStrategies={state.mergeStrategies}
                    loadState={{
                        basicData: state.loadState.basicData,
                        commits: state.loadState.commits,
                        mergeStrategies: state.loadState.mergeStrategies,
                        relatedJiraIssues: state.loadState.relatedJiraIssues,
                        relatedBitbucketIssues: state.loadState.relatedBitbucketIssues,
                    }}
                    merge={controller.merge}
                />
            )}
        </ButtonGroup>
    );
}
