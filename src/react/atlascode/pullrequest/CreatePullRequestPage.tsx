import {
    AppBar,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Container,
    Divider,
    Grid,
    IconButton,
    MenuItem,
    Paper,
    Switch,
    TextField,
    Theme,
    Toolbar,
    Tooltip,
    Typography,
    useTheme,
} from '@material-ui/core';
import { CreatePullRequestControllerContext, useCreatePullRequestController } from './createPullRequestController';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { RefreshButton, ToggleWithLabel } from '@atlassianlabs/guipi-core-components';
import { Transition, emptyTransition } from '@atlassianlabs/jira-pi-common-models';
import { VSCodeStyles, VSCodeStylesContext } from '../../vscode/theme/styles';

import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import { Autocomplete } from '@material-ui/lab';
import { Branch } from '../../../typings/git';
import { BranchWarning } from './BranchWarning';
import { Commits } from './Commits';
import { DiffList } from './DiffList';
import { ErrorDisplay } from '../common/ErrorDisplay';
import LaunchIcon from '@material-ui/icons/Launch';
import Lozenge from '../common/Lozenge';
import { PMFDisplay } from '../common/pmf/PMFDisplay';
import { User } from '../../../bitbucket/model';
import UserPicker from './UserPicker';
import { colorToLozengeAppearanceMap } from '../../vscode/theme/colors';
import { makeStyles } from '@material-ui/styles';
import path from 'path';
import { AtlascodeErrorBoundary } from '../common/ErrorBoundary';
import { AnalyticsView } from 'src/analyticsTypes';
import * as l10n from '@vscode/l10n';

const useStyles = makeStyles((theme: Theme) => ({
    title: {
        flexGrow: 0,
        marginRight: theme.spacing(3),
        marginLeft: theme.spacing(1),
    },
    targetSelectLabel: {
        marginRight: theme.spacing(1),
    },
    grow: {
        flexGrow: 1,
    },
    paper100: {
        overflow: 'hidden',
        height: '100%',
    },
    paperOverflow: {
        overflow: 'hidden',
    },
    leftBorder: (props: VSCodeStyles) => ({
        marginLeft: theme.spacing(1),
        borderLeftWidth: 'initial',
        borderLeftStyle: 'solid',
        borderLeftColor: props.settingsModifiedItemIndicator,
    }),
    card: {
        maxWidth: '650px',
    },
    warningCard: {
        color: theme.palette.info.contrastText,
        backgroundColor: theme.palette.info.main,
    },
}));

const CreatePullRequestPage: React.FunctionComponent = () => {
    const theme = useTheme<Theme>();
    const vscStyles = useContext(VSCodeStylesContext);
    const classes = useStyles(vscStyles);
    const [state, controller] = useCreatePullRequestController();

    const [sourceRemoteName, setSourceRemoteName] = useState('');
    const [sourceBranch, setSourceBranch] = useState<Branch>({ type: 0, name: '' });
    const [destinationBranch, setDestinationBranch] = useState<Branch>({ type: 1, name: '' });
    const [title, setTitle] = useState('Pull request title');
    const [summary, setSummary] = useState('');
    const [reviewers, setReviewers] = useState<User[]>([]);
    const [pushLocalChanges, setPushLocalChanges] = useState(true);
    const [closeSourceBranch, setCloseSourceBranch] = useState(false);
    const [transitionIssueEnabled, setTransitionIssueEnabled] = useState(false);
    const [transition, setTransition] = useState<Transition>(emptyTransition);
    const [submitState, setSubmitState] = useState<'initial' | 'submitting'>('initial');

    const handleTitleChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => setTitle(event.target.value),
        [setTitle],
    );

    const handleSummaryChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => setSummary(event.target.value),
        [setSummary],
    );

    const handleSourceRemoteChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => setSourceRemoteName(event.target.value),
        [setSourceRemoteName],
    );

    const handleSourceBranchChange = useCallback(
        (event: React.ChangeEvent, value: Branch) => {
            setSourceBranch(value);
        },
        [setSourceBranch],
    );

    const handleDestinationBranchChange = useCallback(
        (event: React.ChangeEvent, value: Branch) => setDestinationBranch(value),
        [setDestinationBranch],
    );

    const handleReviewersChange = useCallback((value: User[]) => setReviewers(value), [setReviewers]);

    const togglePushLocalChanges = useCallback(() => setPushLocalChanges(!pushLocalChanges), [pushLocalChanges]);
    const toggleCloseSourceBranch = useCallback(() => setCloseSourceBranch(!closeSourceBranch), [closeSourceBranch]);
    const toggleTransitionIssueEnabled = useCallback(
        () => setTransitionIssueEnabled(!transitionIssueEnabled),
        [transitionIssueEnabled],
    );

    const handleIssueTransitionChange = useCallback(
        (event: React.ChangeEvent<{ name?: string | undefined; value: any }>) => {
            setTransition(event.target.value);
            setTransitionIssueEnabled(true);
        },
        [setTransition],
    );

    const handleSubmit = useCallback(async () => {
        try {
            setSubmitState('submitting');
            await controller.submit({
                workspaceRepo: state.repoData.workspaceRepo,
                sourceSiteRemote: state.repoData.workspaceRepo.mainSiteRemote,
                sourceBranch: sourceBranch,
                sourceRemoteName: sourceRemoteName,
                destinationBranch: destinationBranch,
                title: title,
                summary: summary,
                reviewers: reviewers,
                pushLocalChanges,
                closeSourceBranch,
                issue: transitionIssueEnabled ? state.issue : undefined,
                transition,
            });
        } finally {
            // Resetting back to inital state both in error and success case
            // (ok to do for success case as the webview is hidden automatically if the request succeeds)
            setSubmitState('initial');
        }
    }, [
        controller,
        state.repoData,
        sourceBranch,
        sourceRemoteName,
        destinationBranch,
        title,
        summary,
        reviewers,
        pushLocalChanges,
        closeSourceBranch,
        state.issue,
        transitionIssueEnabled,
        transition,
    ]);

    useEffect(() => {
        if (state.repoData.localBranches.length > 0) {
            setSourceBranch(state.repoData.localBranches[0]);
        }
        setSourceRemoteName(state.repoData.workspaceRepo.mainSiteRemote.remote.name);
        if (state.repoData.remoteBranches.length > 0) {
            setDestinationBranch(
                state.repoData.remoteBranches.find((b) => b.name!.indexOf(state.repoData.developmentBranch!) !== -1) ||
                    state.repoData.localBranches[0],
            );
        }
        setReviewers(state.repoData.defaultReviewers);
        // We only need to run this effect when workspaceRepo changes, and checking the rootUri is sufficient for that.
        // It also had the added benefit of not running the effect if workspaceRepo object reference changes without the actual values changing as rootUri is a string.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.repoData.workspaceRepo.rootUri]);

    useEffect(() => {
        setTitle(sourceBranch.name || '');
        controller.fetchIssue(sourceBranch.name!);
    }, [controller, sourceBranch, setTitle]);

    useEffect(() => {
        if (
            sourceBranch.name &&
            sourceBranch.name.length > 0 &&
            destinationBranch.name &&
            destinationBranch.name.length > 0
        ) {
            controller.fetchDetails(sourceBranch, destinationBranch);
        }
    }, [controller, sourceBranch, destinationBranch]);

    useEffect(() => {
        if (state.issue?.transitions && state.issue?.transitions.length > 0) {
            setTransition(
                state.issue.transitions.find((t) => t.to.id === state.issue?.status.id) || state.issue.transitions[0],
            );
        } else {
            setTransition(emptyTransition);
        }
    }, [state.issue]);

    useEffect(() => {
        // for a single commit, use commit message as the PR title
        // for multiple commits, use the source branch name
        if (state.commits.length === 1) {
            setTitle(state.commits[0].message!.split('\n', 1)[0].trim());
            setSummary(
                `${state.commits[0].message!.substring(state.commits[0].message!.indexOf('\n') + 1).trimLeft()}`,
            );
        } else if (state.commits.length > 1) {
            setTitle(sourceBranch.name!);
            setSummary(`${state.commits.map((c) => `* ${c.message.trimRight()}`).join('\n\n')}`);
        }
    }, [sourceBranch.name, state.commits]);

    return (
        <CreatePullRequestControllerContext.Provider value={controller}>
            <AtlascodeErrorBoundary
                context={{ view: AnalyticsView.CreatePullRequestPage }}
                postMessageFunc={controller.postMessage}
            >
                <Container maxWidth="lg">
                    <AppBar position="relative">
                        <Toolbar>
                            <Typography variant="h3" className={classes.title}>
                                <Box fontWeight="fontWeightBold" display="inline">
                                    Create pull request -{' '}
                                </Box>
                                {path.basename(state.repoData.workspaceRepo.rootUri)}
                            </Typography>
                            <Box className={classes.grow} />
                            <Tooltip title={l10n.t('Create in browser...')}>
                                <IconButton
                                    href={
                                        state.repoData.isCloud
                                            ? `${state.repoData.href}/pull-requests/new`
                                            : `${state.repoData.href}/pull-requests?create`
                                    }
                                >
                                    <LaunchIcon />
                                </IconButton>
                            </Tooltip>
                            <RefreshButton loading={state.isSomethingLoading} onClick={controller.refresh} />
                        </Toolbar>
                    </AppBar>
                    <Grid container spacing={1}>
                        <Grid item xs={12}>
                            <Paper className={classes.paper100}>
                                <Box margin={2}>
                                    <ErrorDisplay />
                                    <PMFDisplay postMessageFunc={controller.postMessage} />
                                    <Grid container spacing={2} direction="column">
                                        <Grid item>
                                            <Box />
                                        </Grid>
                                        <Grid container alignItems="center">
                                            <Grid item xs>
                                                <Card>
                                                    <CardContent>
                                                        {state.repoData.workspaceRepo.siteRemotes.filter(
                                                            (r) => !r.remote.name.endsWith('(parent repo)'),
                                                        ).length > 1 && (
                                                            <TextField
                                                                select
                                                                fullWidth
                                                                size="small"
                                                                label={l10n.t('Remote')}
                                                                value={sourceRemoteName}
                                                                onChange={handleSourceRemoteChange}
                                                            >
                                                                {state.repoData.workspaceRepo.siteRemotes
                                                                    .filter(
                                                                        (r) => !r.remote.name.endsWith('(parent repo)'),
                                                                    )
                                                                    .map((r) => (
                                                                        <MenuItem
                                                                            key={r.remote.name}
                                                                            value={r.remote.name}
                                                                        >
                                                                            {r.remote.name}
                                                                        </MenuItem>
                                                                    ))}
                                                            </TextField>
                                                        )}
                                                        <Autocomplete
                                                            options={state.repoData.localBranches}
                                                            getOptionLabel={(option: Branch) => option.name!}
                                                            getOptionSelected={(option: Branch, value: Branch) =>
                                                                option.name === value.name
                                                            }
                                                            value={sourceBranch}
                                                            loading={sourceBranch.name === ''}
                                                            onChange={handleSourceBranchChange}
                                                            size="small"
                                                            disableClearable
                                                            openOnFocus
                                                            renderInput={(params) => (
                                                                <TextField {...params} label="Source branch" />
                                                            )}
                                                        />
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                            <Grid item xs={1} style={{ textAlign: 'center' }}>
                                                <ArrowForwardIcon />
                                            </Grid>
                                            <Grid item xs>
                                                <Card>
                                                    <CardContent>
                                                        <Autocomplete
                                                            options={state.repoData.remoteBranches}
                                                            getOptionLabel={(option: Branch) => option.name!}
                                                            getOptionSelected={(option: Branch, value: Branch) =>
                                                                option.name === value.name
                                                            }
                                                            groupBy={(option) => option.remote!}
                                                            value={destinationBranch}
                                                            loading={destinationBranch.name === ''}
                                                            onChange={handleDestinationBranchChange}
                                                            size="small"
                                                            disableClearable
                                                            openOnFocus
                                                            renderInput={(params) => (
                                                                <TextField {...params} label="Destination branch" />
                                                            )}
                                                        />
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        </Grid>
                                        <Grid item>
                                            <ToggleWithLabel
                                                label={l10n.t('Push latest changes from local to remote branch')}
                                                spacing={1}
                                                control={
                                                    <Switch
                                                        color="primary"
                                                        size="small"
                                                        checked={pushLocalChanges}
                                                        onChange={togglePushLocalChanges}
                                                    />
                                                }
                                            />
                                        </Grid>
                                        <Grid item>
                                            <BranchWarning
                                                sourceBranch={sourceBranch}
                                                sourceRemoteName={
                                                    state.repoData.workspaceRepo.mainSiteRemote.remote.name
                                                }
                                                remoteBranches={state.repoData.remoteBranches}
                                                hasLocalChanges={state.repoData.hasLocalChanges}
                                            />
                                        </Grid>
                                        <Grid item>
                                            <TextField
                                                fullWidth
                                                label={l10n.t('Title')}
                                                name="title"
                                                value={title}
                                                onChange={handleTitleChange}
                                            />
                                        </Grid>
                                        <Grid item>
                                            <TextField
                                                fullWidth
                                                multiline
                                                rows={4}
                                                rowsMax={20}
                                                label={l10n.t('Summary')}
                                                name="summary"
                                                value={summary}
                                                onChange={handleSummaryChange}
                                            />
                                        </Grid>
                                        <Grid item>
                                            <UserPicker
                                                site={
                                                    state.repoData.workspaceRepo.siteRemotes.find(
                                                        (r) => r.remote.name === destinationBranch.remote,
                                                    )?.site
                                                }
                                                users={reviewers}
                                                defaultUsers={state.repoData.defaultReviewers}
                                                onChange={handleReviewersChange}
                                            />
                                        </Grid>
                                        <Grid item>
                                            <ToggleWithLabel
                                                label={l10n.t('Close source branch after the pull request is merged')}
                                                spacing={1}
                                                control={
                                                    <Switch
                                                        color="primary"
                                                        size="small"
                                                        checked={closeSourceBranch}
                                                        onChange={toggleCloseSourceBranch}
                                                    />
                                                }
                                            />
                                        </Grid>
                                        <Grid item hidden={state.issue === undefined}>
                                            <Divider />
                                        </Grid>
                                        <Grid item hidden={state.issue === undefined}>
                                            <ToggleWithLabel
                                                label={l10n.t('Transition issue')}
                                                variant="h4"
                                                spacing={1}
                                                control={
                                                    <Switch
                                                        color="primary"
                                                        size="small"
                                                        checked={transitionIssueEnabled}
                                                        onChange={toggleTransitionIssueEnabled}
                                                    />
                                                }
                                            />
                                        </Grid>
                                        <Grid item hidden={state.issue === undefined || transition === emptyTransition}>
                                            <Grid
                                                container
                                                spacing={2}
                                                direction="column"
                                                className={classes.leftBorder}
                                            >
                                                <Grid item direction="row">
                                                    <Typography>
                                                        <Box display="inline-flex" fontWeight="fontWeightBold">
                                                            {state.issue?.key}
                                                        </Box>{' '}
                                                        {state.issue?.summary}
                                                    </Typography>
                                                </Grid>

                                                <Grid item xs={6} md={4}>
                                                    <TextField
                                                        select
                                                        fullWidth
                                                        size="small"
                                                        label={l10n.t('Transition issue')}
                                                        value={transition}
                                                        onChange={handleIssueTransitionChange}
                                                    >
                                                        {(state.issue?.transitions || [emptyTransition]).map(
                                                            (transition) => (
                                                                //@ts-ignore
                                                                <MenuItem key={transition.id} value={transition}>
                                                                    <Lozenge
                                                                        appearance={
                                                                            colorToLozengeAppearanceMap[
                                                                                transition.to.statusCategory.colorName
                                                                            ]
                                                                        }
                                                                        label={transition.to.name}
                                                                    />
                                                                </MenuItem>
                                                            ),
                                                        )}
                                                    </TextField>
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                        <Grid item>
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={handleSubmit}
                                                endIcon={
                                                    submitState === 'submitting' ? (
                                                        <CircularProgress
                                                            color="inherit"
                                                            size={theme.typography.fontSize}
                                                        />
                                                    ) : null
                                                }
                                            >
                                                Create pull request
                                            </Button>
                                        </Grid>
                                        <Grid item />
                                        <Grid item hidden={state.commits.length === 0 && state.fileDiffs.length === 0}>
                                            <Divider />
                                        </Grid>
                                        <Grid item hidden={state.commits.length === 0}>
                                            <Typography variant="h4" gutterBottom>
                                                Commits
                                            </Typography>
                                            <Commits commits={state.commits} />
                                        </Grid>
                                        <Grid item hidden={state.fileDiffs.length === 0}>
                                            <Typography variant="h4" gutterBottom>
                                                Files changed
                                            </Typography>
                                            <DiffList
                                                fileDiffs={state.fileDiffs}
                                                openDiffHandler={controller.openDiff}
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </Container>
            </AtlascodeErrorBoundary>
        </CreatePullRequestControllerContext.Provider>
    );
};

export default CreatePullRequestPage;
