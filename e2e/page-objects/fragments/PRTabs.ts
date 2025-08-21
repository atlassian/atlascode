import { FrameLocator, Locator } from '@playwright/test';

export class PRTabs {
    readonly frame: FrameLocator;

    constructor(frame: FrameLocator) {
        this.frame = frame;
    }

    async goToDetailsTab() {
        const possibleSelectors: Locator[] = [
            this.frame.getByRole('tab', { name: 'Details' }),
            this.frame.getByRole('tab', { name: /details/i }),
            this.frame.getByText('Details'),
            this.frame.locator('[aria-label="Details"]'),
            this.frame.locator('button:has-text("Details")'),
        ];

        for (const selector of possibleSelectors) {
            try {
                if (await selector.isVisible({ timeout: 1000 })) {
                    await selector.click();
                    return;
                }
            } catch {
                continue;
            }
        }
    }
}
