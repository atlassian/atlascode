import { Frame, FrameLocator, Locator } from 'playwright/test';

const TRANSITION_ISSUE_TEST_ID = 'start-work.transition-issue-checkbox';
const GIT_BRANCH_TEST_ID = 'start-work.setup-git-branch-checkbox';
const PUSH_BRANCH_TEST_ID = 'start-work.push-branch-checkbox';
const START_BUTTON_TEST_ID = 'start-work.start-button';

export class StartWorkPage {
    readonly issueFrame: Frame | FrameLocator;

    readonly successAlert: Locator;
    readonly transitionIssueCheckbox: Locator;
    readonly gitBranchCheckbox: Locator;
    readonly repositorySelect: Locator;
    readonly sourceBranchSelect: Locator;
    readonly branchPrefixSelect: Locator;
    readonly localBranchInput: Locator;
    readonly pushBranchCheckbox: Locator;
    readonly startButton: Locator;

    constructor(frame: Frame | FrameLocator) {
        this.issueFrame = frame;
        // V3: Uses Alert component instead of presentation role
        this.successAlert = this.issueFrame.getByRole('alert').filter({ hasText: 'Assigned the issue' });
        this.transitionIssueCheckbox = this.issueFrame.getByTestId(TRANSITION_ISSUE_TEST_ID);
        this.gitBranchCheckbox = this.issueFrame.getByTestId(GIT_BRANCH_TEST_ID);
        this.repositorySelect = this.issueFrame.getByRole('combobox', { name: 'Repository' });
        this.sourceBranchSelect = this.issueFrame.getByRole('combobox', { name: 'Source branch' });
        this.branchPrefixSelect = this.issueFrame.getByRole('combobox', { name: 'Branch Prefix' });
        this.localBranchInput = this.issueFrame.getByLabel('Local branch');
        this.pushBranchCheckbox = this.issueFrame.getByTestId(PUSH_BRANCH_TEST_ID);
        this.startButton = this.issueFrame.getByTestId(START_BUTTON_TEST_ID);
    }

    async startWork() {
        await this.startButton.click();
    }

    async setupCheckbox(checkboxContainer: Locator, state: boolean) {
        const checkbox = checkboxContainer.locator('input[type="checkbox"]');
        const isChecked = await checkbox.isChecked();
        if (isChecked !== state) {
            await checkbox.click();
        }
    }

    async expectGitBranchSetup() {
        // V3: Just wait for the start button to be ready (V3 doesn't have same accessible names)
        await this.startButton.waitFor({ state: 'visible', timeout: 15000 });
    }

    async waitForSuccessAlert() {
        await this.successAlert.waitFor({ state: 'visible', timeout: 30000 });
    }
}
