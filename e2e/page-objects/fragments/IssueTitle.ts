import { expect, Frame, Locator } from 'playwright/test';

const TITLE_TEST_ID = 'issue.title';

export class IssueTitle {
    readonly frame: Frame;

    readonly title: Locator;

    constructor(frame: Frame) {
        this.frame = frame;

        this.title = this.frame.getByTestId(TITLE_TEST_ID);
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
        await this.frame.waitForTimeout(2_000);
    }

    async expectEqual(expectedTitle: string) {
        await this.title.scrollIntoViewIfNeeded();
        await this.title.waitFor({ state: 'visible', timeout: 5_000 });
        await expect(this.title).toHaveCount(1);
        await expect(this.title).toHaveText(/.+/, { timeout: 5_000 });

        const currentTitle = (await this.title.innerText()).trim();
        expect(currentTitle).toMatch(new RegExp(expectedTitle, 'i'));
    }
}
