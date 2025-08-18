import { InlineTextEditor } from '@atlassianlabs/guipi-core-components';
import {
    Box,
    Button,
    Container,
    Divider,
    Grid,
    Paper,
    Theme,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import React from 'react';
import { AnalyticsView } from 'src/analyticsTypes';

import { User } from '../../../bitbucket/model';
import { AtlascodeErrorBoundary } from '../common/ErrorBoundary';
import { BranchInfo } from './BranchInfo';
import {
    PullRequestDetailsControllerApi,
    PullRequestDetailsControllerContext,
    PullRequestDetailsState,
    usePullRequestDetailsController,
} from './pullRequestDetailsController';
import { PullRequestHeader } from './PullRequestHeader';
import { PullRequestMainContent } from './PullRequestMainContent';
import { PullRequestSidebar } from './PullRequestSideBar';

const useStyles = makeStyles((theme: Theme) => ({
    grow: {
        flexGrow: 1,
    },
    title: {
        flexGrow: 0,
        marginRight: theme.spacing(3),
        marginLeft: theme.spacing(1),
    },
    paper100: {
        overflow: 'hidden',
        height: '100%',
        backgroundColor: 'transparent',
        boxShadow: 'none',
        border: 'none',
    },
    paperOverflow: {
        overflow: 'hidden',
        backgroundColor: 'transparent',
        boxShadow: 'none',
        border: 'none',
    },
    verticalDivider: {
        height: '100%',
        marginLeft: theme.spacing(1),
        marginRight: theme.spacing(1),
        display: 'none',
        [theme.breakpoints.up('md')]: {
            display: 'block',
        },
    },
}));

interface PullRequestTitleSectionProps {
    state: PullRequestDetailsState;
    controller: PullRequestDetailsControllerApi;
}

const PullRequestTitleSection: React.FC<PullRequestTitleSectionProps> = ({ state, controller }) => {
    return (
        <Box margin={2}>
            <Grid container direction={'column'} spacing={1}>
                <Grid item>
                    <InlineTextEditor fullWidth defaultValue={state.pr.data.title} onSave={controller.updateTitle} />
                </Grid>
                <Grid item>
                    <Grid container direction="row" spacing={2} justifyContent={'space-between'}>
                        <Grid item>
                            <Box marginLeft={2}>
                                <BranchInfo
                                    source={state.pr.data.source}
                                    destination={state.pr.data.destination}
                                    author={state.pr.data.author}
                                    isLoading={state.loadState.basicData}
                                />
                            </Box>
                        </Grid>

                        <Grid item>
                            <Button
                                disabled={
                                    state.pr.data.source.branchName === state.currentBranchName ||
                                    state.isCheckingOutBranch
                                }
                                onClick={controller.checkoutBranch}
                                color={'primary'}
                            >
                                <Typography variant="button" noWrap>
                                    {state.pr.data.source.branchName === state.currentBranchName
                                        ? 'Source branch checked out'
                                        : state.isCheckingOutBranch
                                          ? 'Checking out...'
                                          : 'Checkout source branch'}
                                </Typography>
                            </Button>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </Box>
    );
};

export const PullRequestDetailsPage: React.FunctionComponent = () => {
    const [state, controller] = usePullRequestDetailsController();

    return (
        <PullRequestDetailsControllerContext.Provider value={controller}>
            <AtlascodeErrorBoundary
                context={{ view: AnalyticsView.PullRequestPage }}
                postMessageFunc={controller.postMessage}
            >
                <Container maxWidth="xl">
                    <PullRequestDetailsPageContent state={state} controller={controller} />
                </Container>
            </AtlascodeErrorBoundary>
        </PullRequestDetailsControllerContext.Provider>
    );
};

interface PullRequestDetailsPageContentProps {
    state: PullRequestDetailsState;
    controller: PullRequestDetailsControllerApi;
}
function PullRequestDetailsPageContent({ state, controller }: PullRequestDetailsPageContentProps) {
    const classes = useStyles();
    const theme = useTheme();
    const isWideScreen = useMediaQuery(theme.breakpoints.up('md'));
    const handleFetchUsers = AwesomeDebouncePromise(
        async (input: string, abortSignal?: AbortSignal): Promise<User[]> => {
            return await controller.fetchUsers(state.pr.site, input, abortSignal);
        },
        300,
        { leading: false },
    );
    return (
        <>
            <PullRequestHeader state={state} controller={controller} />
            <Divider />
            <Box marginTop={1} />
            <Grid container spacing={1} direction="row">
                <Grid item xs={12} md={9} lg={9} xl={9}>
                    <Paper className={classes.paper100}>
                        <PullRequestTitleSection state={state} controller={controller} />
                        <PullRequestMainContent
                            state={state}
                            controller={controller}
                            handleFetchUsers={handleFetchUsers}
                        />
                    </Paper>
                </Grid>
                <Grid
                    item
                    xs={12}
                    md={3}
                    lg={3}
                    xl={3}
                    style={{ borderLeft: isWideScreen ? '1px solid var(--vscode-input-border)' : 'none' }}
                >
                    <Paper className={classes.paperOverflow}>
                        <PullRequestSidebar state={state} controller={controller} />
                    </Paper>
                </Grid>
            </Grid>
        </>
    );
}
export default PullRequestDetailsPage;
