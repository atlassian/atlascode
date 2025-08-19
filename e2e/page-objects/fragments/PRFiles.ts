import { expect, FrameLocator, Locator } from '@playwright/test';

export class PRFiles {
    readonly frame: FrameLocator;

    readonly filesButton: Locator;
    readonly filesCommitsTable: Locator;
    readonly filesChangedFile: Locator;

    constructor(frame: FrameLocator) {
        this.frame = frame;

        this.filesButton = this.frame.getByRole('button', { name: 'Files Changed' });
        this.filesCommitsTable = this.frame.getByRole('table', { name: 'commits list' }).last();
        this.filesChangedFile = this.filesCommitsTable.getByRole('button', { name: 'test2.json' });
    }

    async expectFilesSectionLoaded() {
        await expect(this.filesButton).toBeVisible();
        await expect(this.filesCommitsTable).toBeVisible();
        await expect(this.filesChangedFile).toBeVisible();
    }
}
