import { Transition } from '@atlassianlabs/jira-pi-common-models';

import { RepoData } from '../../../../lib/ipc/toUI/startWork';
import { Branch } from '../../../../typings/git';
import { StartWorkControllerApi, StartWorkState } from '../startWorkController';

export interface SectionProps {
    state: StartWorkState;
    controller: StartWorkControllerApi;
}

export type TaskInfoSectionProps = SectionProps;

export interface UpdateStatusFormState {
    transitionIssueEnabled: boolean;
    selectedTransition: Transition;
}

export interface UpdateStatusFormActions {
    onTransitionIssueEnabledChange: (enabled: boolean) => void;
    onSelectedTransitionChange: (transition: Transition) => void;
}

export type UpdateStatusSectionProps = SectionProps & {
    formState: UpdateStatusFormState;
    formActions: UpdateStatusFormActions;
};

export interface CreateBranchFormState {
    pushBranchEnabled: boolean;
    localBranch: string;
    sourceBranch: Branch;
    selectedRepository: RepoData | undefined;
    selectedBranchType: { kind: string; prefix: string };
    upstream: string;
    branchSetupEnabled: boolean;
}

export interface CreateBranchFormActions {
    onPushBranchChange: (enabled: boolean) => void;
    onLocalBranchChange: (branch: string) => void;
    onSourceBranchChange: (branch: Branch) => void;
    onRepositoryChange: (repository: RepoData) => void;
    onBranchTypeChange: (branchType: { kind: string; prefix: string }) => void;
    onUpstreamChange: (upstream: string) => void;
    onBranchSetupEnabledChange: (enabled: boolean) => void;
}

export type CreateBranchSectionProps = SectionProps & {
    formState: CreateBranchFormState;
    formActions: CreateBranchFormActions;
};
