import { expect, FrameLocator, Locator } from '@playwright/test';

export class PRTitle {
    readonly frame: FrameLocator;

    readonly input: Locator;
    readonly inputDC: Locator;
    readonly checkoutButton: Locator;
    readonly checkedOutButton: Locator;

    constructor(frame: FrameLocator) {
        this.frame = frame;

        this.input = this.frame
            .locator('input[value="New Feature Implementation"]')
            .or(this.frame.locator('input[value="test-branch"]'));
        this.inputDC = this.frame.locator('input[value="test-branch"]');
        this.checkoutButton = this.frame.getByRole('button', { name: 'Checkout source branch' });
        this.checkedOutButton = this.frame.getByRole('button', { name: 'Source branch checked out' });
    }

    async expectTitleSectionLoaded() {
        await expect(this.input).toBeVisible();
        await expect(this.checkoutButton.or(this.checkedOutButton)).toBeVisible();
    }
}
