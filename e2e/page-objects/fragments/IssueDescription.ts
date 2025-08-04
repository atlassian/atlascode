import { expect, Frame, Locator } from 'playwright/test';

const DESCRIPTION_TEST_ID = 'issue.description';

export class IssueDescription {
    readonly frame: Frame;

    readonly description: Locator;

    constructor(frame: Frame) {
        this.frame = frame;

        this.description = this.frame.getByTestId(DESCRIPTION_TEST_ID);
    }

    getDescription() {
        return this.description.textContent();
    }

    async changeTo(newDescription: string) {
        await this.description.click();
        const textarea = this.frame.locator('textarea');
        await expect(textarea).toBeVisible();
        await textarea.clear();
        await textarea.fill(newDescription);
    }

    async expectEqual(description: string) {
        const currentDescription = await this.getDescription();
        expect(currentDescription).toEqual(description);
    }
}
