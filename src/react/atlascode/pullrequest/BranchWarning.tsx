import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Box, Card, CardContent, Collapse, Grid, Theme, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import React, { useEffect, useState } from 'react';

import { Branch } from '../../../typings/git';

const useStyles = makeStyles((theme: Theme) => ({
    warningCard: {
        color: theme.palette.info.contrastText,
        backgroundColor: theme.palette.info.main,
    },
}));

const emptyBranch: Branch = { type: 0, name: '' };

type BranchWarningProps = {
    sourceBranch: Branch;
    sourceRemoteName: string;
    remoteBranches: Branch[];
    hasLocalChanges: boolean;
};

export const BranchWarning: React.FunctionComponent<BranchWarningProps> = (props: BranchWarningProps) => {
    const classes = useStyles();

    const [upstreamSourceBranchName, setUpstreamSourceBranchName] = useState('');
    const [remoteBranch, setRemoteBranch] = useState<Branch | undefined>(emptyBranch);

    useEffect(() => {
        setRemoteBranch(emptyBranch);
        const sourceRemoteBranch =
            props.sourceBranch.upstream && props.sourceBranch.upstream.remote === props.sourceRemoteName
                ? `${props.sourceRemoteName}/${props.sourceBranch.upstream.name}`
                : `${props.sourceRemoteName}/${props.sourceBranch.name}`;

        setUpstreamSourceBranchName(sourceRemoteBranch);
        setRemoteBranch(props.remoteBranches.find((rb) => sourceRemoteBranch === rb.name));
    }, [props.remoteBranches, props.sourceBranch, props.sourceRemoteName]);

    return (
        <Collapse
            in={
                props.sourceBranch.name !== undefined &&
                props.sourceBranch.name.length > 0 &&
                remoteBranch !== emptyBranch
            }
        >
            <Grid container spacing={1}>
                <Grid item>
                    <Collapse in={props.hasLocalChanges}>
                        <Card>
                            <CardContent className={classes.warningCard}>
                                <Grid container spacing={1}>
                                    <Grid item>
                                        <HelpOutlineIcon />
                                    </Grid>
                                    <Grid item>
                                        <Typography>
                                            <Box fontWeight="fontWeightBold" component="span">
                                                There are uncommitted changes for this repo
                                            </Box>
                                        </Typography>
                                        <Typography variant="subtitle2">
                                            Ensure the changes that need to be included are committed before creating
                                            the pull request.
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Collapse>
                </Grid>
                <Grid item>
                    <Collapse in={remoteBranch === undefined}>
                        <Card>
                            <CardContent className={classes.warningCard}>
                                <Grid container spacing={1}>
                                    <Grid item>
                                        <HelpOutlineIcon />
                                    </Grid>
                                    <Grid item>
                                        <Typography>
                                            <Box fontWeight="fontWeightBold" component="span">
                                                Upstream branch ({upstreamSourceBranchName}) not found
                                            </Box>
                                        </Typography>
                                        <Typography variant="subtitle2">
                                            Ensure that the switch above is enabled to push the local changes to remote
                                            while creating the pull request.
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Collapse>
                </Grid>
                <Grid item>
                    <Collapse in={remoteBranch && props.sourceBranch.commit !== remoteBranch.commit}>
                        <Card>
                            <CardContent className={classes.warningCard}>
                                <Grid container spacing={1}>
                                    <Grid item>
                                        <HelpOutlineIcon />
                                    </Grid>
                                    <Grid item>
                                        <Typography>
                                            <Box fontWeight="fontWeightBold" component="span">
                                                Upstream branch not up to date
                                            </Box>
                                        </Typography>
                                        <Typography variant="subtitle2">
                                            Upstream branch ({upstreamSourceBranchName}) commit hash does not match with
                                            local branch ({props.sourceBranch.name})
                                        </Typography>
                                        <Typography variant="subtitle2">
                                            Ensure that the switch above is enabled to push the local changes to remote
                                            while creating the pull request
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Collapse>
                </Grid>
            </Grid>
        </Collapse>
    );
};
