import { expect, FrameLocator, Locator } from '@playwright/test';

export class PRHeader {
    readonly frame: FrameLocator;

    readonly title: Locator;
    readonly copyButton: Locator;
    readonly requestChangesButton: Locator;
    readonly approveButton: Locator;
    readonly unapproveButton: Locator;
    readonly mergeButton: Locator;
    readonly refreshButton: Locator;

    constructor(frame: FrameLocator) {
        this.frame = frame;

        this.title = this.frame.getByText('Pull request #123');
        this.copyButton = this.frame.getByRole('button', { name: 'copy link' });
        this.requestChangesButton = this.frame.getByRole('button', { name: 'Request Changes' });
        this.approveButton = this.frame.getByRole('button', { name: 'Approve' });
        this.unapproveButton = this.frame.getByRole('button', { name: 'Unapprove' });
        this.mergeButton = this.frame.getByRole('button', { name: 'Merge' });
        this.refreshButton = this.frame.getByRole('button', { name: 'click to refresh' });
    }

    async expectHeaderLoaded() {
        await expect(this.title).toBeVisible();
        await expect(this.copyButton).toBeVisible();
        await expect(this.requestChangesButton).toBeVisible();
        await expect(this.approveButton).toBeVisible();
        await expect(this.mergeButton).toBeVisible();
        await expect(this.refreshButton).toBeVisible();
    }

    async approvePullRequest() {
        await this.approveButton.click();
        await this.unapproveButton.waitFor({ state: 'visible' });
    }

    async unapprovePullRequest() {
        await this.unapproveButton.click();
        await this.approveButton.waitFor({ state: 'visible' });
    }
}
