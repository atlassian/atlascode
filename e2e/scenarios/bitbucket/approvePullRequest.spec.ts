import { expect, Page } from '@playwright/test';
import { closeOnboardingQuickPick } from 'e2e/helpers';
import { AtlascodeDrawer, AtlassianSettings, PullRequestPage } from 'e2e/page-objects';

export async function approvePullRequest(page: Page) {
    await closeOnboardingQuickPick(page);

    await new AtlassianSettings(page).closeSettingsPage();

    const { pullRequests } = new AtlascodeDrawer(page);

    await pullRequests.prTreeitem.click();
    await pullRequests.prDetails.waitFor({ state: 'visible' });
    await pullRequests.prDetails.click();
    await page.waitForTimeout(250);

    const pullRequestPage = new PullRequestPage(page);
    // user can approve PR
    await pullRequestPage.prHeader.approvePullRequest();
    await page.waitForTimeout(250);
    await expect(pullRequestPage.prSidebar.sidebarApprovedIcon).toBeVisible();

    // user can unapprove PR
    await pullRequestPage.prHeader.unapprovePullRequest();
    await page.waitForTimeout(250);
    await expect(pullRequestPage.prSidebar.sidebarApprovedIcon).not.toBeVisible();
}
