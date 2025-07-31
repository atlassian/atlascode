import { expect, FrameLocator, Page } from 'playwright/test';

export class CreateIssuePage {
    readonly page: Page;
    readonly frame: FrameLocator;

    constructor(page: Page) {
        this.page = page;

        this.frame = page.frameLocator('iframe.webview').frameLocator('iframe[title="Create Jira Issue"]');
    }

    async expectHeading(heading: string) {
        await expect(this.frame.getByRole('heading', { name: heading })).toBeVisible();
    }

    async fillSummary(summary: string) {
        await this.frame.getByLabel('Summary').click();
        await this.frame.getByLabel('Summary').fill(summary);
    }

    async createIssue() {
        const createButton = this.frame.getByRole('button', { name: 'Create' });
        await createButton.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(500);
        await createButton.click();
    }

    async expectIssueCreated(issueKey: string) {
        await expect(
            this.page.getByRole('dialog', { name: new RegExp(`Issue ${issueKey} has been created`) }),
        ).toBeVisible();
    }
}
