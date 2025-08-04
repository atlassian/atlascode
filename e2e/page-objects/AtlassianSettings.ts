import { Page } from 'playwright/test';

const NAME = 'Atlassian Settings';

export class AtlassianSettings {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async openSettingsPage(itemName: string) {
        await this.page.goto('http://localhost:9988/');

        await this.page.getByRole('tab', { name: 'Atlassian' }).click();
        await this.page.waitForTimeout(250);

        await this.page.getByRole('tab', { name: 'Getting Started' }).getByLabel(/close/i).click();

        await this.page.getByRole('treeitem', { name: itemName }).click();
        await this.page.waitForTimeout(250);

        return this.page.frameLocator('iframe.webview').frameLocator(`iframe[title="${NAME}"]`);
    }

    async closeSettingsPage() {
        await this.page.getByRole('tab', { name: NAME }).getByLabel(/close/i).click();
    }

    async logout() {
        await this.page.getByRole('button', { name: 'delete' }).click();
    }
}
