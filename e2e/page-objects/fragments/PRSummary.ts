import { expect, FrameLocator, Locator } from '@playwright/test';

export class PRSummary {
    readonly frame: FrameLocator;

    readonly sectionButton: Locator;
    readonly input: Locator;

    constructor(frame: FrameLocator) {
        this.frame = frame;

        this.sectionButton = this.frame.getByRole('button', { name: 'Summary' });
        this.input = this.frame.getByText(
            'This pull request implements a new feature with comprehensive tests and documentation.',
        );
    }

    async expectSummarySectionLoaded() {
        await expect(this.sectionButton).toBeVisible();
        await expect(this.input).toBeVisible();
    }
}
