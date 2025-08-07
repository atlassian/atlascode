import { emptyTransition, Transition } from '@atlassianlabs/jira-pi-common-models';
import { Box, Button, CircularProgress, Typography } from '@material-ui/core';
import React, { useCallback, useEffect, useState } from 'react';
import { AnalyticsView } from 'src/analyticsTypes';

import { StartWorkActionType } from '../../../../lib/ipc/fromUI/startWork';
import { RepoData } from '../../../../lib/ipc/toUI/startWork';
import { Branch } from '../../../../typings/git';
import { AtlascodeErrorBoundary } from '../../common/ErrorBoundary';
import { StartWorkControllerContext, useStartWorkController } from '../startWorkController';
import {
    CreateBranchSection,
    SnackbarNotification,
    SuccessAlert,
    TaskInfoSection,
    UpdateStatusSection,
} from './components';
import { generateBranchName, getDefaultSourceBranch } from './utils/branchUtils';

const StartWorkPageV3: React.FunctionComponent = () => {
    const [state, controller] = useStartWorkController();
    const [pushBranchEnabled, setPushBranchEnabled] = useState(true);
    const [localBranch, setLocalBranch] = useState('');
    const [sourceBranch, setSourceBranch] = useState<Branch>({ type: 0, name: '' });
    const [selectedRepository, setSelectedRepository] = useState<RepoData | undefined>(state.repoData[0]);
    const [selectedBranchType, setSelectedBranchType] = useState<{ kind: string; prefix: string }>({
        kind: '',
        prefix: '',
    });
    const [upstream, setUpstream] = useState('');
    const [transitionIssueEnabled, setTransitionIssueEnabled] = useState(true);
    const [selectedTransition, setSelectedTransition] = useState<Transition>(emptyTransition);
    const [branchSetupEnabled, setBranchSetupEnabled] = useState(true);
    const [submitState, setSubmitState] = useState<'initial' | 'submitting' | 'submit-success'>('initial');
    const [submitResponse, setSubmitResponse] = useState<{
        transistionStatus?: string;
        branch?: string;
        upstream?: string;
    }>({});
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    // Initialize form with default values
    useEffect(() => {
        if (state.repoData.length > 0) {
            const defaultRepo = state.repoData[0];
            setSelectedRepository(defaultRepo);
            const defaultSourceBranch = getDefaultSourceBranch(defaultRepo);
            setSourceBranch(defaultSourceBranch);

            // Set default branch type
            if (defaultRepo.branchTypes && defaultRepo.branchTypes.length > 0) {
                setSelectedBranchType(defaultRepo.branchTypes[0]);
            }

            if (!upstream) {
                setUpstream(defaultRepo.workspaceRepo.mainSiteRemote.remote.name);
            }
        }
    }, [state.repoData, upstream]);

    // Generate branch name when dependencies change
    useEffect(() => {
        if (selectedRepository && selectedBranchType.prefix) {
            const generatedName = generateBranchName(
                selectedRepository,
                selectedBranchType,
                state.issue,
                state.customTemplate,
            );
            setLocalBranch(generatedName);
        }
    }, [selectedRepository, selectedBranchType, state.issue, state.customTemplate]);

    const handleRepositoryChange = useCallback(
        (repository: RepoData) => {
            setSelectedRepository(repository);
            const defaultSourceBranch = getDefaultSourceBranch(repository);
            setSourceBranch(defaultSourceBranch);

            if (repository.branchTypes && repository.branchTypes.length > 0) {
                setSelectedBranchType(repository.branchTypes[0]);
            }

            if (!upstream) {
                setUpstream(repository.workspaceRepo.mainSiteRemote.remote.name);
            }
        },
        [upstream],
    );

    const handleBranchTypeChange = useCallback((branchType: { kind: string; prefix: string }) => {
        setSelectedBranchType(branchType);
    }, []);

    const handleUpstreamChange = useCallback((newUpstream: string) => {
        setUpstream(newUpstream);
    }, []);

    const handleTransitionIssueEnabledChange = useCallback((enabled: boolean) => {
        setTransitionIssueEnabled(enabled);
    }, []);

    const handleSelectedTransitionChange = useCallback((transition: Transition) => {
        setSelectedTransition(transition);
    }, []);

    const handleBranchSetupEnabledChange = useCallback((enabled: boolean) => {
        setBranchSetupEnabled(enabled);
    }, []);

    const handleSnackbarClose = useCallback(() => {
        setSnackbarOpen(false);
    }, []);

    const handleCreateBranch = useCallback(async () => {
        setSubmitState('submitting');

        try {
            if (!selectedRepository) {
                throw new Error('No repository selected');
            }

            const response = await controller.startWork(
                transitionIssueEnabled,
                selectedTransition,
                branchSetupEnabled,
                selectedRepository.workspaceRepo,
                sourceBranch,
                localBranch,
                upstream,
                pushBranchEnabled,
            );

            // Send message to refresh tree views after successful start work
            controller.postMessage({
                type: StartWorkActionType.RefreshTreeViews,
            });

            setSubmitResponse(response);
            setSubmitState('submit-success');
            setSnackbarOpen(true);
        } catch (error) {
            console.error('Error creating branch:', error);
            setSubmitState('initial');
        }
    }, [
        controller,
        transitionIssueEnabled,
        selectedTransition,
        branchSetupEnabled,
        pushBranchEnabled,
        localBranch,
        sourceBranch,
        selectedRepository,
        upstream,
    ]);

    const formState = {
        pushBranchEnabled,
        localBranch,
        sourceBranch,
        selectedRepository,
        selectedBranchType,
        upstream,
        branchSetupEnabled,
    };

    const formActions = {
        onPushBranchChange: setPushBranchEnabled,
        onLocalBranchChange: setLocalBranch,
        onSourceBranchChange: setSourceBranch,
        onRepositoryChange: handleRepositoryChange,
        onBranchTypeChange: handleBranchTypeChange,
        onUpstreamChange: handleUpstreamChange,
        onBranchSetupEnabledChange: handleBranchSetupEnabledChange,
    };

    const updateStatusFormState = {
        transitionIssueEnabled,
        selectedTransition,
    };

    const updateStatusFormActions = {
        onTransitionIssueEnabledChange: handleTransitionIssueEnabledChange,
        onSelectedTransitionChange: handleSelectedTransitionChange,
    };

    return (
        <StartWorkControllerContext.Provider value={controller}>
            <AtlascodeErrorBoundary
                context={{ view: AnalyticsView.StartWorkPageV3 }}
                postMessageFunc={controller.postMessage}
            >
                <Box marginTop={7} maxWidth="654px" padding={3} marginX="auto">
                    <Box marginBottom={2}>
                        <Typography variant="h3" style={{ fontWeight: 700 }}>
                            Start work
                        </Typography>
                    </Box>

                    {submitState === 'submit-success' && <SuccessAlert submitResponse={submitResponse} />}

                    <TaskInfoSection state={state} controller={controller} />
                    <CreateBranchSection
                        state={state}
                        controller={controller}
                        formState={formState}
                        formActions={formActions}
                    />
                    <UpdateStatusSection
                        state={state}
                        controller={controller}
                        formState={updateStatusFormState}
                        formActions={updateStatusFormActions}
                    />

                    {submitState !== 'submit-success' && (
                        <Button
                            variant="contained"
                            color="primary"
                            disabled={submitState === 'submitting'}
                            onClick={handleCreateBranch}
                            endIcon={
                                submitState === 'submitting' ? <CircularProgress color="inherit" size={20} /> : null
                            }
                        >
                            Create branch
                        </Button>
                    )}

                    {submitState === 'submit-success' && (
                        <Button variant="contained" color="default" onClick={controller.closePage}>
                            Close
                        </Button>
                    )}
                </Box>

                {submitState === 'submit-success' && (
                    <SnackbarNotification
                        open={snackbarOpen}
                        onClose={handleSnackbarClose}
                        title="Success!"
                        message="See details at the top of this page"
                        severity="success"
                    />
                )}
            </AtlascodeErrorBoundary>
        </StartWorkControllerContext.Provider>
    );
};

export default StartWorkPageV3;
