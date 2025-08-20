import { expect, FrameLocator, Locator } from '@playwright/test';

export class PRCommits {
    readonly frame: FrameLocator;

    readonly sectionButton: Locator;
    readonly commitsTable: Locator;
    readonly commitHash: Locator;
    readonly commitMessage: Locator;
    readonly commitDate: Locator;

    constructor(frame: FrameLocator) {
        this.frame = frame;

        this.sectionButton = this.frame.getByRole('button', { name: 'Commits' });
        this.commitsTable = this.frame.getByRole('table', { name: 'commits list' }).first();
        this.commitHash = this.commitsTable.getByRole('link', { name: '35c37c0b' });
        this.commitMessage = this.commitsTable.getByLabel('added example.json');
        this.commitDate = this.commitsTable.getByText('2025-07-03');
    }

    async expectCommitsSectionLoaded() {
        await expect(this.sectionButton).toBeVisible();
        await expect(this.commitsTable).toBeVisible();
        await expect(this.commitHash).toBeVisible();
        await expect(this.commitMessage).toBeVisible();
        await expect(this.commitDate).toBeVisible();
    }
}
