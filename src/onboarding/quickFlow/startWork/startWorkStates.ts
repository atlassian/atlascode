import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { Container } from 'src/container';
import { transitionIssue } from 'src/jira/transitionIssue';
import { RovoDevPullRequestHandler } from 'src/rovo-dev/rovoDevPullRequestHandler';
import { RovoDevJiraContext } from 'src/rovo-dev/rovoDevTypes';
import { window } from 'vscode';

import { UiAction } from '../baseUI';
import { State, Transition } from '../types';
import { StartWorkFlowUI } from './startWorkFlowUI';

export type StartWorkData = {
    // ughhhhh
    issue: MinimalIssue<DetailedSiteInfo>;

    willCreateBranch: boolean;
    sourceBranchName: string;
    targetBranchName: string;

    transitionName?: string;

    startWithRovo?: boolean;
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

            let issue: MinimalIssue<DetailedSiteInfo>;
            if (!data.issue) {
                const { value, action } = await ui.pickIssue();
                if (action === UiAction.Back || !value) {
                    return Transition.back();
                }
                issue = value;
            } else {
                issue = data.issue;
            }
            const currentBranch = await getCurrentBranchName();

            return Transition.forward(this.branchSelector, {
                issue: issue,
                sourceBranchName: currentBranch,
                targetBranchName: issue.key + '-' + issue.summary.replace(/\s+/g, '-').toLowerCase(),
            });
        },
    };

    branchSelector: State<StartWorkFlowUI, Partial<StartWorkData>> = {
        name: 'branchSelector',
        action: async (data: Partial<StartWorkData>, ui: StartWorkFlowUI) => {
            const { value, action } = await ui.pickWillCreateBranch(data);
            // TODO handle start work button cancel
            if (action === UiAction.Back) {
                return Transition.forward(this.finalState);
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
            const { value, action } = await ui.inputBranchName(oldValue, data.issue?.key);
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

            return Transition.forward(this.doStuff, { transitionName: value });
        },
    };

    doStuff: State<StartWorkFlowUI, Partial<StartWorkData>> = {
        name: 'doStuff',
        action: async (data: Partial<StartWorkData>, ui: StartWorkFlowUI) => {
            const prHandler = new RovoDevPullRequestHandler();
            ui.showLoadingIndicator({
                props: { placeHolder: 'Doing stuff...', title: 'Loading' },
                awaitedFunc: async (resolve, reject, input) => {
                    input.busy = true;
                    if (data.willCreateBranch) {
                        try {
                            await prHandler.createBranch(data.targetBranchName!, data.sourceBranchName!);
                        } catch (e) {
                            window.showErrorMessage(`Failed to create branch: ${e}`);
                        }
                    }

                    if (data.transitionName) {
                        try {
                            const transition = data.issue!.transitions.find((t) => t.name === data.transitionName);
                            if (transition) {
                                await transitionIssue(data.issue!, transition, { source: 'Start Work Flow' });
                            }
                        } catch (e) {
                            window.showErrorMessage(`Failed to transition issue: ${e}`);
                        }
                    }
                    input.busy = false;
                    resolve(undefined);
                },
            });

            return Transition.forward(this.rovoStep);
        },
    };

    rovoStep: State<StartWorkFlowUI, Partial<StartWorkData>> = {
        name: 'rovoStep',
        action: async (data: Partial<StartWorkData>, ui: StartWorkFlowUI) => {
            const { value, action } = await ui.pickStartWithRovo();
            if (action === UiAction.Back) {
                return Transition.back();
            }

            return Transition.forward(this.finalState, { startWithRovo: value });
        },
    };

    finalState: State<StartWorkFlowUI, Partial<StartWorkData>> = {
        name: 'finalState',
        isTerminal: true,
        action: async (data: Partial<StartWorkData>, ui: StartWorkFlowUI) => {
            if (data.startWithRovo) {
                const prompt = 'Start working on the following Jira issue: ' + data.issue!.key;
                const context: RovoDevJiraContext = {
                    contextType: 'jiraWorkItem',
                    name: data.issue!.key,
                    url: data.issue?.siteDetails.baseLinkUrl + '/browse/' + data.issue!.key,
                };
                Container.rovodevWebviewProvider.invokeRovoDevAskCommand(prompt, [context]);
            }
            return Transition.done();
        },
    };
}
