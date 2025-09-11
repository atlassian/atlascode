import { Locator, Page } from '@playwright/test';

export class ExplorerDrawer {
    readonly page: Page;

    readonly tab: Locator;
    readonly noFolderSection: Locator;
    readonly mockRepo: Locator;
    readonly testJson: Locator;

    constructor(page: Page) {
        this.page = page;

        this.tab = this.page.getByRole('tab', { name: 'Explorer' });
        this.noFolderSection = page.getByRole('button', { name: 'No Folder Opened Section' });
        this.mockRepo = page.getByRole('treeitem', { name: 'mock-repository' });
        this.testJson = page.getByRole('treeitem', { name: 'test.json' });
    }

    async isNoRepository() {
        return await this.noFolderSection.isVisible();
    }

    async waitForExplorerLoad() {
        await this.mockRepo.or(this.noFolderSection).waitFor({ state: 'visible', timeout: 5_000 });
    }

    async waitForFilesLoad() {
        await this.testJson.waitFor({ state: 'visible' });
    }

    async openExplorerDrawer() {
        await this.tab.click();
    }

    async isTabOpened() {
        return await this.tab.getAttribute('aria-selected');
    }
}
