import { RefreshButton } from '@atlassianlabs/guipi-core-components';
import { emptyTransition, Transition } from '@atlassianlabs/jira-pi-common-models';
import {
    AppBar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Collapse,
    Container,
    Divider,
    Grid,
    IconButton,
    Link,
    List,
    ListItem,
    makeStyles,
    MenuItem,
    Paper,
    Snackbar,
    Switch,
    TextField,
    Theme,
    Toolbar,
    Tooltip,
    Typography,
    useTheme,
} from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import SettingsIcon from '@material-ui/icons/Settings';
import { Alert, AlertTitle, Autocomplete } from '@material-ui/lab';
import Mustache from 'mustache';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ConfigSection, ConfigSubSection } from '../../../lib/ipc/models/config';
import { BranchType, emptyRepoData, RepoData } from '../../../lib/ipc/toUI/startWork';
import { Branch } from '../../../typings/git';
import { colorToLozengeAppearanceMap } from '../../vscode/theme/colors';
import { VSCodeStyles, VSCodeStylesContext } from '../../vscode/theme/styles';
import { ErrorDisplay } from '../common/ErrorDisplay';
import Lozenge from '../common/Lozenge';
import { PMFDisplay } from '../common/pmf/PMFDisplay';
import { PrepareCommitTip } from '../common/PrepareCommitTip';
import { StartWorkControllerContext, useStartWorkController } from './startWorkController';
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
    card: {
        maxWidth: '600px',
    },
    leftBorder: (props: VSCodeStyles) => ({
        marginLeft: theme.spacing(1),
        borderLeftWidth: 'initial',
        borderLeftStyle: 'solid',
        borderLeftColor: props.settingsModifiedItemIndicator,
    }),
}));

const emptyPrefix: BranchType = { kind: '', prefix: '' };

const StartWorkPage: React.FunctionComponent = () => {
    const theme = useTheme<Theme>();
    const vscStyles = useContext(VSCodeStylesContext);
    const classes = useStyles(vscStyles);
    const [state, controller] = useStartWorkController();
    const convertedCustomPrefixes = state.customPrefixes.map((prefix) => {
        return { prefix: prefix, kind: prefix };
    });

    const [transitionIssueEnabled, setTransitionIssueEnabled] = useState(true);
    const [branchSetupEnabled, setbranchSetupEnabled] = useState(true);
    const [transition, setTransition] = useState<Transition>(emptyTransition);
    const [repository, setRepository] = useState<RepoData>(emptyRepoData);
    const [branchType, setBranchType] = useState<BranchType>(emptyPrefix);
    const [sourceBranch, setSourceBranch] = useState<Branch>({ type: 0, name: '' });
    const [localBranch, setLocalBranch] = useState('');
    const [upstream, setUpstream] = useState('');
    const [existingBranches, setExistingBranches] = useState<Branch[]>([]);
    const [submitState, setSubmitState] = useState<'initial' | 'submitting' | 'submit-success'>('initial');
    const [submitResponse, setSubmitResponse] = useState<{
        transistionStatus?: string;
        branch?: string;
        upstream?: string;
    }>({});
    const [successSnackbarOpen, setSuccessSnackbarOpen] = useState(false);

    const toggleTransitionIssueEnabled = useCallback(
        () => setTransitionIssueEnabled(!transitionIssueEnabled),
        [transitionIssueEnabled],
    );

    const toggleBranchSetupEnabled = useCallback(
        () => setbranchSetupEnabled(!branchSetupEnabled),
        [branchSetupEnabled],
    );

    const handleTransitionChange = useCallback(
        (event: React.ChangeEvent<{ name?: string | undefined; value: any }>) => {
            setTransition(event.target.value);
        },
        [setTransition],
    );

    const handleRepositoryChange = useCallback(
        (event: React.ChangeEvent<{ name?: string | undefined; value: any }>) => {
            setRepository(event.target.value);
        },
        [setRepository],
    );

    const handleSourceBranchChange = useCallback(
        (event: React.ChangeEvent, value: Branch) => {
            setSourceBranch(value);
        },
        [setSourceBranch],
    );

    const handleBranchTypeChange = useCallback(
        (event: React.ChangeEvent, value: BranchType) => {
            setBranchType(value);
        },
        [setBranchType],
    );

    const handleExistingBranchClick = useCallback(
        (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
            e.preventDefault();
            e.stopPropagation();
            const existingBranchName = e.currentTarget.dataset.branchName || '';
            const sourceBranchOption = [...repository.localBranches, ...repository.remoteBranches].find(
                (branch) => branch.name === existingBranchName,
            )!;
            const updatedLocalBranch =
                sourceBranchOption.type === 0
                    ? sourceBranchOption.name!
                    : sourceBranchOption.name!.substring(sourceBranchOption.remote!.length + 1);

            const bt = [...repository.branchTypes, ...convertedCustomPrefixes].find((branchType) =>
                existingBranchName.startsWith(branchType.prefix),
            )!;

            setBranchType(bt);

            //HACK: without this wait, the update to local branch gets overwritten by buildBranchName since that function is called
            //every time branchType is changed. This is a quick fix, but a better solution would be to create two state variables
            //for prefixes: one for the autocomplete and the other the "real" prefix. Then, set the "real" prefix to "ExistingBranch" here
            //and don't call buildBranchName if the "real" prefix is "ExistingBranch".
            setTimeout(() => {
                setLocalBranch(updatedLocalBranch.substring(bt.prefix.length));
            }, 100);
            setSourceBranch(sourceBranchOption);
        },
        [repository, convertedCustomPrefixes],
    );

    const handleLocalBranchChange = useCallback(
        (event: React.ChangeEvent<{ name?: string | undefined; value: string }>) => {
            setLocalBranch(event.target.value);
        },
        [setLocalBranch],
    );

    const handleUpstreamChange = useCallback(
        (event: React.ChangeEvent<{ name?: string | undefined; value: string }>) => {
            setUpstream(event.target.value);
        },
        [setUpstream],
    );

    const buildBranchName = useCallback(() => {
        const view = {
            prefix: branchType.prefix.replace(/ /g, '-').toLowerCase(),
            Prefix: branchType.prefix.replace(/ /g, '-'),
            PREFIX: branchType.prefix.replace(/ /g, '-').toUpperCase(),
            issueKey: state.issue.key,
            issuekey: state.issue.key.toLowerCase(),
            summary: state.issue.summary
                .substring(0, 50)
                .trim()
                .toLowerCase()
                .normalize('NFD') // Convert accented characters to two characters where the accent is separated out
                .replace(/[\u0300-\u036f]/g, '') // Remove the separated accent marks
                .replace(/\W+/g, '-'),
            Summary: state.issue.summary
                .substring(0, 50)
                .trim()
                .normalize('NFD') // Convert accented characters to two characters where the accent is separated out
                .replace(/[\u0300-\u036f]/g, '') // Remove the separated accent marks
                .replace(/\W+/g, '-'),
            SUMMARY: state.issue.summary
                .substring(0, 50)
                .trim()
                .toUpperCase()
                .normalize('NFD') // Convert accented characters to two characters where the accent is separated out
                .replace(/[\u0300-\u036f]/g, '') // Remove the separated accent marks
                .replace(/\W+/g, '-'),
        };

        try {
            const generatedBranchTitle = Mustache.render(state.customTemplate, view);
            setLocalBranch(generatedBranchTitle);
        } catch {
            setLocalBranch(l10n.t('Invalid template: please follow the format described above'));
        }
    }, [state.issue.key, state.issue.summary, branchType.prefix, state.customTemplate]);

    useEffect(() => {
        buildBranchName();
    }, [branchType, buildBranchName]);
    const handleSuccessSnackbarClose = useCallback(() => setSuccessSnackbarOpen(false), [setSuccessSnackbarOpen]);

    const handleStartWorkSubmit = useCallback(async () => {
        setSubmitState('submitting');
        try {
            const response = await controller.startWork(
                transitionIssueEnabled,
                transition,
                branchSetupEnabled,
                repository.workspaceRepo,
                sourceBranch,
                localBranch,
                upstream,
            );
            setSubmitState('submit-success');
            setSubmitResponse(response);
            setSuccessSnackbarOpen(true);
        } catch (e) {
            setSubmitState('initial');
        }
    }, [
        controller,
        transitionIssueEnabled,
        transition,
        branchSetupEnabled,
        repository,
        sourceBranch,
        localBranch,
        upstream,
    ]);

    const handleOpenSettings = useCallback(() => {
        controller.openSettings(ConfigSection.Jira, ConfigSubSection.StartWork);
    }, [controller]);

    useEffect(() => {
        console.log(`JS-1324 selected repo ${repository.workspaceRepo.rootUri}`);
        if (repository.workspaceRepo.rootUri === '' && state.repoData.length > 0) {
            setRepository(state.repoData?.[0]);
        }
    }, [repository, state.repoData]);

    useEffect(() => {
        console.log(`JS-1324 repos: ${JSON.stringify(state.repoData.map((r) => r.workspaceRepo.rootUri))}`);
    }, [state.repoData]);

    useEffect(() => {
        setUpstream(repository.workspaceRepo.mainSiteRemote.remote.name);
        setBranchType(repository.branchTypes?.[0] || emptyPrefix);
        setSourceBranch(
            repository.localBranches?.find(
                (b) => repository.developmentBranch && b.name === repository.developmentBranch,
            ) ||
                repository.localBranches?.[0] || { name: 'no branches found' },
        );
        setExistingBranches([
            ...repository.localBranches.filter((b) => b.name?.toLowerCase().includes(state.issue.key.toLowerCase())),
            ...repository.remoteBranches
                .filter((b) => b.name?.toLowerCase().includes(state.issue.key.toLowerCase()))
                .filter(
                    (remoteBranch) =>
                        !repository.localBranches.some((localBranch) => remoteBranch.name!.endsWith(localBranch.name!)),
                ),
        ]);
    }, [repository, state.issue]);

    useEffect(() => {
        setSubmitState('initial');
    }, []);

    useEffect(() => {
        // best effort to default to a transition that will move the issue to `In progress` state
        const inProgressTransitionGuess: Transition =
            state.issue.transitions.find((t) => !t.isInitial && t.to.name.toLocaleLowerCase().includes('progress')) ||
            state.issue.transitions.find((t) => !t.isInitial) ||
            state.issue.transitions?.[0] ||
            emptyTransition;
        setTransition(inProgressTransitionGuess);
    }, [state.issue]);

    return (
        <StartWorkControllerContext.Provider value={controller}>
            <AtlascodeErrorBoundary
                context={{ view: AnalyticsView.StartWorkPage }}
                postMessageFunc={controller.postMessage}
            >
                <Container maxWidth="xl">
                    <AppBar position="relative">
                        <Toolbar>
                            <Typography variant="h3" className={classes.title}>
                                Start work
                            </Typography>
                            <Box className={classes.grow} />
                            <RefreshButton loading={state.isSomethingLoading} onClick={controller.refresh} />
                        </Toolbar>
                    </AppBar>
                    <Grid container spacing={1}>
                        <Grid item xs={12} md={12} lg={12} xl={12}>
                            <Paper className={classes.paper100}>
                                <Box margin={2}>
                                    <ErrorDisplay />
                                    <PMFDisplay postMessageFunc={controller.postMessage} />
                                    <Collapse in={submitState === 'submit-success'}>
                                        <Alert variant="standard" severity="success">
                                            <AlertTitle>{l10n.t('Success!')}</AlertTitle>
                                            <List dense>
                                                <ListItem disableGutters>
                                                    <Typography>- Assigned the issue to you</Typography>
                                                </ListItem>
                                                {submitResponse.transistionStatus !== undefined && (
                                                    <ListItem disableGutters>
                                                        <Typography>
                                                            - Transitioned status to{' '}
                                                            <strong>{submitResponse.transistionStatus}</strong>
                                                        </Typography>
                                                    </ListItem>
                                                )}
                                                {submitResponse.branch !== undefined && (
                                                    <ListItem disableGutters>
                                                        <Typography>
                                                            - Switched to <strong>{submitResponse.branch}</strong>{' '}
                                                            branch with upstream set to{' '}
                                                            <strong>
                                                                {submitResponse.upstream}/{submitResponse.branch}
                                                            </strong>
                                                        </Typography>
                                                    </ListItem>
                                                )}
                                            </List>
                                        </Alert>
                                    </Collapse>
                                    <Grid container spacing={2} direction="column">
                                        <Grid item>
                                            <Box />
                                        </Grid>
                                        <Grid item>
                                            <Grid container spacing={1}>
                                                <Grid item>
                                                    <Link component="button" onClick={controller.openJiraIssue}>
                                                        <Typography variant="h4">
                                                            <Box fontWeight="fontWeightBold">{state.issue.key}</Box>
                                                        </Typography>
                                                    </Link>
                                                </Grid>
                                                <Grid item>
                                                    <Typography variant="h4">
                                                        <Box fontWeight="fontWeightBold">{`${state.issue.summary}`}</Box>
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                        <Grid item>
                                            <Typography
                                                variant="body2"
                                                dangerouslySetInnerHTML={{ __html: state.issue.descriptionHtml }}
                                            ></Typography>
                                        </Grid>
                                        <Grid item>
                                            <Divider />
                                        </Grid>
                                        <Grid item>
                                            <Grid container spacing={1} direction="row">
                                                <Grid item>
                                                    <Switch
                                                        color="primary"
                                                        size="small"
                                                        checked={transitionIssueEnabled}
                                                        onClick={toggleTransitionIssueEnabled}
                                                    />
                                                </Grid>
                                                <Grid item>
                                                    <Typography variant="h4">
                                                        <Box fontWeight="fontWeightBold">
                                                            {l10n.t('Transition issue')}
                                                        </Box>
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                        <Grid item>
                                            <Collapse in={transitionIssueEnabled}>
                                                <Grid container spacing={2} className={classes.leftBorder}>
                                                    <Grid item>
                                                        <TextField
                                                            select
                                                            size="small"
                                                            label={l10n.t('Transition issue')}
                                                            value={transition}
                                                            onChange={handleTransitionChange}
                                                        >
                                                            {state.issue.transitions.map((transition) => (
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
                                                            ))}
                                                        </TextField>
                                                    </Grid>
                                                </Grid>
                                            </Collapse>
                                        </Grid>
                                        <Grid item>
                                            <Divider />
                                        </Grid>
                                        <Grid item>
                                            <Grid container spacing={1} direction="row">
                                                <Grid item>
                                                    <Switch
                                                        color="primary"
                                                        size="small"
                                                        checked={branchSetupEnabled}
                                                        onClick={toggleBranchSetupEnabled}
                                                    />
                                                </Grid>
                                                <Grid item>
                                                    <Typography variant="h4">
                                                        <Box fontWeight="fontWeightBold">
                                                            {l10n.t('Set up git branch')}
                                                        </Box>
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                        <Grid item>
                                            <Collapse in={branchSetupEnabled}>
                                                <Grid
                                                    container
                                                    spacing={2}
                                                    direction="column"
                                                    className={classes.leftBorder}
                                                >
                                                    <Grid item xs={8} md={4} lg={3} xl={3}>
                                                        <TextField
                                                            select
                                                            size="small"
                                                            label={l10n.t('Repository')}
                                                            fullWidth
                                                            value={repository}
                                                            onChange={handleRepositoryChange}
                                                        >
                                                            {state.repoData.map((item) => (
                                                                //@ts-ignore
                                                                <MenuItem key={item.workspaceRepo.rootUri} value={item}>
                                                                    {item.workspaceRepo.rootUri.substring(
                                                                        item.workspaceRepo.rootUri.lastIndexOf('/') + 1,
                                                                    )}
                                                                </MenuItem>
                                                            ))}
                                                        </TextField>
                                                    </Grid>
                                                    <Grid item xs={8} md={4} lg={3} xl={3}>
                                                        <Autocomplete
                                                            options={[
                                                                ...repository.localBranches,
                                                                ...repository.remoteBranches,
                                                            ]}
                                                            getOptionLabel={(option: Branch) => option.name!}
                                                            value={sourceBranch}
                                                            loading={sourceBranch.name === ''}
                                                            onChange={handleSourceBranchChange}
                                                            size="small"
                                                            disableClearable
                                                            openOnFocus
                                                            renderInput={(params) => (
                                                                <TextField
                                                                    {...params}
                                                                    label={l10n.t('Source branch')}
                                                                />
                                                            )}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={6} md={3} lg={2} xl={2}>
                                                        <Grid
                                                            container
                                                            spacing={2}
                                                            justify={'center'}
                                                            alignItems={'center'}
                                                        >
                                                            <Grid item xs={10}>
                                                                <Autocomplete
                                                                    id="grouped-demo"
                                                                    options={[
                                                                        ...repository.branchTypes,
                                                                        ...convertedCustomPrefixes,
                                                                    ]}
                                                                    groupBy={(option) =>
                                                                        repository.branchTypes
                                                                            .map((type) => type.kind)
                                                                            .includes(option.kind)
                                                                            ? 'Repo Branch Type'
                                                                            : 'Custom Prefix'
                                                                    }
                                                                    getOptionLabel={(option) => option.kind}
                                                                    renderInput={(params) => (
                                                                        <TextField
                                                                            {...params}
                                                                            label={l10n.t('Branch Prefix')}
                                                                            fullWidth
                                                                        />
                                                                    )}
                                                                    disableClearable
                                                                    value={branchType}
                                                                    onChange={handleBranchTypeChange}
                                                                />
                                                            </Grid>
                                                            <Grid item xs={2}>
                                                                <Tooltip
                                                                    title={l10n.t('Change branch-naming configuration')}
                                                                >
                                                                    <Button
                                                                        color="primary"
                                                                        onClick={handleOpenSettings}
                                                                    >
                                                                        <SettingsIcon fontSize="large" />
                                                                    </Button>
                                                                </Tooltip>
                                                            </Grid>
                                                        </Grid>
                                                    </Grid>
                                                    <Grid item xs={10} md={6} lg={4} xl={4}>
                                                        <TextField
                                                            size="small"
                                                            label={l10n.t('Local branch')}
                                                            fullWidth
                                                            value={localBranch}
                                                            onChange={handleLocalBranchChange}
                                                        />
                                                    </Grid>

                                                    <Grid
                                                        item
                                                        xs={8}
                                                        md={4}
                                                        lg={3}
                                                        xl={3}
                                                        hidden={repository.workspaceRepo.siteRemotes.length <= 1}
                                                    >
                                                        <TextField
                                                            select
                                                            size="small"
                                                            label={l10n.t('Set upstream to')}
                                                            fullWidth
                                                            value={upstream}
                                                            onChange={handleUpstreamChange}
                                                        >
                                                            {repository.workspaceRepo.siteRemotes.map((item) => (
                                                                <MenuItem
                                                                    key={item.remote.name}
                                                                    value={item.remote.name}
                                                                >
                                                                    {item.remote.name}
                                                                </MenuItem>
                                                            ))}
                                                        </TextField>
                                                    </Grid>
                                                    <Grid item hidden={existingBranches.length === 0}>
                                                        <Card raised className={classes.card}>
                                                            <CardContent>
                                                                <Grid container spacing={1}>
                                                                    <Grid item>
                                                                        <HelpOutlineIcon />
                                                                    </Grid>
                                                                    <Grid item>
                                                                        <Typography>Use an existing branch?</Typography>
                                                                        <Typography variant="subtitle2">
                                                                            Click to use an existing branch for this
                                                                            issue
                                                                        </Typography>
                                                                    </Grid>
                                                                </Grid>
                                                                <ul>
                                                                    {existingBranches.map((b: Branch) => (
                                                                        <li key={b.name!}>
                                                                            <Link
                                                                                href="#"
                                                                                data-branch-name={b.name}
                                                                                onClick={handleExistingBranchClick}
                                                                            >
                                                                                {b.type === 0
                                                                                    ? b.name
                                                                                    : b.name?.substring(
                                                                                          b.remote!.length + 1,
                                                                                      )}
                                                                            </Link>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                                <Typography variant="subtitle2">
                                                                    * source branch selection is ignored for existing
                                                                    branches
                                                                </Typography>
                                                            </CardContent>
                                                        </Card>
                                                    </Grid>
                                                    <Grid item>
                                                        <Grid container spacing={1} alignItems="flex-end">
                                                            <Grid item>
                                                                <svg
                                                                    width="141.53846154px"
                                                                    height="60px"
                                                                    viewBox="0 0 92 39"
                                                                >
                                                                    <g stroke="none" strokeWidth="1" fill="none">
                                                                        <g id="branch-diagram-create">
                                                                            <path
                                                                                d="M86,36 C87.6568542,36 89,34.6568542 89,33 C89,31.3431458 87.6568542,30 86,30 C84.3431458,30 83,31.3431458 83,33 C83,34.6568542 84.3431458,36 86,36 Z M80.1081488,34.1399309 C65.7396146,32.2267058 58.0992007,22.7452367 57.5009625,6.05372681 L60.4990375,5.94627319 C61.0417803,21.0894001 67.5381337,29.3713241 80.2936839,31.1405887 C81.0763531,28.7370585 83.3353207,27 86,27 C89.3137085,27 92,29.6862915 92,33 C92,36.3137085 89.3137085,39 86,39 C83.076066,39 80.6406301,36.9084914 80.1081488,34.1399309 Z"
                                                                                id="Combined-Shape"
                                                                                fill="#5E6C84"
                                                                                fillRule="nonzero"
                                                                            ></path>
                                                                            <path
                                                                                d="M53.3414114,8 L11.6585886,8 C10.8349158,10.3303847 8.61243765,12 6,12 C2.6862915,12 0,9.3137085 0,6 C0,2.6862915 2.6862915,0 6,0 C8.61243765,0 10.8349158,1.66961525 11.6585886,4 L53.3414114,4 C54.1650842,1.66961525 56.3875623,0 59,0 C62.3137085,0 65,2.6862915 65,6 C65,9.3137085 62.3137085,12 59,12 C56.3875623,12 54.1650842,10.3303847 53.3414114,8 Z"
                                                                                id="Combined-Shape"
                                                                                fill={theme.palette.primary.main}
                                                                            ></path>
                                                                        </g>
                                                                    </g>
                                                                </svg>
                                                            </Grid>
                                                            <Grid item>
                                                                <Grid container spacing={1} direction="column">
                                                                    <Grid item>
                                                                        <Chip
                                                                            variant="outlined"
                                                                            color="primary"
                                                                            label={sourceBranch.name}
                                                                        />
                                                                    </Grid>
                                                                    <Grid item>
                                                                        <Chip
                                                                            variant="outlined"
                                                                            color="primary"
                                                                            label={`${localBranch}`}
                                                                        />
                                                                    </Grid>
                                                                </Grid>
                                                            </Grid>
                                                        </Grid>
                                                    </Grid>
                                                </Grid>
                                            </Collapse>
                                        </Grid>
                                        <Grid item hidden={submitState === 'submit-success'}>
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                disabled={submitState === 'submitting'}
                                                onClick={handleStartWorkSubmit}
                                                endIcon={
                                                    submitState === 'submitting' ? (
                                                        <CircularProgress
                                                            color="inherit"
                                                            size={theme.typography.fontSize}
                                                        />
                                                    ) : null
                                                }
                                            >
                                                Start
                                            </Button>
                                        </Grid>
                                        <Grid item hidden={submitState === 'submit-success'}>
                                            <PrepareCommitTip />
                                        </Grid>
                                        <Grid item hidden={submitState !== 'submit-success'}>
                                            <Button variant="contained" color="default" onClick={controller.closePage}>
                                                Close
                                            </Button>
                                        </Grid>
                                        <Grid item hidden={submitState !== 'submit-success'}>
                                            <Snackbar
                                                open={successSnackbarOpen}
                                                onClose={handleSuccessSnackbarClose}
                                                autoHideDuration={6000}
                                                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                                            >
                                                <Alert
                                                    variant="standard"
                                                    severity="success"
                                                    action={
                                                        <IconButton
                                                            aria-label="close"
                                                            color="inherit"
                                                            size="small"
                                                            onClick={handleSuccessSnackbarClose}
                                                        >
                                                            <CloseIcon fontSize="inherit" />
                                                        </IconButton>
                                                    }
                                                >
                                                    <AlertTitle>{l10n.t('Success!')}</AlertTitle>
                                                    <p>{l10n.t('See details at the top of this page')}</p>
                                                </Alert>
                                            </Snackbar>
                                        </Grid>
                                    </Grid>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </Container>
            </AtlascodeErrorBoundary>
        </StartWorkControllerContext.Provider>
    );
};

export default StartWorkPage;
