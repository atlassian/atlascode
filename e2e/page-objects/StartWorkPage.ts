import { expect, Frame, FrameLocator, Locator } from 'playwright/test';

const TRANSITION_ISSUE_TEST_ID = 'start-work.transition-issue-checkbox';
const GIT_BRANCH_TEST_ID = 'start-work.setup-git-branch-checkbox';
const PUSH_BRANCH_TEST_ID = 'start-work.push-branch-checkbox';
const START_BUTTON_TEST_ID = 'start-work.start-button';

export class StartWorkPage {
    readonly issueFrame: Frame | FrameLocator;

    readonly successToast: Locator;
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
        this.successToast = this.issueFrame.getByRole('presentation').filter({ hasText: 'Success!' });
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
        await expect(this.repositorySelect).toBeVisible();
        await expect(this.repositorySelect).toHaveText(/(mock|dc)-repository/);
        await expect(this.sourceBranchSelect).toBeVisible();
        await expect(this.sourceBranchSelect).toHaveValue('main');
        await expect(this.branchPrefixSelect).toBeVisible();
        await expect(this.branchPrefixSelect).toHaveValue(/bugfix/i);
        await expect(this.localBranchInput).toBeVisible();
        await expect(this.localBranchInput).toHaveValue('bugfix/BTS-1-user-interface-bugs');
    }

    async waitForSuccessToast() {
        await this.successToast.waitFor({ state: 'visible' });
    }
}
