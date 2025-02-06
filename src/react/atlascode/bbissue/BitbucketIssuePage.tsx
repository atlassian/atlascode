import { RefreshButton } from '@atlassianlabs/guipi-core-components';
import { JiraIcon } from '@atlassianlabs/guipi-jira-components';
import {
    AppBar,
    Avatar,
    Box,
    Button,
    Container,
    Divider,
    Grid,
    IconButton,
    Link,
    makeStyles,
    Paper,
    Theme,
    Toolbar,
    Tooltip,
    Typography,
} from '@material-ui/core';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import BlockIcon from '@material-ui/icons/Block';
import BugReportIcon from '@material-ui/icons/BugReport';
import CheckBoxOutlinedIcon from '@material-ui/icons/CheckBoxOutlined';
import EmojiObjectsIcon from '@material-ui/icons/EmojiObjects';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import RadioButtonUncheckedIcon from '@material-ui/icons/RadioButtonUnchecked';
import RemoveRedEyeOutlinedIcon from '@material-ui/icons/RemoveRedEyeOutlined';
import StarBorder from '@material-ui/icons/StarBorder';
import { format, parseISO } from 'date-fns';
import React, { useCallback } from 'react';
import CommentForm from '../common/CommentForm';
import { CopyLinkButton } from '../common/CopyLinkButton';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { PMFDisplay } from '../common/pmf/PMFDisplay';
import { BitbucketIssueControllerContext, useBitbucketIssueController } from './bitbucketIssueController';
import StatusMenu from './StatusMenu';
import UserPicker from './UserPicker';
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

const BitbucketIssuePage: React.FunctionComponent = () => {
    const classes = useStyles();
    const [state, controller] = useBitbucketIssueController();

    const handleStatusChange = useCallback(
        async (newStatus: string) => {
            const status = await controller.updateStatus(newStatus);
            controller.applyChange({ issue: { state: status } });
        },
        [controller],
    );

    const handleSaveComment = useCallback(
        async (content: string) => {
            const comment = await controller.postComment(content);
            controller.applyChange({ comments: [comment] });
        },
        [controller],
    );

    const handleAssign = useCallback(
        async (accountId?: string) => {
            const assignee = await controller.assign(accountId);
            controller.applyChange({
                issue: {
                    assignee: {
                        display_name: assignee.displayName,
                        uuid: '',
                        links: {
                            avatar: {
                                href: assignee.avatarUrl,
                            },
                        },
                        type: 'user',
                        account_id: assignee.accountId,
                    },
                },
            });
        },
        [controller],
    );

    return (
        <BitbucketIssueControllerContext.Provider value={controller}>
            <AtlascodeErrorBoundary
                context={{ view: AnalyticsView.BitbucketIssuePage }}
                postMessageFunc={controller.postMessage}
            >
                <Container maxWidth="xl" hidden={state.issue.data.id === ''}>
                    <AppBar position="relative">
                        <Toolbar>
                            <Typography variant="h3" className={classes.title}>
                                <Link href={state.issue.data.links?.html?.href}>#{state.issue.data.id}</Link>{' '}
                                {state.issue.data.title}
                            </Typography>
                            <Box className={classes.grow} />
                            <CopyLinkButton
                                tooltip={l10n.t('Copy link to issue')}
                                url={state.issue.data.links?.html?.href}
                                onClick={controller.copyLink}
                            />
                            <Box marginRight={1} hidden={!state.showJiraButton}>
                                <Tooltip title={l10n.t('Create Jira issue')}>
                                    <IconButton aria-label="create Jira issue" onClick={controller.createJiraIssue}>
                                        <JiraIcon />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Tooltip title={l10n.t('Create a branch and assign issue to me')}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<PlayArrowIcon />}
                                    onClick={controller.startWork}
                                >
                                    Start work
                                </Button>
                            </Tooltip>
                            <RefreshButton loading={state.isSomethingLoading} onClick={controller.refresh} />
                        </Toolbar>
                    </AppBar>
                    <Grid container spacing={1}>
                        <Grid item xs={12} md={9} lg={9} xl={9} zeroMinWidth>
                            <Paper className={classes.paper100}>
                                <Box margin={2}>
                                    <ErrorDisplay />
                                    <PMFDisplay postMessageFunc={controller.postMessage} />
                                    <Grid container spacing={2} direction="column">
                                        <Grid item>
                                            <Box />
                                        </Grid>
                                        <Grid item zeroMinWidth>
                                            <Typography variant="h4">
                                                <Box fontWeight="fontWeightBold">{l10n.t('Summary')}</Box>
                                            </Typography>
                                        </Grid>
                                        <Grid item xs zeroMinWidth>
                                            <Typography
                                                variant="body1"
                                                dangerouslySetInnerHTML={{ __html: state.issue.data.content.html }}
                                            />
                                        </Grid>
                                        <Grid item>
                                            <Divider />
                                        </Grid>
                                        <Grid item zeroMinWidth>
                                            <Typography variant="h4">
                                                <Box fontWeight="fontWeightBold">{l10n.t('Comments')}</Box>
                                            </Typography>
                                        </Grid>
                                        <Grid item xs zeroMinWidth>
                                            <Grid container spacing={2} direction="column">
                                                {state.comments.map((c) => (
                                                    <Grid item key={c.id} xs zeroMinWidth>
                                                        <Grid
                                                            container
                                                            spacing={1}
                                                            direction="row"
                                                            alignItems="flex-start"
                                                        >
                                                            <Grid item zeroMinWidth>
                                                                <Avatar
                                                                    src={c.user.avatarUrl}
                                                                    alt={c.user.displayName}
                                                                />
                                                            </Grid>
                                                            <Grid item xs zeroMinWidth>
                                                                <Typography variant="subtitle2">
                                                                    {c.user.displayName}
                                                                    {'  '}
                                                                    {c.ts
                                                                        ? format(parseISO(c.ts), 'yyyy-MM-dd h:mm a')
                                                                        : ''}
                                                                </Typography>
                                                                <Typography
                                                                    dangerouslySetInnerHTML={{ __html: c.htmlContent }}
                                                                />
                                                            </Grid>
                                                        </Grid>
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        </Grid>
                                        <Grid item>
                                            <CommentForm
                                                currentUser={state.currentUser}
                                                onSave={handleSaveComment}
                                                fetchUsers={controller.fetchUsers}
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={3} lg={3} xl={3}>
                            <Paper className={classes.paperOverflow}>
                                <Box margin={2}>
                                    <Grid container spacing={1} direction="column">
                                        <Grid item>
                                            <Grid container spacing={1} direction="row" alignItems="center">
                                                <Grid item>
                                                    <Tooltip title={l10n.t('Watches')}>
                                                        <Button
                                                            variant="contained"
                                                            startIcon={<RemoveRedEyeOutlinedIcon />}
                                                        >
                                                            {state.issue.data.watches || 0}
                                                        </Button>
                                                    </Tooltip>
                                                </Grid>
                                                <Grid item>
                                                    <Tooltip title={l10n.t('Votes')}>
                                                        <Button variant="contained" startIcon={<StarBorder />}>
                                                            {state.issue.data.votes || 0}
                                                        </Button>
                                                    </Tooltip>
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                        <Grid item>
                                            <Typography variant="h6">
                                                <strong>{l10n.t('Status')}</strong>
                                            </Typography>
                                            <StatusMenu status={state.issue.data.state} onChange={handleStatusChange} />
                                        </Grid>
                                        <Grid item>
                                            <Grid item>
                                                <Typography variant="h6">
                                                    <strong>{l10n.t('Kind')}</strong>
                                                </Typography>
                                            </Grid>
                                            <Grid container spacing={1} direction="row">
                                                <Grid item>{typeIcon[state.issue.data.kind]}</Grid>
                                                <Grid item>
                                                    <Typography>{state.issue.data.kind}</Typography>
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                        <Grid item>
                                            <Grid item>
                                                <Typography variant="h6">
                                                    <strong>{l10n.t('Priority')}</strong>
                                                </Typography>
                                            </Grid>
                                            <Grid container spacing={1} direction="row">
                                                <Grid item>{priorityIcon[state.issue.data.priority]}</Grid>
                                                <Grid item>
                                                    <Typography>{state.issue.data.priority}</Typography>
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                        <Grid item>
                                            <Grid item>
                                                <Typography variant="h6">
                                                    <strong>{l10n.t('Assignee')}</strong>
                                                </Typography>
                                            </Grid>
                                            <Grid item>
                                                <UserPicker
                                                    user={{
                                                        accountId: state.issue.data?.assignee?.account_id,
                                                        avatarUrl: state.issue.data?.assignee?.links?.avatar?.href,
                                                        displayName:
                                                            state.issue.data?.assignee?.display_name || 'Unassigned',
                                                        mention: '',
                                                        url: '',
                                                    }}
                                                    onChange={handleAssign}
                                                />
                                            </Grid>
                                        </Grid>
                                        <Grid item>
                                            <Grid item>
                                                <Typography variant="h6">
                                                    <strong>{l10n.t('Reporter')}</strong>
                                                </Typography>
                                            </Grid>
                                            <Grid container spacing={1} direction="row" alignItems="center">
                                                <Grid item>
                                                    <Avatar src={state.issue.data?.reporter?.links?.avatar?.href} />
                                                </Grid>
                                                <Grid item>
                                                    <Typography>{state.issue.data?.reporter?.display_name}</Typography>
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                        <Grid item>
                                            <Grid item>
                                                <Typography variant="h6">
                                                    <strong>{l10n.t('Created')}</strong>
                                                </Typography>
                                            </Grid>
                                            <Grid item>
                                                <Tooltip title={state.issue.data.created_on || 'unknown'}>
                                                    <Typography>
                                                        {state.issue.data.created_on
                                                            ? format(
                                                                  parseISO(state.issue.data.created_on),
                                                                  'yyyy-MM-dd h:mm a',
                                                              )
                                                            : ''}
                                                    </Typography>
                                                </Tooltip>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </Container>
            </AtlascodeErrorBoundary>
        </BitbucketIssueControllerContext.Provider>
    );
};

export default BitbucketIssuePage;
