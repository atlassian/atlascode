import { expect, FrameLocator, Locator } from '@playwright/test';

export class PRHeader {
    readonly frame: FrameLocator;

    readonly title: Locator;
    readonly copyButton: Locator;
    readonly requestChangesButton: Locator;
    readonly approveButton: Locator;
    readonly mergeButton: Locator;
    readonly refreshButton: Locator;

    constructor(frame: FrameLocator) {
        this.frame = frame;

        this.title = this.frame.getByText('test-repository: Pull request #123');
        this.copyButton = this.frame.getByRole('button', { name: 'copy link' });
        this.requestChangesButton = this.frame.getByRole('button', { name: 'Request Changes' });
        this.approveButton = this.frame.getByRole('button', { name: 'Approve' });
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
}
