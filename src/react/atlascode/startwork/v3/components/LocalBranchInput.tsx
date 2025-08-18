import { Grid, TextField, Typography } from '@mui/material';
import React, { useCallback } from 'react';

interface LocalBranchInputProps {
    localBranch: string;
    onLocalBranchChange: (branch: string) => void;
}

export const LocalBranchInput: React.FC<LocalBranchInputProps> = ({ localBranch, onLocalBranchChange }) => {
    const handleLocalBranchChange = useCallback(
        (event: React.ChangeEvent<{ name?: string | undefined; value: string }>) => {
            // spaces are not allowed in branch names
            event.target.value = event.target.value.replace(/ /g, '-');
            onLocalBranchChange(event.target.value);
        },
        [onLocalBranchChange],
    );

    return (
        <Grid item>
            <Typography variant="body2">New local branch</Typography>
            <TextField
                size="small"
                value={localBranch}
                variant="outlined"
                onChange={handleLocalBranchChange}
                sx={{ width: '50%' }}
            />
        </Grid>
    );
};
