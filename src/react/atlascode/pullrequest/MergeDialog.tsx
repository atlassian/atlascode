import { InlineTextEditor, ToggleWithLabel } from '@atlassianlabs/guipi-core-components';
import { MinimalIssue, Transition } from '@atlassianlabs/jira-pi-common-models';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    makeStyles,
    MenuItem,
    Switch,
    Table,
    TableBody,
    TableContainer,
    TextField,
    Theme,
    Typography,
} from '@material-ui/core';
import React, { useCallback, useEffect, useState } from 'react';

import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { Commit, MergeStrategy, PullRequestData } from '../../../bitbucket/model';
import { JiraTransitionMenu } from './JiraTransitionMenu';
import { MergeChecks } from './MergeChecks';

const useStyles = makeStyles((theme: Theme) => ({
    table: {
        width: 'unset',
    },
}));

const emptyMergeStrategy: MergeStrategy = {
    label: 'Default merge strategy',
    value: '',
    isDefault: false,
};

type MergeDialogProps = {
    prData: PullRequestData;
    commits: Commit[];
    relatedJiraIssues: MinimalIssue<DetailedSiteInfo>[];
    mergeStrategies: MergeStrategy[];
    loadState: {
        basicData: boolean;
        commits: boolean;
        mergeStrategies: boolean;
        relatedJiraIssues: boolean;
    };
    merge: (
        mergeStrategy: MergeStrategy,
        commitMessage: string,
        closeSourceBranch: boolean,
        issues: MinimalIssue<DetailedSiteInfo>[],
    ) => void;
};

export const MergeDialog: React.FC<MergeDialogProps> = ({
    prData,
    commits,
    relatedJiraIssues,
    mergeStrategies,
    loadState,
    merge,
}) => {
    const classes = useStyles();
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const [commitMessage, setCommitMessage] = useState<string>('');
    const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>(emptyMergeStrategy);
    const [isMerging, setIsMerging] = useState<boolean>(false);
    const [transitionedJiraIssues, setTransitionedJiraIssues] =
        useState<MinimalIssue<DetailedSiteInfo>[]>(relatedJiraIssues);
    const [jiraIssuesToTransition] = useState<Map<string, boolean>>(new Map<string, boolean>());
    const [closeSourceBranch, setCloseSourceBranch] = useState<boolean>(true);

    const handleMerge = useCallback(() => {
        const jiraIssues = transitionedJiraIssues.filter((issue) => jiraIssuesToTransition.get(issue.id));
        setIsMerging(true);
        merge(mergeStrategy, commitMessage, closeSourceBranch, jiraIssues);
        setDialogOpen(false);
    }, [
        merge,
        setDialogOpen,
        mergeStrategy,
        commitMessage,
        closeSourceBranch,
        transitionedJiraIssues,
        jiraIssuesToTransition,
    ]);

    const handleClose = useCallback(() => {
        setDialogOpen(false);
    }, [setDialogOpen]);

    const handleOpen = useCallback(() => {
        setDialogOpen(true);
    }, [setDialogOpen]);

    const handleMergeStrategyChange = useCallback(
        (event: React.ChangeEvent<{ name?: string | undefined; value: any }>) => {
            setMergeStrategy(event.target.value);
        },
        [],
    );

    const handleCommitMessageChange = useCallback((text: string) => {
        setCommitMessage(text);
    }, []);

    const isEmptyCommitMessage = useCallback((text: string) => {
        return text.trim() === '';
    }, []);

    const getDefaultCommitMessage = useCallback(
        (mergeStrategy: MergeStrategy) => {
            const mergeStrategyValue = mergeStrategy.value;
            if (mergeStrategyValue === 'fast_forward') {
                return '';
            }

            const { id, source, title, participants } = prData;

            const branchInfo = `Merged in ${source && source.branchName}`;
            const pullRequestInfo = `(pull request #${id})`;

            let defaultCommitMessage = `${branchInfo} ${pullRequestInfo}\n\n${title}`;

            if (mergeStrategyValue === 'squash') {
                // Minor optimization: if there's exactly 1 commit, and the commit
                // message already matches the pull request title, no need to display the
                // same text twice.
                if (commits.length !== 1 || commits[0].message !== title) {
                    const commitMessages = commits
                        .reverse()
                        .map((commit) => `* ${commit.message}`)
                        .join('\n');
                    defaultCommitMessage += `\n\n${commitMessages}`;
                }
            }

            const approvers = participants.filter((p) => p.status === 'APPROVED');
            if (approvers.length > 0) {
                const approverInfo = approvers.map((approver) => `Approved-by: ${approver.displayName}`).join('\n');
                defaultCommitMessage += `\n\n${approverInfo}`;
            }

            return defaultCommitMessage;
        },
        [commits, prData],
    );

    const handleJiraIssueTransition = useCallback(
        (issueToTransition: MinimalIssue<DetailedSiteInfo>, transition: Transition) => {
            const newTransitionedIssues = transitionedJiraIssues.map((issue) => {
                return issue.key === issueToTransition.key
                    ? {
                          ...issue,
                          status: {
                              ...issue.status,
                              id: transition.to.id,
                              name: transition.to.name,
                          },
                      }
                    : issue;
            });

            setTransitionedJiraIssues(newTransitionedIssues);
        },
        [transitionedJiraIssues],
    );

    const handleShouldTransitionChangeJira = useCallback(
        (issueId: string, shouldTransition: boolean) => {
            jiraIssuesToTransition.set(issueId, shouldTransition);
        },
        [jiraIssuesToTransition],
    );

    const handleCloseSourceBranchChange = useCallback(
        () => setCloseSourceBranch(!closeSourceBranch),
        [closeSourceBranch],
    );

    useEffect(() => {
        relatedJiraIssues.forEach((issue) => jiraIssuesToTransition.set(issue.id, true));
        setTransitionedJiraIssues(relatedJiraIssues);
    }, [relatedJiraIssues, jiraIssuesToTransition]);

    useEffect(() => {
        setCommitMessage(getDefaultCommitMessage(mergeStrategy));
    }, [getDefaultCommitMessage, setCommitMessage, mergeStrategy]);

    useEffect(() => {
        setIsMerging(false);
    }, [prData.state]);

    useEffect(() => {
        setCloseSourceBranch(prData.closeSourceBranch);
    }, [prData.closeSourceBranch]);

    useEffect(() => {
        if (mergeStrategy.value === emptyMergeStrategy.value) {
            const defaultMergeStrategy = mergeStrategies.find((strategy) => strategy.isDefault === true);
            setMergeStrategy(defaultMergeStrategy ?? emptyMergeStrategy);
        }
    }, [mergeStrategies, mergeStrategy]);

    return (
        <Box>
            <Box hidden={loadState.basicData}>
                <Button
                    color={'primary'}
                    variant={'contained'}
                    onClick={handleOpen}
                    disabled={prData.state !== 'OPEN' || isMerging}
                >
                    <Typography variant={'button'} noWrap>
                        {prData.state === 'OPEN' ? 'Merge' : 'Merged'}
                    </Typography>
                </Button>
            </Box>
            <Box hidden={!loadState.basicData}>
                <CircularProgress />
            </Box>

            <Dialog
                open={dialogOpen}
                onClose={handleClose}
                fullWidth
                maxWidth={'md'}
                aria-labelledby="merge-dialog-title"
            >
                <DialogTitle>
                    <Typography variant="h4">Merge Pull Request</Typography>
                </DialogTitle>
                <DialogContent>
                    <MergeChecks prData={prData} />
                    <Box marginTop={5} />
                    <Grid container spacing={1} direction="column" alignItems="stretch">
                        <Grid item>
                            <Box hidden={loadState.mergeStrategies}>
                                <TextField
                                    select
                                    value={mergeStrategy}
                                    onChange={handleMergeStrategyChange}
                                    fullWidth
                                    size="small"
                                    label="Merge Strategy"
                                >
                                    <MenuItem
                                        key={emptyMergeStrategy.label}
                                        //@ts-ignore
                                        value={emptyMergeStrategy}
                                        disabled
                                    >
                                        Select a merge strategy
                                    </MenuItem>
                                    {mergeStrategies.map((strategy) => (
                                        //@ts-ignore
                                        <MenuItem key={strategy.label} value={strategy}>
                                            {strategy.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Box>
                            <Box hidden={!loadState.mergeStrategies}>
                                <CircularProgress />
                            </Box>
                        </Grid>
                        <Grid item>
                            <Box hidden={!loadState.commits}>
                                <CircularProgress />
                            </Box>
                            <Box hidden={loadState.commits}>
                                <InlineTextEditor
                                    fullWidth
                                    multiline
                                    rows={5}
                                    defaultValue={commitMessage}
                                    onSave={handleCommitMessageChange}
                                    placeholder={'Enter commit message'}
                                    saveDisabled={isEmptyCommitMessage}
                                    label={'Commit Message'}
                                />
                            </Box>
                        </Grid>
                        <Grid item>
                            <Box hidden={!loadState.relatedJiraIssues}>
                                <CircularProgress />
                            </Box>
                            <Box hidden={loadState.relatedJiraIssues}>
                                <Box marginTop={3} hidden={transitionedJiraIssues.length === 0}>
                                    <Typography variant="h5">Transition issues</Typography>
                                </Box>
                                <TableContainer>
                                    <Table size="small" aria-label="issues to transition">
                                        <TableBody className={classes.table}>
                                            {transitionedJiraIssues.map((issue) => (
                                                <JiraTransitionMenu
                                                    issue={issue}
                                                    handleIssueTransition={handleJiraIssueTransition}
                                                    onShouldTransitionChange={handleShouldTransitionChangeJira}
                                                    key={issue.key}
                                                />
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </Grid>
                        <Grid item>
                            <ToggleWithLabel
                                control={
                                    <Switch
                                        size="small"
                                        color="primary"
                                        value="Close source branch"
                                        checked={closeSourceBranch}
                                        onChange={handleCloseSourceBranchChange}
                                    />
                                }
                                label={'Close source branch'}
                                spacing={1}
                                variant="body1"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" onClick={handleClose} color="primary">
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={handleMerge} color="primary">
                        Merge
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
