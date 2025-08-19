import { Autocomplete, Grid, TextField, Typography } from '@mui/material';
import React, { useCallback } from 'react';

import { RepoData } from '../../../../../lib/ipc/toUI/startWork';

interface BranchPrefixSelectorProps {
    selectedRepository: RepoData | undefined;
    selectedBranchType: { kind: string; prefix: string };
    customPrefixes: string[];
    onBranchTypeChange: (branchType: { kind: string; prefix: string }) => void;
}

export const BranchPrefixSelector: React.FC<BranchPrefixSelectorProps> = ({
    selectedRepository,
    selectedBranchType,
    customPrefixes,
    onBranchTypeChange,
}) => {
    // Convert custom prefixes to branch types format
    const convertedCustomPrefixes = customPrefixes.map((prefix) => {
        const normalizedCustomPrefix = prefix.endsWith('/') ? prefix : prefix + '/';
        return { prefix: normalizedCustomPrefix, kind: prefix };
    });

    const handleBranchTypeChange = useCallback(
        (event: React.ChangeEvent<{}>, value: { kind: string; prefix: string } | null) => {
            if (value) {
                onBranchTypeChange(value);
            }
        },
        [onBranchTypeChange],
    );

    const hasOptions = (selectedRepository?.branchTypes?.length || 0) > 0 || convertedCustomPrefixes.length > 0;

    if (!hasOptions) {
        return null;
    }

    return (
        <Grid item xs={6}>
            <Typography variant="body2">Branch prefix</Typography>
            <Autocomplete
                options={[...(selectedRepository?.branchTypes || []), ...convertedCustomPrefixes]}
                groupBy={(option) =>
                    (selectedRepository?.branchTypes || []).map((type) => type.kind).includes(option.kind)
                        ? 'Repo Branch Type'
                        : 'Custom Prefix'
                }
                getOptionLabel={(option) => option.kind}
                renderInput={(params) => <TextField {...params} size="small" variant="outlined" />}
                size="small"
                disableClearable
                value={selectedBranchType}
                onChange={handleBranchTypeChange}
            />
        </Grid>
    );
};
