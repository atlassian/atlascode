import { Frame, Locator } from 'playwright/test';

export class StartWorkPage {
    readonly issueFrame: Frame;

    readonly startButton: Locator;
    readonly gitBranchCheckbox: Locator;

    constructor(frame: Frame) {
        this.issueFrame = frame;
        this.startButton = this.issueFrame.getByTestId('start-work.start-button');
        this.gitBranchCheckbox = this.issueFrame.getByTestId('start-work.setup-git-branch-checkbox');
    }

    async startWork() {
        await this.startButton.click();
    }

    async setupGitBranch(isEnabled: boolean) {
        const checkbox = this.gitBranchCheckbox.locator('input[type="checkbox"]');
        const isChecked = await checkbox.isChecked();
        if (isChecked !== isEnabled) {
            await checkbox.click();
        }
    }
}
