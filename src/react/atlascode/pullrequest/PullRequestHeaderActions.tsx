import { RefreshButton } from '@atlassianlabs/guipi-core-components';
import { Box } from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';

import { ApprovalStatus } from '../../../bitbucket/model';
import { CopyLinkButton } from '../common/CopyLinkButton';
import { ApproveButton } from './ApproveButton';
import { MergeDialog } from './MergeDialog';
import { PullRequestDetailsControllerApi } from './pullRequestDetailsController';
import { PullRequestDetailsState } from './pullRequestDetailsController';
import { RequestChangesButton } from './RequestChangesButton';

export interface PullRequestHeaderActionsProps {
    state: PullRequestDetailsState;
    controller: PullRequestDetailsControllerApi;
}

export const PullRequestHeaderActions: React.FC<PullRequestHeaderActionsProps> = ({ state, controller }) => {
    const [currentUserApprovalStatus, setCurrentUserApprovalStatus] = useState<ApprovalStatus>('UNAPPROVED');

    useEffect(() => {
        const foundCurrentUser = state.pr.data.participants.find(
            (participant) => participant.accountId === state.currentUser.accountId,
        );
        if (foundCurrentUser) {
            setCurrentUserApprovalStatus(foundCurrentUser.status);
        }
    }, [state.pr.data.participants, state.currentUser.accountId]);

    const isSomethingLoading = useMemo(() => {
        return Object.entries(state.loadState).some(
            (entry) => entry[1] /* Second index is the value in the key/value pair */,
        );
    }, [state.loadState]);

    return (
        <>
            <CopyLinkButton tooltip="Copy link to pull request" url={state.pr.data.url} onClick={controller.copyLink} />
            <Box marginLeft={1} hidden={state.loadState.basicData}>
                <RequestChangesButton
                    hidden={
                        !state.pr.site.details.isCloud && state.currentUser.accountId === state.pr.data.author.accountId
                    }
                    status={currentUserApprovalStatus}
                    onApprove={controller.updateApprovalStatus}
                />
            </Box>
            <Box marginLeft={1} hidden={state.loadState.basicData}>
                <ApproveButton
                    hidden={
                        !state.pr.site.details.isCloud && state.currentUser.accountId === state.pr.data.author.accountId
                    }
                    status={currentUserApprovalStatus}
                    onApprove={controller.updateApprovalStatus}
                />
            </Box>
            <Box marginLeft={1} hidden={state.loadState.basicData}>
                <MergeDialog
                    prData={state.pr.data}
                    commits={state.commits}
                    relatedJiraIssues={state.relatedJiraIssues}
                    mergeStrategies={state.mergeStrategies}
                    loadState={{
                        basicData: state.loadState.basicData,
                        commits: state.loadState.commits,
                        mergeStrategies: state.loadState.mergeStrategies,
                        relatedJiraIssues: state.loadState.relatedJiraIssues,
                    }}
                    merge={controller.merge}
                />
            </Box>
            <RefreshButton loading={isSomethingLoading} onClick={controller.refresh} />
        </>
    );
};
