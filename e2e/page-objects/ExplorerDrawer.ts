import { Locator, Page } from '@playwright/test';

export class ExplorerDrawer {
    readonly page: Page;

    readonly noFolderSection: Locator;
    readonly mockRepo: Locator;

    constructor(page: Page) {
        this.page = page;

        this.noFolderSection = page.getByRole('button', { name: 'No Folder Opened Section' });
        this.mockRepo = page.getByRole('treeitem', { name: 'mock-repository' });
    }

    async isNoRepository() {
        return await this.noFolderSection.isVisible();
    }

    async waitForExplorerLoad() {
        await this.mockRepo.or(this.noFolderSection).waitFor({ state: 'visible' });
    }
}
