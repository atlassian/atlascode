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
        <Grid item data-testid="start-work.push-branch-checkbox">
            <FormControlLabel
                control={<Checkbox checked={pushBranchEnabled} onChange={togglePushBranchEnabled} />}
                label="Push the new branch to remote"
            />
        </Grid>
    );
};
