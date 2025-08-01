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
import Mustache from 'mustache';
import React, { useCallback, useContext, useEffect, useState } from 'react';

import { ConfigSection, ConfigSubSection } from '../../../../../lib/ipc/models/config';
import { VSCodeStyles, VSCodeStylesContext } from '../../../../vscode/theme/styles';
import { CreateBranchSectionProps } from '../types';
import { getAllBranches, getDefaultSourceBranch } from '../utils/branchUtils';

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

    const repoData = state.repoData[0];
    const allBranches = getAllBranches(repoData);
    const defaultSourceBranch = getDefaultSourceBranch(repoData);

    // State for selected branch
    const [selectedBranch, setSelectedBranch] = useState(defaultSourceBranch);
    const [localBranch, setLocalBranch] = useState('');

    // Update selected branch when default changes
    useEffect(() => {
        setSelectedBranch(defaultSourceBranch);
    }, [defaultSourceBranch]);

    // Build branch name function
    const buildBranchName = useCallback(
        (repo: any, branchType: any) => {
            const usernameBase = repo.userEmail
                ? repo.userEmail
                      .split('@')[0]
                      .normalize('NFD') // Convert accented characters to two characters where the accent is separated out
                      .replace(/[\u0300-\u036f]/g, '') // Remove the separated accent marks
                : 'username';
            const prefixBase = branchType.prefix.replace(/ /g, '-');
            const summaryBase = state.issue.summary
                .substring(0, 50)
                .trim()
                .normalize('NFD') // Convert accented characters to two characters where the accent is separated out
                .replace(/[\u0300-\u036f]/g, '') // Remove the separated accent marks
                .replace(/\W+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');

            const view = {
                username: usernameBase.toLowerCase(),
                UserName: usernameBase,
                USERNAME: usernameBase.toUpperCase(),
                prefix: prefixBase.toLowerCase(),
                Prefix: prefixBase,
                PREFIX: prefixBase.toUpperCase(),
                issuekey: state.issue.key.toLowerCase(),
                IssueKey: state.issue.key,
                issueKey: state.issue.key,
                ISSUEKEY: state.issue.key.toUpperCase(),
                summary: summaryBase.toLowerCase(),
                Summary: summaryBase,
                SUMMARY: summaryBase.toUpperCase(),
            };

            try {
                const generatedBranchTitle = Mustache.render(state.customTemplate, view);
                setLocalBranch(generatedBranchTitle);
            } catch {
                setLocalBranch('Invalid template: please follow the format described above');
            }
        },
        [state.issue.key, state.issue.summary, state.customTemplate],
    );

    // Initialize branch name when component mounts
    useEffect(() => {
        if (repoData && repoData.branchTypes && repoData.branchTypes.length > 0) {
            buildBranchName(repoData, repoData.branchTypes[0]);
        }
    }, [repoData, buildBranchName]);

    const handleSourceBranchChange = (event: React.ChangeEvent<{}>, value: string | null) => {
        setSelectedBranch(value || '');
    };

    const handleLocalBranchChange = useCallback(
        (event: React.ChangeEvent<{ name?: string | undefined; value: string }>) => {
            // spaces are not allowed in branch names
            event.target.value = event.target.value.replace(/ /g, '-');
            setLocalBranch(event.target.value);
        },
        [setLocalBranch],
    );

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
                                value={localBranch}
                                variant="outlined"
                                onChange={handleLocalBranchChange}
                            />
                        </Grid>
                        <Grid item>
                            <IconButton
                                size="small"
                                color="default"
                                className={classes.settingsButton}
                                onClick={() => controller.openSettings(ConfigSection.Jira, ConfigSubSection.StartWork)}
                            >
                                <SettingsIcon fontSize="small" />
                            </IconButton>
                        </Grid>
                    </Grid>
                </Grid>

                <Grid item xs={9}>
                    <Typography variant="body2">Source branch</Typography>
                    <Autocomplete
                        options={allBranches.map((branch) => branch.name || '')}
                        value={selectedBranch}
                        onChange={handleSourceBranchChange}
                        renderInput={(params) => <TextField {...params} size="small" variant="outlined" fullWidth />}
                        size="small"
                        disableClearable
                    />
                </Grid>

                <Grid item>
                    <FormControlLabel control={<Checkbox defaultChecked />} label="Push the new branch to remote" />
                </Grid>
            </Grid>
        </Box>
    );
};
