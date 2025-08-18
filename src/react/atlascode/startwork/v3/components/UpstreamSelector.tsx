import { Grid, MenuItem, TextField, Typography } from '@mui/material';
import React from 'react';

import { RepoData } from '../../../../../lib/ipc/toUI/startWork';

interface UpstreamSelectorProps {
    selectedRepository: RepoData | undefined;
    upstream: string;
    onUpstreamChange: (upstream: string) => void;
}

export const UpstreamSelector: React.FC<UpstreamSelectorProps> = ({
    selectedRepository,
    upstream,
    onUpstreamChange,
}) => {
    const handleUpstreamChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        onUpstreamChange(event.target.value as string);
    };

    if (!selectedRepository || selectedRepository.workspaceRepo.siteRemotes.length <= 1) {
        return null;
    }

    return (
        <Grid item xs={6}>
            <Typography variant="body2">Set upstream to</Typography>
            <TextField
                select
                size="small"
                value={upstream}
                onChange={handleUpstreamChange}
                variant="outlined"
                sx={{ width: '50%' }}
            >
                {selectedRepository.workspaceRepo.siteRemotes.map((item) => (
                    <MenuItem key={item.remote.name} value={item.remote.name}>
                        {item.remote.name}
                    </MenuItem>
                ))}
            </TextField>
        </Grid>
    );
};
