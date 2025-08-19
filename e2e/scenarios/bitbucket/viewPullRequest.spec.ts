import { Page } from '@playwright/test';
import { closeOnboardingQuickPick } from 'e2e/helpers';
import { AtlascodeDrawer, AtlassianSettings, PullRequestPage } from 'e2e/page-objects';

export async function viewPullRequset(page: Page) {
    await closeOnboardingQuickPick(page);

    await new AtlassianSettings(page).closeSettingsPage();

    const { pullRequests } = new AtlascodeDrawer(page);

    await pullRequests.prTreeitem.click();
    await pullRequests.prDetails.waitFor({ state: 'visible' });
    await pullRequests.prDetails.click();
    await page.waitForTimeout(250);

    const pullRequestPage = new PullRequestPage(page);
    await pullRequestPage.expectPRPageLoaded();

    await pullRequestPage.prHeader.expectHeaderLoaded();
    await pullRequestPage.prTitle.expectTitleSectionLoaded();
    await pullRequestPage.prSummary.expectSummarySectionLoaded();
    await pullRequestPage.prCommits.expectCommitsSectionLoaded();
    await pullRequestPage.prFiles.expectFilesSectionLoaded();
    await pullRequestPage.prComments.expectCommentsSectionLoaded();
    await pullRequestPage.prSidebar.expectSidebarSectionLoaded();
}
