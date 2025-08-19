import { expect, FrameLocator, Locator } from '@playwright/test';

export class PRHeader {
    readonly frame: FrameLocator;

    readonly headerTitle: Locator;
    readonly headerCopyButton: Locator;
    readonly headerRequestChangesButton: Locator;
    readonly headerApproveButton: Locator;
    readonly headerMergeButton: Locator;
    readonly headerRefreshButton: Locator;

    constructor(frame: FrameLocator) {
        this.frame = frame;

        this.headerTitle = this.frame.getByText('test-repository: Pull request #123');
        this.headerCopyButton = this.frame.getByRole('button', { name: 'copy link' });
        this.headerRequestChangesButton = this.frame.getByRole('button', { name: 'Request Changes' });
        this.headerApproveButton = this.frame.getByRole('button', { name: 'Approve' });
        this.headerMergeButton = this.frame.getByRole('button', { name: 'Merge' });
        this.headerRefreshButton = this.frame.getByRole('button', { name: 'click to refresh' });
    }

    async expectHeaderLoaded() {
        await expect(this.headerTitle).toBeVisible();
        await expect(this.headerCopyButton).toBeVisible();
        await expect(this.headerRequestChangesButton).toBeVisible();
        await expect(this.headerApproveButton).toBeVisible();
        await expect(this.headerMergeButton).toBeVisible();
        await expect(this.headerRefreshButton).toBeVisible();
    }
}
