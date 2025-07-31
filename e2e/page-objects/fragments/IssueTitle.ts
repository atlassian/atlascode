import { expect, Frame, Locator } from 'playwright/test';

const TITLE_TEST_ID = 'issue.title';

export class IssueTitle {
    readonly frame: Frame;

    readonly title: Locator;

    constructor(frame: Frame) {
        this.frame = frame;

        this.title = this.frame.getByTestId(TITLE_TEST_ID);
    }

    getTitle() {
        return this.title.textContent();
    }

    async changeTo(newTitle: string) {
        await this.title.click();

        const input = this.title.locator('input');
        await expect(input).toBeVisible();
        await input.clear();
        await input.fill(newTitle);
        await expect(input).toHaveValue(newTitle);

        await this.title.locator('.ac-inline-save-button').click();
        await this.frame.waitForTimeout(500);
    }

    async expectEqual(title: string) {
        const currentTitle = await this.getTitle();
        expect(currentTitle).toEqual(title);
    }
}
