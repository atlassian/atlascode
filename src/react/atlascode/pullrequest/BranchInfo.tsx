import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import { Chip, CircularProgress, Grid, Tooltip } from '@mui/material';
import * as React from 'react';

import { Repo, User } from '../../../bitbucket/model';

type BranchInfoProps = {
    source: { repo: Repo; branchName: string; commitHash: string };
    destination: { repo: Repo; branchName: string; commitHash: string };
    author: User;
    isLoading?: boolean;
};

export const BranchInfo: React.FunctionComponent<BranchInfoProps> = ({ source, destination, author, isLoading }) => {
    let sourcePrefix = '';
    let destinationPrefix = '';
    if (source.repo.url !== destination.repo.url) {
        sourcePrefix = source.repo.fullName + ':';
        destinationPrefix = destination.repo.fullName + ':';
    }

    const sourceBranch = sourcePrefix + source.branchName;
    const targetBranch = destinationPrefix + destination.branchName;

    return isLoading ? (
        <CircularProgress />
    ) : (
        <Grid container spacing={1} direction={'row'} justifyContent="flex-start" alignItems="center" wrap={'wrap'}>
            <Grid item>
                <Tooltip title={sourceBranch}>
                    <Chip clickable color="primary" label={sourceBranch} size={'small'} />
                </Tooltip>
            </Grid>

            <Grid item>
                <ArrowRightAltIcon />
            </Grid>

            <Grid item>
                <Tooltip title={targetBranch}>
                    <Chip clickable color="primary" label={targetBranch} size={'small'} />
                </Tooltip>
            </Grid>
        </Grid>
    );
};
