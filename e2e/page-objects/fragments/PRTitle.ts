import { expect, FrameLocator, Locator } from '@playwright/test';

export class PRTitle {
    readonly frame: FrameLocator;

    readonly titleInput: Locator;
    readonly titleCheckoutButton: Locator;
    readonly titleCheckedOutButton: Locator;

    constructor(frame: FrameLocator) {
        this.frame = frame;

        this.titleInput = this.frame.locator('input[value="New Feature Implementation"]');
        this.titleCheckoutButton = this.frame.getByRole('button', { name: 'Checkout source branch' });
        this.titleCheckedOutButton = this.frame.getByRole('button', { name: 'Source branch checked out' });
    }

    async expectTitleSectionLoaded() {
        await expect(this.titleInput).toBeVisible();
        await expect(this.titleCheckoutButton.or(this.titleCheckedOutButton)).toBeVisible();
    }
}
