import { AppBar, Box, Link, Toolbar, Typography } from '@material-ui/core';
import React from 'react';

import { PullRequestDetailsControllerApi, PullRequestDetailsState } from './pullRequestDetailsController';
import { PullRequestHeaderActions } from './PullRequestHeaderActions';

interface PullRequestHeaderProps {
    state: PullRequestDetailsState;
    controller: PullRequestDetailsControllerApi;
}

export const PullRequestHeader: React.FC<PullRequestHeaderProps> = ({ state, controller }) => {
    return (
        <AppBar position="relative">
            <Toolbar>
                <Box flexGrow={1}>
                    <Typography variant={'h3'}>
                        <Link color="textPrimary" href={state.pr.data.url}>
                            {`${state.pr.data.destination!.repo.displayName}: Pull request #${state.pr.data.id}`}
                        </Link>
                    </Typography>
                </Box>
                <PullRequestHeaderActions state={state} controller={controller} />
            </Toolbar>
        </AppBar>
    );
};
