import { RefreshButton } from '@atlassianlabs/guipi-core-components';
import {
    AppBar,
    Box,
    Button,
    CircularProgress,
    Container,
    Grid,
    IconButton,
    makeStyles,
    MenuItem,
    Paper,
    TextField,
    Theme,
    Toolbar,
    Tooltip,
    Typography,
    useTheme,
} from '@material-ui/core';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import BlockIcon from '@material-ui/icons/Block';
import BugReportIcon from '@material-ui/icons/BugReport';
import CheckBoxOutlinedIcon from '@material-ui/icons/CheckBoxOutlined';
import EmojiObjectsIcon from '@material-ui/icons/EmojiObjects';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import LaunchIcon from '@material-ui/icons/Launch';
import RadioButtonUncheckedIcon from '@material-ui/icons/RadioButtonUnchecked';
import React, { useCallback, useState } from 'react';
import { emptyBitbucketSite } from '../../../bitbucket/model';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { PMFDisplay } from '../common/pmf/PMFDisplay';
import {
    CreateBitbucketIssueControllerContext,
    useCreateBitbucketIssueController,
} from './createBitbucketIssueController';
import { AtlascodeErrorBoundary } from '../common/ErrorBoundary';
import { AnalyticsView } from 'src/analyticsTypes';
import * as l10n from '@vscode/l10n';

const priorityIcon = {
    trivial: <RadioButtonUncheckedIcon />,
    minor: <ArrowDownwardIcon />,
    major: <KeyboardArrowUpIcon />,
    critical: <ArrowUpwardIcon />,
    blocker: <BlockIcon />,
};

const typeIcon = {
    bug: <BugReportIcon />,
    enhancement: <ArrowUpwardIcon />,
    proposal: <EmojiObjectsIcon />,
    task: <CheckBoxOutlinedIcon />,
};

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
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
        }) as const,
);

const CreateBitbucketIssuePage: React.FunctionComponent = () => {
    const theme = useTheme<Theme>();
    const classes = useStyles();
    const [state, controller] = useCreateBitbucketIssueController();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [kind, setKind] = useState<'bug' | 'enhancement' | 'proposal' | 'task'>('enhancement');
    const [priority, setPriority] = useState<'trivial' | 'minor' | 'major' | 'critial' | 'blocker'>('minor');
    const [submitState, setSubmitState] = useState<'initial' | 'submitting'>('initial');

    const handleTitleChange = useCallback(
        (event: React.ChangeEvent<{ name?: string | undefined; value: any }>) => {
            setTitle(event.target.value);
        },
        [setTitle],
    );
    const handleDescriptionChange = useCallback(
        (event: React.ChangeEvent<{ name?: string | undefined; value: any }>) => {
            setDescription(event.target.value);
        },
        [setDescription],
    );
    const handleKindChange = useCallback(
        (event: React.ChangeEvent<{ name?: string | undefined; value: any }>) => {
            setKind(event.target.value);
        },
        [setKind],
    );
    const handlePriorityChange = useCallback(
        (event: React.ChangeEvent<{ name?: string | undefined; value: any }>) => {
            setPriority(event.target.value);
        },
        [setPriority],
    );

    const submitForm = useCallback(async () => {
        try {
            setSubmitState('submitting');
            await controller.submit({
                site: state.site,
                title,
                description,
                kind,
                priority,
            });
        } finally {
            // Resetting back to inital state both in error and success case
            // (ok to do this for success case as the webview is hidden automatically if the request succeeds)
            setSubmitState('initial');
        }
    }, [controller, state.site, title, description, kind, priority]);

    return (
        <CreateBitbucketIssueControllerContext.Provider value={controller}>
            <AtlascodeErrorBoundary
                context={{ view: AnalyticsView.CreateBitbucketIssuePage }}
                postMessageFunc={controller.postMessage}
            >
                <Container maxWidth="lg" hidden={state.site === emptyBitbucketSite}>
                    <AppBar position="relative">
                        <Toolbar>
                            <Typography variant="h3" className={classes.title}>
                                Create issue - {state.site.ownerSlug}/{state.site.repoSlug}
                            </Typography>
                            <Box className={classes.grow} />
                            <Tooltip title={l10n.t('Create in browser...')}>
                                <IconButton
                                    href={`https://bitbucket.org/${state.site.ownerSlug}/${state.site.repoSlug}/issues/new`}
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
                                    <form onSubmit={submitForm}>
                                        <Grid container spacing={1} direction="column">
                                            <Grid item xs={12}>
                                                <TextField
                                                    required
                                                    fullWidth
                                                    size="small"
                                                    label="Title"
                                                    name="title"
                                                    value={title}
                                                    onChange={handleTitleChange}
                                                />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <TextField
                                                    fullWidth
                                                    multiline
                                                    size="small"
                                                    rows={4}
                                                    value={description}
                                                    onChange={handleDescriptionChange}
                                                    label="Description"
                                                    name="description"
                                                />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <TextField
                                                    select
                                                    size="small"
                                                    label="Kind"
                                                    name="kind"
                                                    value={kind}
                                                    onChange={handleKindChange}
                                                >
                                                    {Object.getOwnPropertyNames(typeIcon).map((name) => (
                                                        <MenuItem key={name} value={name}>
                                                            <Grid container spacing={1} direction="row">
                                                                <Grid item>{typeIcon[name]}</Grid>
                                                                <Grid item>
                                                                    <Typography>{name}</Typography>
                                                                </Grid>
                                                            </Grid>
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
                                            </Grid>
                                            <Grid item xs={12}>
                                                <TextField
                                                    select
                                                    size="small"
                                                    label="Priority"
                                                    name="priority"
                                                    value={priority}
                                                    onChange={handlePriorityChange}
                                                >
                                                    {Object.getOwnPropertyNames(priorityIcon).map((name) => (
                                                        <MenuItem key={name} value={name}>
                                                            <Grid container spacing={1} direction="row">
                                                                <Grid item>{priorityIcon[name]}</Grid>
                                                                <Grid item>
                                                                    <Typography>{name}</Typography>
                                                                </Grid>
                                                            </Grid>
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    type="submit"
                                                    endIcon={
                                                        submitState === 'submitting' ? (
                                                            <CircularProgress
                                                                color="inherit"
                                                                size={theme.typography.fontSize}
                                                            />
                                                        ) : null
                                                    }
                                                >
                                                    Submit
                                                </Button>
                                            </Grid>
                                        </Grid>
                                    </form>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </Container>
            </AtlascodeErrorBoundary>
        </CreateBitbucketIssueControllerContext.Provider>
    );
};

export default CreateBitbucketIssuePage;
