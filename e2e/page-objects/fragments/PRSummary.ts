import { expect, FrameLocator, Locator } from '@playwright/test';

export class PRSummary {
    readonly frame: FrameLocator;

    readonly summaryButton: Locator;
    readonly summaryInput: Locator;

    constructor(frame: FrameLocator) {
        this.frame = frame;

        this.summaryButton = this.frame.getByRole('button', { name: 'Summary' });
        this.summaryInput = this.frame.getByText(
            'This pull request implements a new feature with comprehensive tests and documentation.',
        );
    }

    async expectSummarySectionLoaded() {
        await expect(this.summaryButton).toBeVisible();
        await expect(this.summaryInput).toBeVisible();
    }
}
