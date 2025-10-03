import { emptyTransition, Transition } from '@atlassianlabs/jira-pi-common-models';
import { useCallback, useContext, useEffect, useState } from 'react';

import { StartWorkActionType } from '../../../../../lib/ipc/fromUI/startWork';
import { RepoData } from '../../../../../lib/ipc/toUI/startWork';
import { Branch } from '../../../../../typings/git';
import { ErrorControllerContext } from '../../../common/errorController';
import { useStartWorkController } from '../../startWorkController';
import { generateBranchName, getDefaultSourceBranch } from '../utils/branchUtils';

export function useStartWorkFormState(
    state: ReturnType<typeof useStartWorkController>[0],
    controller: ReturnType<typeof useStartWorkController>[1],
) {
    const errorController = useContext(ErrorControllerContext);

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
    const [startWithRovoDev, setStartWithRovoDev] = useState(state.rovoDevPreference || false);

    useEffect(() => {
        controller.postMessage({
            type: StartWorkActionType.GetRovoDevPreference,
        });
    }, [controller]);

    useEffect(() => {
        if (state.rovoDevPreference !== undefined) {
            setStartWithRovoDev(state.rovoDevPreference);
        }
    }, [state.rovoDevPreference]);

    // useEffect: default values
    useEffect(() => {
        if (state.repoData.length > 0) {
            const defaultRepo = state.repoData[0];
            setSelectedRepository(defaultRepo);
            setSourceBranch(getDefaultSourceBranch(defaultRepo));
            if (defaultRepo.branchTypes?.length > 0) {
                setSelectedBranchType(defaultRepo.branchTypes[0]);
            }
            if (!upstream) {
                setUpstream(defaultRepo.workspaceRepo.mainSiteRemote.remote.name);
            }
        }
    }, [state.repoData, upstream]);

    // useEffect: auto-generate branch name
    useEffect(() => {
        if (selectedRepository) {
            if (selectedBranchType.prefix) {
                // Generate branch name with prefix using the custom template
                setLocalBranch(
                    generateBranchName(selectedRepository, selectedBranchType, state.issue, state.customTemplate),
                );
            } else {
                // No prefix available, generate branch name without prefix using a template without prefix
                const emptyBranchType = { kind: '', prefix: '' };
                const templateWithoutPrefix = '{{issueKey}}-{{summary}}';
                setLocalBranch(
                    generateBranchName(selectedRepository, emptyBranchType, state.issue, templateWithoutPrefix),
                );
            }
        }
    }, [selectedRepository, selectedBranchType, state.issue, state.customTemplate]);

    const handleRepositoryChange = useCallback(
        (repository: RepoData) => {
            setSelectedRepository(repository);
            setSourceBranch(getDefaultSourceBranch(repository));

            if (repository.branchTypes?.length > 0) {
                setSelectedBranchType(repository.branchTypes[0]);
            } else {
                const convertedCustomPrefixes = state.customPrefixes.map((prefix) => {
                    const normalizedCustomPrefix = prefix.endsWith('/') ? prefix : prefix + '/';
                    return { prefix: normalizedCustomPrefix, kind: prefix };
                });

                if (convertedCustomPrefixes.length > 0) {
                    setSelectedBranchType(convertedCustomPrefixes[0]);
                } else {
                    setSelectedBranchType({ kind: '', prefix: '' });
                }
            }

            if (!upstream) {
                setUpstream(repository.workspaceRepo.mainSiteRemote.remote.name);
            }
        },
        [upstream, state.customPrefixes],
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

    const handleStartWithRovoDevChange = useCallback(
        (enabled: boolean) => {
            setStartWithRovoDev(enabled);
            controller.postMessage({
                type: StartWorkActionType.UpdateRovoDevPreference,
                enabled,
            });
        },
        [controller],
    );

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

            controller.postMessage({ type: StartWorkActionType.RefreshTreeViews });

            // Open Rovo Dev if checkbox is checked
            if (startWithRovoDev) {
                controller.postMessage({
                    type: StartWorkActionType.OpenRovoDev,
                });
            }

            setSubmitResponse(response);
            setSubmitState('submit-success');
            setSnackbarOpen(true);
        } catch (error) {
            console.error(error);
            errorController.showError(error);
            setSubmitState('initial');
        }
    }, [
        selectedRepository,
        controller,
        transitionIssueEnabled,
        selectedTransition,
        branchSetupEnabled,
        sourceBranch,
        localBranch,
        upstream,
        pushBranchEnabled,
        startWithRovoDev,
        errorController,
    ]);

    return {
        controller,
        formState: {
            pushBranchEnabled,
            localBranch,
            sourceBranch,
            selectedRepository,
            selectedBranchType,
            upstream,
            branchSetupEnabled,
            startWithRovoDev,
        },
        formActions: {
            onPushBranchChange: setPushBranchEnabled,
            onLocalBranchChange: setLocalBranch,
            onSourceBranchChange: setSourceBranch,
            onRepositoryChange: handleRepositoryChange,
            onBranchTypeChange: handleBranchTypeChange,
            onUpstreamChange: handleUpstreamChange,
            onBranchSetupEnabledChange: handleBranchSetupEnabledChange,
            onStartWithRovoDevChange: handleStartWithRovoDevChange,
        },
        updateStatusFormState: { transitionIssueEnabled, selectedTransition },
        updateStatusFormActions: {
            onTransitionIssueEnabledChange: handleTransitionIssueEnabledChange,
            onSelectedTransitionChange: handleSelectedTransitionChange,
        },
        handleCreateBranch,
        handleSnackbarClose,
        submitState,
        submitResponse,
        snackbarOpen,
    };
}
