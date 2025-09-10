import { expect, Page } from '@playwright/test';
import { AtlascodeDrawer, AtlassianSettings, PullRequestPage } from 'e2e/page-objects';

export async function approvePullRequest(page: Page) {
    await new AtlassianSettings(page).closeSettingsPage();

    const { pullRequests } = new AtlascodeDrawer(page);

    await pullRequests.prTreeitem.click();
    await pullRequests.prDetails.waitFor({ state: 'visible' });
    await pullRequests.prDetails.click();
    await page.waitForTimeout(250);

    const pullRequestPage = new PullRequestPage(page);
    // user can approve PR
    await pullRequestPage.header.approvePullRequest();
    await page.waitForTimeout(250);
    await expect(pullRequestPage.sidebar.approvedIcon).toBeVisible();

    // user can unapprove PR
    await pullRequestPage.header.unapprovePullRequest();
    await page.waitForTimeout(250);
    await expect(pullRequestPage.sidebar.approvedIcon).not.toBeVisible();
}
