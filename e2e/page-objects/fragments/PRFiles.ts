import { expect, FrameLocator, Locator, Page } from '@playwright/test';

export class PRFiles {
    readonly frame: FrameLocator;
    readonly page: Page;

    readonly sectionButton: Locator;
    readonly commitsTable: Locator;
    readonly changedFile: Locator;

    constructor(frame: FrameLocator, page: Page) {
        this.frame = frame;
        this.page = page;

        this.sectionButton = this.frame.getByRole('button', { name: 'Files Changed' });
        this.commitsTable = this.frame.getByRole('table', { name: 'commits list' }).last();
        this.changedFile = this.commitsTable.getByRole('button', { name: 'test2.json' });
    }

    async expectFilesSectionLoaded() {
        await expect(this.sectionButton).toBeVisible();
        await expect(this.commitsTable).toBeVisible();
        await expect(this.changedFile).toBeVisible();
    }

    async addInlineComment() {
        const zoneWidgetSelectors = [
            this.frame.locator('.zone-widget'),
            this.frame.locator('[class*="zone-widget"]'),
            this.frame.locator('.review-widget'),
            this.frame.locator('[class*="review-widget"]'),
            this.page.locator('.zone-widget'),
            this.page.locator('[class*="zone-widget"]'),
            this.page.locator('.review-widget'),
            this.page.locator('[class*="review-widget"]'),
        ];

        let commentWidget: any = null;
        for (const selector of zoneWidgetSelectors) {
            try {
                if (await selector.isVisible({ timeout: 2000 })) {
                    commentWidget = selector;
                    break;
                }
                // eslint-disable-next-line no-unused-vars
            } catch (e) {
                continue;
            }
        }

        if (!commentWidget) {
            return;
        }

        // Add "test comment" to the Monaco editor inside the comment widget
        try {
            const commentEditorLine = commentWidget.locator('.monaco-editor .view-lines .view-line span span');
            await commentEditorLine.evaluate((el: any) => {
                el.textContent = 'test comment';
            });
            // Click the "Add comment" button
            const addCommentButton = commentWidget.locator('a.monaco-button:has-text("Add comment")');
            await addCommentButton.waitFor({ state: 'visible', timeout: 3000 });
            await this.page.waitForTimeout(500);
            await addCommentButton.click();
            await expect(commentEditorLine).toHaveText('test comment');
        } catch (error) {
            throw new Error(`Failed to add inline comment: ${error}`);
        }
    }
}
