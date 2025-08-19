import { Grid, MenuItem, TextField, Typography } from '@mui/material';
import React, { useCallback } from 'react';

import { RepoData } from '../../../../../lib/ipc/toUI/startWork';

interface RepositorySelectorProps {
    repoData: RepoData[];
    selectedRepository: RepoData | undefined;
    onRepositoryChange: (repository: RepoData) => void;
}

export const RepositorySelector: React.FC<RepositorySelectorProps> = ({
    repoData,
    selectedRepository,
    onRepositoryChange,
}) => {
    const handleRepositoryChange = useCallback(
        (event: React.ChangeEvent<{ name?: string | undefined; value: any }>) => {
            const selectedRepo = repoData.find((repo) => repo.workspaceRepo.rootUri === event.target.value);
            if (selectedRepo) {
                onRepositoryChange(selectedRepo);
            }
        },
        [onRepositoryChange, repoData],
    );

    if (repoData.length <= 1) {
        return null;
    }

    return (
        <Grid item>
            <Typography variant="body2">Repository</Typography>
            <TextField
                select
                size="small"
                variant="outlined"
                value={selectedRepository?.workspaceRepo.rootUri || ''}
                onChange={handleRepositoryChange}
            >
                {repoData.map((item) => (
                    <MenuItem key={item.workspaceRepo.rootUri} value={item.workspaceRepo.rootUri}>
                        {item.workspaceRepo.rootUri.substring(item.workspaceRepo.rootUri.lastIndexOf('/') + 1)}
                    </MenuItem>
                ))}
            </TextField>
        </Grid>
    );
};
