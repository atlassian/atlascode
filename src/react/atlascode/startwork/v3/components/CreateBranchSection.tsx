import {
    Box,
    Checkbox,
    FormControlLabel,
    Grid,
    IconButton,
    makeStyles,
    TextField,
    Theme,
    Typography,
} from '@material-ui/core';
import SettingsIcon from '@material-ui/icons/Settings';
import { Autocomplete } from '@material-ui/lab';
import React, { useContext } from 'react';

import { VSCodeStyles, VSCodeStylesContext } from '../../../../vscode/theme/styles';
import { CreateBranchSectionProps } from '../types';

const useStyles = makeStyles((theme: Theme) => ({
    settingsButton: (props: VSCodeStyles) => ({
        '& .MuiSvgIcon-root': {
            fill: 'none',
            stroke: props.descriptionForeground,
            strokeWidth: 1.5,
        },
    }),
}));

export const CreateBranchSection: React.FC<CreateBranchSectionProps> = ({ state, controller }) => {
    const vscStyles = useContext(VSCodeStylesContext);
    const classes = useStyles(vscStyles);

    return (
        <Box
            border={1}
            borderRadius={3}
            borderColor="var(--vscode-list-inactiveSelectionBackground)"
            padding={3}
            marginBottom={2}
        >
            <Box marginBottom={2}>
                <Typography variant="h5" style={{ fontWeight: 700 }}>
                    Create branch
                </Typography>
            </Box>

            <Grid container spacing={2} direction="column">
                <Grid item>
                    <Typography variant="body2">New local branch</Typography>
                    <Grid container spacing={1} alignItems="center">
                        <Grid item xs>
                            <TextField
                                fullWidth
                                size="small"
                                value="ALT-1156-bb-pr-creation-integration-is-cool-yeah-lets-go"
                                variant="outlined"
                            />
                        </Grid>
                        <Grid item>
                            <IconButton size="small" color="default" className={classes.settingsButton}>
                                <SettingsIcon fontSize="small" />
                            </IconButton>
                        </Grid>
                    </Grid>
                </Grid>

                <Grid item xs={9}>
                    <Typography variant="body2">Source branch</Typography>
                    <Autocomplete
                        options={[
                            'bb-pr-creation-integration-is-cool-yeah-yeah-lets-go',
                            'main',
                            'develop',
                            'feature/new-branch',
                        ]}
                        value="bb-pr-creation-integration-is-cool-yeah-lets-go"
                        renderInput={(params) => <TextField {...params} size="small" variant="outlined" fullWidth />}
                        size="small"
                    />
                </Grid>

                <Grid item>
                    <FormControlLabel control={<Checkbox defaultChecked />} label="Push the new branch to remote" />
                </Grid>
            </Grid>
        </Box>
    );
};
