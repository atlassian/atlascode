import { expect, FrameLocator, Locator } from '@playwright/test';

const SUMMARY_TEST_ID = 'pullrequest.summary-panel';
export class PRSummary {
    readonly frame: FrameLocator;

    readonly sectionButton: Locator;
    readonly input: Locator;

    constructor(frame: FrameLocator) {
        this.frame = frame;

        this.sectionButton = this.frame.getByRole('button', { name: 'Summary' });
        this.input = this.frame.getByTestId(SUMMARY_TEST_ID);
    }

    async expectSummarySectionLoaded() {
        await expect(this.sectionButton).toBeVisible();
        await expect(this.input).toBeVisible();
    }
}
