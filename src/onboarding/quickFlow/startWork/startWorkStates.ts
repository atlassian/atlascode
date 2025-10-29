import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { State, Transition } from '../types';
import { StartWorkFlowUI } from './startWorkFlowUI';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { UiAction } from '../baseUI';
import { RovoDevPullRequestHandler } from 'src/rovo-dev/rovoDevPullRequestHandler';

export type StartWorkData = {
    // ughhhhh
    issue: MinimalIssue<DetailedSiteInfo>;

    willCreateBranch: boolean;
    sourceBranchName: string;
    targetBranchName: string;

    transitionName?: string;
};

async function getCurrentBranchName(): Promise<string | undefined> {
    const prHandler = new RovoDevPullRequestHandler();
    return prHandler.getCurrentBranchName();
}

export class StartWorkStates {
    public initialState: State<StartWorkFlowUI, Partial<StartWorkData>> = {
        name: 'initial',
        action: async (data: Partial<StartWorkData>, ui: StartWorkFlowUI) => {
            // Initialize the UI with the provided data

            const { value, action } = await ui.pickIssue();
            if (action === UiAction.Back || !value) {
                return Transition.back();
            }

            const currentBranch = await getCurrentBranchName();

            return Transition.forward(this.branchSelector, {
                issue: value,
                sourceBranchName: currentBranch,
                targetBranchName: value.key + '-my-cool-branch',
            });
        },
    };

    branchSelector: State<StartWorkFlowUI, Partial<StartWorkData>> = {
        name: 'branchSelector',
        action: async (data: Partial<StartWorkData>, ui: StartWorkFlowUI) => {
            const { value, action } = await ui.pickWillCreateBranch(data);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            if (value === 'Fork from main') {
                return Transition.forward(this.editTargetBranchName, {
                    willCreateBranch: true,
                    sourceBranchName: 'main',
                });
            } else if (value === 'Fork from current branch') {
                return Transition.forward(this.editTargetBranchName, {
                    willCreateBranch: true,
                    sourceBranchName: await getCurrentBranchName(),
                });
            } else if (value === 'Choose another base branch') {
                return Transition.forward(this.editSourceBranchName, { willCreateBranch: true });
            } else if (value === 'Use current branch') {
                return Transition.forward(this.pickIssueTransition, { willCreateBranch: false });
            } else {
                throw new Error(`Unknown branch action: ${value}`);
            }
        },
    };

    editSourceBranchName: State<StartWorkFlowUI, Partial<StartWorkData>> = {
        name: 'editSourceBranchName',
        action: async (data: Partial<StartWorkData>, ui: StartWorkFlowUI) => {
            const oldValue = data.sourceBranchName || '';
            const { value, action } = await ui.inputBranchName(oldValue);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            return Transition.forward(this.editTargetBranchName, { sourceBranchName: value });
        },
    };

    editTargetBranchName: State<StartWorkFlowUI, Partial<StartWorkData>> = {
        name: 'editTargetBranchName',
        action: async (data: Partial<StartWorkData>, ui: StartWorkFlowUI) => {
            const oldValue = data.targetBranchName || '';
            const { value, action } = await ui.inputBranchName(oldValue);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            return Transition.forward(this.pickIssueTransition, { targetBranchName: value });
        },
    };

    pickIssueTransition: State<StartWorkFlowUI, Partial<StartWorkData>> = {
        name: 'pickIssueTransition',
        action: async (data: Partial<StartWorkData>, ui: StartWorkFlowUI) => {
            const { value, action } = await ui.pickIssueTransition(data.issue!);
            if (action === UiAction.Back) {
                return Transition.back();
            }

            if (value === 'NAAAAAH') {
                return Transition.forward(this.finalState, { transitionName: undefined });
            }

            return Transition.forward(this.finalState, { transitionName: value });
        },
    };

    finalState: State<StartWorkFlowUI, Partial<StartWorkData>> = {
        name: 'finalState',
        isTerminal: true,
        action: async (data: Partial<StartWorkData>, ui: StartWorkFlowUI) => {
            return Transition.done();
        },
    };
}
