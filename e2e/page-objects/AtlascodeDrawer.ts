import { expect, Locator, Page } from 'playwright/test';

export class AtlascodeDrawer {
    readonly page: Page;

    readonly jiraItemsTree: Locator;
    readonly bitbucketPrTree: Locator;
    readonly helpFeedbackTree: Locator;

    constructor(page: Page) {
        this.page = page;

        this.jiraItemsTree = page.getByRole('tree', { name: 'Assigned Jira Work Items' });
        this.bitbucketPrTree = page.getByRole('tree', { name: 'Bitbucket pull requests' });
        this.helpFeedbackTree = page.getByRole('tree', { name: 'Help and Feedback' });
    }

    async openJiraIssue(name: string) {
        const item = this.jiraItemsTree.getByRole('treeitem', { name });
        await item.click();
    }

    async getJiraIssueStatus(name: string) {
        const item = this.jiraItemsTree.getByRole('treeitem', { name });
        await item.hover();
        const status = item.getByRole('toolbar');
        return status.getByRole('button').innerText();
    }

    async expectStatusForJiraIssue(name: string, expectedStatus: string) {
        const currentStatus = await this.getJiraIssueStatus(name);
        expect(currentStatus).toMatch(new RegExp(expectedStatus, 'i'));
    }
}
