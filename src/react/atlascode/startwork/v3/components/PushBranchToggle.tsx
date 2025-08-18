import { Checkbox, FormControlLabel, Grid } from '@mui/material';
import React, { useCallback } from 'react';

interface PushBranchToggleProps {
    pushBranchEnabled: boolean;
    onPushBranchChange: (enabled: boolean) => void;
}

export const PushBranchToggle: React.FC<PushBranchToggleProps> = ({ pushBranchEnabled, onPushBranchChange }) => {
    const togglePushBranchEnabled = useCallback(() => {
        onPushBranchChange(!pushBranchEnabled);
    }, [pushBranchEnabled, onPushBranchChange]);

    return (
        <Grid item>
            <FormControlLabel
                control={<Checkbox checked={pushBranchEnabled} onChange={togglePushBranchEnabled} />}
                label="Push the new branch to remote"
            />
        </Grid>
    );
};
