import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { BaseUI, UiAction, UiResponse } from '../baseUI';
import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
// import { SearchAllJiraHelper } from 'src/views/jira/searchAllJiraHelper';
import { QuickInputButtons, QuickPickItemKind, ThemeIcon } from 'vscode';
import { StartWorkData } from './startWorkStates';
import { SearchJiraHelper } from 'src/views/jira/searchJiraHelper';
import { RovoDevPullRequestHandler } from 'src/rovo-dev/rovoDevPullRequestHandler';

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
    ): Promise<
        UiResponse<'Fork from main' | 'Fork from current branch' | 'Choose another base branch' | 'Use current branch'>
    > {
        const items = [
            {
                iconPath: new ThemeIcon('git-branch'),
                label: 'Fork from main',
            },
            {
                iconPath: new ThemeIcon('git-branch'),
                label: `Fork from current branch`,
                description: `${data.sourceBranchName}`,
            },
            {
                iconPath: new ThemeIcon('git-branch'),
                label: 'Choose another base branch',
                description: 'PLACEHOLDER, WE WILL USE A FULL BRANCH LIST INSTEAD',
            },

            { kind: QuickPickItemKind.Separator, label: '' },
            {
                iconPath: new ThemeIcon('trash'),
                label: 'Use current branch',
                detail: 'Do not create a new branch',
            },
        ];

        const { value, action } = await this.showQuickPick<any>(items, {
            placeHolder: 'Do we create a new branch for you? You can edit the branch name later.',
            title: 'Start Work: Branch Creation',
        });

        return { value, action };
    }

    async inputBranchName(oldValue: string): Promise<UiResponse<string>> {
        const prHandler = new RovoDevPullRequestHandler();

        const { value, action } = await this.showInputBox({
            title: 'Start Work: Enter Branch Name',
            placeHolder: 'Enter branch name',
            value: oldValue,
            valueSelection: [0, oldValue.length],
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
}
