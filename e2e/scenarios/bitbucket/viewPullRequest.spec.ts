import { Page } from '@playwright/test';
import { AtlascodeDrawer, AtlassianSettings, PullRequestPage } from 'e2e/page-objects';

export async function viewPullRequset(page: Page) {
    await new AtlassianSettings(page).closeSettingsPage();

    const { pullRequests } = new AtlascodeDrawer(page);

    await pullRequests.prTreeitem.click();
    await pullRequests.prDetails.waitFor({ state: 'visible' });
    await pullRequests.prDetails.click();
    await page.waitForTimeout(250);

    const pullRequestPage = new PullRequestPage(page);
    await pullRequestPage.expectPRPageLoaded();

    await pullRequestPage.header.expectHeaderLoaded();
    await pullRequestPage.title.expectTitleSectionLoaded();
    await pullRequestPage.summary.expectSummarySectionLoaded();
    await pullRequestPage.commits.expectCommitsSectionLoaded();
    await pullRequestPage.files.expectFilesSectionLoaded();
    await pullRequestPage.comments.expectCommentsSectionLoaded();
    await pullRequestPage.sidebar.expectSidebarSectionLoaded();
}
