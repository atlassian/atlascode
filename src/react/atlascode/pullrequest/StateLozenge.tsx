import Lozenge from '@atlaskit/lozenge';
import React from 'react';

const pullRequestStateAppearance: {
    [k: string]: React.ComponentProps<typeof Lozenge>['appearance'];
} = {
    OPEN: 'inprogress',
    MERGED: 'success',
    DECLINED: 'removed',
    SUPERSEDED: 'moved',
    DRAFT: 'default',
    default: 'default',
};

export type PullRequestState = 'OPEN' | 'MERGED' | 'DECLINED' | 'SUPERSEDED' | 'DRAFT';

type StateLozengeProps = {
    pullRequestState: PullRequestState;
    isDraftPr: boolean;
};

const pullRequestStateLabel = (props: StateLozengeProps) => {
    const { pullRequestState, isDraftPr } = props;

    // if it is a draft pull request, return the draft state.
    // `pullRequestState` should be `open` for draft pull requests.
    if (isDraftPr) {
        return 'DRAFT';
    }

    switch (pullRequestState) {
        case 'MERGED':
            return 'MERGED';
        case 'DECLINED':
            return 'DECLINED';
        case 'OPEN':
            return 'OPEN';
        default:
            return pullRequestState;
    }
};

function StateLozenge(props: StateLozengeProps) {
    const { pullRequestState, isDraftPr } = props;
    // make draft PRs the default appearance for now, pending design review.
    const appearance = isDraftPr ? 'default' : pullRequestStateAppearance[pullRequestState];
    return (
        <Lozenge isBold appearance={appearance}>
            {pullRequestStateLabel(props)}
        </Lozenge>
    );
}

export default StateLozenge;
