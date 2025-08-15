import { Locator, Page } from 'playwright/test';

import { JiraNavigation, PullRequestsNavigation } from './fragments';

export class AtlascodeDrawer {
    readonly page: Page;

    readonly jira: JiraNavigation;
    readonly pullRequests: PullRequestsNavigation;
    readonly helpFeedbackTree: Locator;

    constructor(page: Page) {
        this.page = page;

        this.jira = new JiraNavigation(page);
        this.pullRequests = new PullRequestsNavigation(page);
        this.helpFeedbackTree = page.getByRole('tree', { name: 'Help and Feedback' });
    }

    async openAtlascodeDrawer() {
        await this.page.getByRole('tab', { name: 'Atlassian' }).click();
    }

    async openCreateIssuePage() {
        await this.page.getByRole('button', { name: 'Create Jira issue' }).click();
    }
}
