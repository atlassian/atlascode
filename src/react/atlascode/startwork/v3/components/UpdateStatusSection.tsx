import Lozenge from '@atlaskit/lozenge';
import { emptyTransition, Transition } from '@atlassianlabs/jira-pi-common-models';
import { Box, Checkbox, FormControlLabel, Grid, MenuItem, TextField, Typography } from '@material-ui/core';
import ArrowRightAltIcon from '@material-ui/icons/ArrowRightAlt';
import React, { useEffect, useState } from 'react';

import { colorToLozengeAppearanceMap } from '../../../../vscode/theme/colors';
import { UpdateStatusSectionProps } from '../types';

export const UpdateStatusSection: React.FC<UpdateStatusSectionProps> = ({ state, controller }) => {
    const [selectedTransition, setSelectedTransition] = useState<Transition>(emptyTransition);

    useEffect(() => {
        const inProgressTransitionGuess: Transition =
            state.issue.transitions.find((t) => !t.isInitial && t.to.name.toLocaleLowerCase().includes('progress')) ||
            state.issue.transitions.find((t) => !t.isInitial) ||
            state.issue.transitions?.[0] ||
            emptyTransition;
        setSelectedTransition(inProgressTransitionGuess);
    }, [state.issue]);

    const handleTransitionChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        const transitionId = event.target.value as string;
        const transition = state.issue.transitions.find((t) => t.id === transitionId);
        if (transition) {
            setSelectedTransition(transition);
        }
    };

    return (
        <Box
            border={1}
            borderRadius={3}
            borderColor="var(--vscode-list-inactiveSelectionBackground)"
            padding={3}
            marginBottom={2}
        >
            <FormControlLabel
                control={<Checkbox defaultChecked />}
                label={
                    <Typography variant="h5" style={{ fontWeight: 700 }}>
                        Update work item status
                    </Typography>
                }
            />

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
                            {state.issue.transitions
                                .filter((transition) => transition.to.id !== state.issue.status.id)
                                .map((transition) => {
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
        </Box>
    );
};
