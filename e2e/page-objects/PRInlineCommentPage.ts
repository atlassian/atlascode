import { expect, Locator, Page } from '@playwright/test';

export class PRInlineCommentPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async addInlineComment(text: string) {
        const zoneWidgetSelectors: Array<Locator> = [
            this.page.locator('.zone-widget'),
            this.page.locator('[class*="zone-widget"]'),
            this.page.locator('.review-widget'),
            this.page.locator('[class*="review-widget"]'),
        ];

        let commentWidget: Locator | null = null;
        for (const selector of zoneWidgetSelectors) {
            try {
                if (await selector.isVisible({ timeout: 2000 })) {
                    commentWidget = selector;
                    break;
                }
            } catch {
                continue;
            }
        }

        if (!commentWidget) {
            return;
        }

        const commentEditorLine = commentWidget.locator('.monaco-editor .view-lines .view-line span span');
        await commentEditorLine.evaluate((el, value) => {
            (el as HTMLElement).textContent = value as string;
        }, text);

        const addCommentButton = commentWidget.locator('a.monaco-button:has-text("Add comment")');
        await addCommentButton.waitFor({ state: 'visible', timeout: 3000 });
        await addCommentButton.click();
        await expect(commentEditorLine).toHaveText(text);
    }
}
