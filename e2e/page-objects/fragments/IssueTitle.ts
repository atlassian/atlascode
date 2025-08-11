import { expect, Frame, Locator } from 'playwright/test';

const TITLE_TEST_ID = 'issue.title';

export class IssueTitle {
    readonly frame: Frame;

    readonly title: Locator;

    constructor(frame: Frame) {
        this.frame = frame;

        this.title = this.frame.getByTestId(TITLE_TEST_ID);
    }

    async getTitle() {
        await expect(this.title).toBeVisible();
        return await this.title.textContent();
    }

    async changeTo(newTitle: string) {
        await expect(this.title).toBeVisible();
        await this.title.click();

        const input = this.title.locator('input');
        await expect(input).toBeVisible();
        await input.clear();
        await input.fill(newTitle);
        await expect(input).toHaveValue(newTitle);

        const saveButton = this.title.locator('.ac-inline-save-button');
        await expect(saveButton).toBeVisible();
        await saveButton.click();
        await this.frame.waitForTimeout(1000); // Increased timeout to allow UI to update
    }

    async expectEqual(title: string) {
        // Wait a bit for potential UI updates before checking
        await this.frame.waitForTimeout(200);
        const currentTitle = await this.getTitle();
        expect(currentTitle).toEqual(title);
    }
}
