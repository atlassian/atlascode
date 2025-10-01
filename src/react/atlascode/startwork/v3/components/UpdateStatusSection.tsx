import Lozenge from '@atlaskit/lozenge';
import { emptyTransition, Transition } from '@atlassianlabs/jira-pi-common-models';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import { Box, Checkbox, FormControlLabel, Grid, MenuItem, TextField, Typography } from '@mui/material';
import React, { useCallback, useEffect } from 'react';

import { colorToLozengeAppearanceMap } from '../../../../vscode/theme/colors';
import { UpdateStatusSectionProps } from '../types';

export const UpdateStatusSection: React.FC<UpdateStatusSectionProps> = ({
    state,
    controller,
    formState,
    formActions,
}) => {
    const { transitionIssueEnabled, selectedTransition } = formState;
    const { onTransitionIssueEnabledChange, onSelectedTransitionChange } = formActions;

    const availableTransitions = state.issue.transitions.filter(
        (transition) => transition.to.id !== state.issue.status.id,
    );

    const isValidSelectedTransition = availableTransitions.some((t) => t.id === selectedTransition.id);

    useEffect(() => {
        if (availableTransitions.length === 0) {
            return;
        }

        if (!isValidSelectedTransition) {
            // Use the same logic as the previous version of the start work page:
            // 1. Try to find a transition with "progress" in the name (covers most cases)
            // 2. Fallback to first non-initial transition (works for any workflow)
            // 3. Fallback to first available transition (guarantees something is selected)
            // 4. Final fallback to emptyTransition
            const inProgressTransitionGuess: Transition =
                availableTransitions.find((t) => !t.isInitial && t.to.name.toLowerCase().includes('progress')) ||
                availableTransitions.find((t) => !t.isInitial) ||
                availableTransitions[0] ||
                emptyTransition;

            onSelectedTransitionChange(inProgressTransitionGuess);
        }
    }, [availableTransitions, isValidSelectedTransition, onSelectedTransitionChange]);

    const handleTransitionChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        const transitionId = event.target.value as string;
        const transition = state.issue.transitions.find((t) => t.id === transitionId);
        if (transition) {
            onSelectedTransitionChange(transition);
        }
    };

    const toggleTransitionIssueEnabled = useCallback(() => {
        onTransitionIssueEnabledChange(!transitionIssueEnabled);
    }, [transitionIssueEnabled, onTransitionIssueEnabledChange]);

    return (
        <Box
            border={1}
            borderRadius="3px"
            borderColor="var(--vscode-list-inactiveSelectionBackground)"
            padding={3}
            marginBottom={2}
        >
            <FormControlLabel
                control={<Checkbox checked={transitionIssueEnabled} onChange={toggleTransitionIssueEnabled} />}
                label={
                    <Typography variant="h5" style={{ fontWeight: 700 }}>
                        Update work item status
                    </Typography>
                }
            />

            {transitionIssueEnabled && (
                <Grid container alignItems="center" justifyContent="flex-start" spacing={1}>
                    <Grid item>
                        <Lozenge appearance={colorToLozengeAppearanceMap[state.issue.status.statusCategory.colorName]}>
                            {state.issue.status.name}
                        </Lozenge>
                    </Grid>
                    <Box display="flex" alignItems="center">
                        <ArrowRightAltIcon />
                    </Box>
                    <Grid item>
                        <Box minWidth={150}>
                            <TextField
                                select
                                size="small"
                                value={selectedTransition.id}
                                onChange={handleTransitionChange}
                                variant="outlined"
                            >
                                {availableTransitions.map((transition) => {
                                    return (
                                        <MenuItem key={transition.id} value={transition.id}>
                                            <Lozenge
                                                appearance={
                                                    colorToLozengeAppearanceMap[transition.to.statusCategory.colorName]
                                                }
                                            >
                                                {transition.to.name}
                                            </Lozenge>
                                        </MenuItem>
                                    );
                                })}
                            </TextField>
                        </Box>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
};
