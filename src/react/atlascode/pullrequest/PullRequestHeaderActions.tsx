import ButtonGroup from '@atlaskit/button/button-group';
import React, { useEffect, useState } from 'react';
import { ApprovalStatus } from 'src/bitbucket/model';

import { ApproveButton } from './ApproveButton';
import { MergeDialog } from './MergeDialog';
import { PullRequestDetailsControllerApi, PullRequestDetailsState } from './pullRequestDetailsController';
import { RequestChangesButton } from './RequestChangesButton';

type PullRequestHeaderActionsProps = {
    state: PullRequestDetailsState;
    controller: PullRequestDetailsControllerApi;
    isCurrentUserAuthor: boolean;
    isDraftPr: boolean;
    notMerged: boolean;
};

export function PullRequestHeaderActions({
    controller,
    state,
    isCurrentUserAuthor,
    isDraftPr,
    notMerged,
}: PullRequestHeaderActionsProps) {
    const canShowApprove = !isCurrentUserAuthor || state.pr.site.details.isCloud;
    const canShowRequestChanges = !isCurrentUserAuthor;
    const canShowMerge = !isDraftPr && notMerged;

    const [currentUserApprovalStatus, setCurrentUserApprovalStatus] = useState<ApprovalStatus>('UNAPPROVED');

    useEffect(() => {
        const foundCurrentUser = state.pr.data.participants.find(
            (participant) => participant.accountId === state.currentUser.accountId,
        );
        if (foundCurrentUser) {
            setCurrentUserApprovalStatus(foundCurrentUser.status);
        }
    }, [state.pr.data.participants, state.currentUser.accountId]);

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
