import { JiraTypes as BitbucketTypes } from 'e2e/helpers/types';
import { Locator, Page } from 'playwright/test';

import { JiraNavigation, PullRequestsNavigation, PullRequestsNavigationDC } from './fragments';

export class AtlascodeDrawer {
    readonly page: Page;
    readonly type?: BitbucketTypes;

    readonly jira: JiraNavigation;
    readonly pullRequests: PullRequestsNavigation;
    readonly helpFeedbackTree: Locator;

    constructor(page: Page, type?: BitbucketTypes) {
        this.page = page;
        this.type = type;

        this.jira = new JiraNavigation(page);
        this.pullRequests =
            type === BitbucketTypes.DC ? new PullRequestsNavigationDC(page) : new PullRequestsNavigation(page);
        this.helpFeedbackTree = page.getByRole('tree', { name: 'Help and Feedback' });
    }

    async openAtlascodeDrawer() {
        await this.page.getByRole('tab', { name: 'Atlassian' }).click();
    }

    async openCreateIssuePage() {
        await this.page.getByRole('button', { name: 'Create Jira issue' }).click();
    }
}
