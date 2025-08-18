import { Autocomplete, Grid, TextField, Typography } from '@mui/material';
import React from 'react';

import { RepoData } from '../../../../../lib/ipc/toUI/startWork';
import { Branch } from '../../../../../typings/git';
import { getAllBranches } from '../utils/branchUtils';

interface SourceBranchSelectorProps {
    selectedRepository: RepoData | undefined;
    sourceBranch: Branch;
    onSourceBranchChange: (branch: Branch) => void;
}

export const SourceBranchSelector: React.FC<SourceBranchSelectorProps> = ({
    selectedRepository,
    sourceBranch,
    onSourceBranchChange,
}) => {
    const allBranches = getAllBranches(selectedRepository || undefined);

    const handleSourceBranchChange = (event: React.ChangeEvent<{}>, value: Branch | null) => {
        if (value) {
            onSourceBranchChange(value);
        }
    };

    return (
        <Grid item>
            <Typography variant="body2">Source branch</Typography>
            <Autocomplete
                options={allBranches}
                getOptionLabel={(option) => option.name || ''}
                value={sourceBranch}
                onChange={handleSourceBranchChange}
                renderInput={(params) => <TextField {...params} size="small" variant="outlined" />}
                size="small"
                disableClearable
            />
        </Grid>
    );
};
