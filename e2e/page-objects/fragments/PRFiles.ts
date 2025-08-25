import { expect, FrameLocator, Locator } from '@playwright/test';

export class PRFiles {
    readonly frame: FrameLocator;

    readonly sectionButton: Locator;
    readonly commitsTable: Locator;
    readonly changedFile: Locator;

    constructor(frame: FrameLocator) {
        this.frame = frame;

        this.sectionButton = this.frame.getByRole('button', { name: 'Files Changed' });
        this.commitsTable = this.frame.getByRole('table', { name: 'commits list' }).last();
        this.changedFile = this.commitsTable.getByRole('button', { name: 'test2.json' });
    }

    async expectFilesSectionLoaded() {
        await expect(this.sectionButton).toBeVisible();
        await expect(this.commitsTable).toBeVisible();
        await expect(this.changedFile).toBeVisible();
    }
}
