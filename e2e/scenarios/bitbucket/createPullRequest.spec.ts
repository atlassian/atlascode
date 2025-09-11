import { APIRequestContext, Page } from '@playwright/test';
import { setupPullrequests } from 'e2e/helpers';
import { pullrequest } from 'e2e/mock-data/pullrequest';
import { AtlascodeDrawer, AtlassianSettings, CreatePullRequestPage, PullRequestPage } from 'e2e/page-objects';

export async function createPullRequest(page: Page, request: APIRequestContext) {
    await setupPullrequests(request, [pullrequest]);
    await new AtlassianSettings(page).closeSettingsPage();

    const atlascodeDrawer = new AtlascodeDrawer(page);

    await atlascodeDrawer.pullRequests.createPRButton.click();
    await page.waitForTimeout(250);

    const createPullRequestPage = new CreatePullRequestPage(page);

    await createPullRequestPage.sourceBranchPicker.waitFor({ state: 'visible' });
    await createPullRequestPage.sourceBranchPicker.click();
    await page.waitForTimeout(250);

    await createPullRequestPage.testBranchOption.waitFor({ state: 'visible' });
    await createPullRequestPage.testBranchOption.click();
    await page.waitForTimeout(250);

    await createPullRequestPage.pushCheckbox.click();

    await createPullRequestPage.createPullRequestButton.click();
    await page.waitForTimeout(250);

    await new PullRequestPage(page).expectPRPageLoaded();

    await atlascodeDrawer.pullRequests.expectPRTreeitem();
}
