import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { RovoDevPullRequestHandler } from 'src/rovo-dev/rovoDevPullRequestHandler';
import { SearchJiraHelper } from 'src/views/jira/searchJiraHelper';
// import { SearchAllJiraHelper } from 'src/views/jira/searchAllJiraHelper';
import { QuickInputButtons, QuickPickItem, QuickPickItemKind, ThemeIcon } from 'vscode';

import { BaseUI, UiAction, UiResponse } from '../baseUI';
import { StartWorkData } from './startWorkStates';

export class StartWorkFlowUI extends BaseUI {
    constructor() {
        super('Start Work Flow');
    }

    async pickIssue(): Promise<UiResponse<MinimalIssue<DetailedSiteInfo>>> {
        const input = SearchJiraHelper.createIssueQuickPick(true);
        // await SearchAllJiraHelper.createAllIssuesQuickPick(undefined, true);
        if (!input) {
            return { value: undefined, action: UiAction.Back };
        }
        input.buttons = [QuickInputButtons.Back];
        input.title = 'Start Work: Select an Issue';

        return new Promise((resolve, reject) => {
            input.onDidAccept(() => {
                const selection = input.selectedItems;

                if (!selection || selection.length === 0 || selection[0] === null) {
                    resolve({ value: undefined, action: UiAction.Back });
                    input.hide();
                    return;
                }

                resolve({ value: selection[0].issue as MinimalIssue<DetailedSiteInfo>, action: UiAction.Next });
                input.hide();
            });
            input.onDidHide(() => {
                input.dispose();
                resolve({ value: undefined, action: UiAction.Back });
            });
            input.show();
        });
    }

    async pickWillCreateBranch(
        data: Partial<StartWorkData>,
        branches: () => Promise<QuickPickItem[]>,
    ): Promise<
        UiResponse<
            | 'Create new branch from default'
            | 'Create new branch from current'
            | 'Choose another base branch'
            | 'Use current branch'
        >
    > {
        let items = [
            {
                iconPath: new ThemeIcon('git-branch'),
                label: 'Create new branch from default',
                description: `${data.sourceBranchName}`,
            },
            {
                iconPath: new ThemeIcon('git-branch'),
                label: `Create new branch from current`,
                description: `${data.currentBranchName}`,
            },
            {
                iconPath: new ThemeIcon('trash'),
                label: 'Use current branch',
            },
            { kind: QuickPickItemKind.Separator, label: 'other branches' },
        ];

        if (data.currentBranchName?.trim() === data.sourceBranchName?.trim()) {
            items = items.filter((item) => item.label !== 'Fork from current branch');
        }
        const { value, action } = await this.showQuickPick<any>(items, {
            placeHolder: 'Enter source branch for branch creation',
            title: 'Start Work: Branch Creation',
            asyncItems: branches,
        });

        return { value, action };
    }

    async inputBranchName(oldValue: string, issueKey?: string): Promise<UiResponse<string>> {
        const prHandler = new RovoDevPullRequestHandler();

        const { value, action } = await this.showInputBox({
            title: 'Start Work: Enter Branch Name',
            placeHolder: 'Enter branch name',
            value: oldValue,
            valueSelection: [issueKey ? issueKey?.length + 1 : 0, oldValue.length],
            validateInput: async (text: string) => {
                if (text.length === 0) {
                    return 'Branch name cannot be empty';
                }
                if (await prHandler.doesBranchExist(text)) {
                    return `Branch '${text}' already exists`;
                }
                return null;
            },
        });

        return { value, action };
    }

    async pickIssueTransition(issue: MinimalIssue<DetailedSiteInfo>): Promise<UiResponse<string>> {
        const items = issue.transitions.map((x) => ({
            label: x.name,
            description: x.name !== x.to.name ? `${x.to.name}` : '',
        }));

        const { value, action } = await this.showQuickPick<string>(
            [
                { label: 'NAAAAAH', description: 'Do not transition the issue' },
                { kind: QuickPickItemKind.Separator, label: '' },
                ...items,
            ],
            {
                placeHolder: 'Select an issue transition',
                title: 'Start Work: Select Issue Transition',
            },
        );

        return { value, action };
    }

    async pickStartWithRovo(): Promise<UiResponse<boolean | undefined>> {
        const items = [
            {
                label: 'Yes, start with Rovo',
                description: 'Use Rovo to assist with your work on this issue',
            },
            {
                label: 'No, thanks',
                description: 'Do not use Rovo for this issue',
            },
        ];
        const { value, action } = await this.showQuickPick<string>(
            items.map((item, index) => ({
                label: item.label,
                description: item.description,
                value: index === 0,
            })),
            {
                placeHolder: 'Would you like to start working on this issue with Rovo?',
                title: 'Start Work: Use Rovo',
            },
        );

        return { value: value !== 'No, thanks', action };
    }
}
