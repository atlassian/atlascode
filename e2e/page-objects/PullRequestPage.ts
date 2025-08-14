import { expect, FrameLocator, Page } from '@playwright/test';
import { PRHeader } from 'e2e/page-objects/fragments';

export class PullRequestPage {
    readonly page: Page;

    readonly prFrame: FrameLocator;
    readonly prHeader: PRHeader;

    constructor(page: Page) {
        this.page = page;

        this.prFrame = this.page.frameLocator('iframe.webview').frameLocator('iframe[title="Pull Request 123"]');
        this.prHeader = new PRHeader(this.prFrame);
    }

    async expectPRCreated() {
        await expect(this.prHeader.title).toBeVisible();
    }
}
