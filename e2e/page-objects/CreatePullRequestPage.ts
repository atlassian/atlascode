import { FrameLocator, Locator, Page } from '@playwright/test';

export class CreatePullRequestPage {
    readonly page: Page;

    readonly createPRFrame: FrameLocator;
    readonly sourceBranchPicker: Locator;
    readonly testBranchOption: Locator;
    readonly pushCheckbox: Locator;
    readonly createPullRequestButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.createPRFrame = this.page
            .frameLocator('iframe.webview')
            .frameLocator('iframe[title="Create pull request"]');

        this.sourceBranchPicker = this.createPRFrame.getByRole('combobox', { name: 'Source branch' });

        this.testBranchOption = this.createPRFrame.getByRole('option', { name: 'test-branch' });

        this.pushCheckbox = this.createPRFrame
            .locator('div:has-text("Push latest changes from local to remote branch")')
            .locator('input[type="checkbox"]')
            .first();

        this.createPullRequestButton = this.createPRFrame.getByRole('button', { name: 'Create pull request' });
    }
}
