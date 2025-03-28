import React from 'react';
import Button from '@atlaskit/button';
import { PullRequestDetailsControllerApi } from './pullRequestDetailsController';
import { PullRequestDetailsState } from './pullRequestDetailsController';

type SourceCheckoutButtonProps = {
    state: PullRequestDetailsState;
    controller: PullRequestDetailsControllerApi;
};

export function SourceCheckoutButton({ state, controller }: SourceCheckoutButtonProps) {
    const isDisabled = state.pr.data.source.branchName === state.currentBranchName || state.isCheckingOutBranch;
    return (
        <Button isDisabled={isDisabled} onClick={controller.checkoutBranch}>
            {state.pr.data.source.branchName === state.currentBranchName
                ? 'Source branch checked out'
                : state.isCheckingOutBranch
                  ? 'Checking out...'
                  : 'Checkout source branch'}
        </Button>
    );
}
