import { expect, Locator, Page } from 'playwright/test';

export class JiraNavigation {
    readonly page: Page;

    readonly jiraItemsTree: Locator;

    constructor(page: Page) {
        this.page = page;

        this.jiraItemsTree = page.getByRole('tree', { name: 'Jira Work Items' });
    }

    async openIssue(name: string) {
        const item = this.jiraItemsTree.getByRole('treeitem', { name });
        await item.click();
        await this.page.waitForTimeout(1_000);
    }

    async getIssueStatus(name: string) {
        const item = this.jiraItemsTree.getByRole('treeitem', { name });
        const description = item.locator('.label-description');
        const descriptionText = await description.innerText();
        // Description format is: "summary | status", extract status after the pipe
        const parts = descriptionText.split(' | ');
        const status = parts[parts.length - 1];
        return status;
    }

    async expectIssueStatus(name: string, expectedStatus: string) {
        const currentStatus = await this.getIssueStatus(name);
        expect(currentStatus).toMatch(new RegExp(expectedStatus, 'i'));
    }

    async expectIssueExists(name: string) {
        const item = this.jiraItemsTree.getByRole('treeitem', { name });
        return expect(item).toBeVisible();
    }

    async expectLoginToJiraItemExists() {
        await expect(this.page.getByRole('button', { name: /^Log in to Jira$/ }).first()).toBeVisible();
    }
}
