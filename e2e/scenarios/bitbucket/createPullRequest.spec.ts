import { setupPullrequests } from 'e2e/helpers/setup-mock';
import { pullrequest } from 'e2e/mock-data/pullrequest';
import { AtlascodeDrawer, CreatePullRequestPage, PullRequestPage } from 'e2e/page-objects';
import { APIRequestContext, Page } from 'playwright/test';

export async function createPullRequest(page: Page, request: APIRequestContext) {
    await setupPullrequests(request, [pullrequest]);

    const atlascodeDrawer = new AtlascodeDrawer(page);

    await atlascodeDrawer.pullRequests.createPRButton.click();
    await page.waitForTimeout(250);

    const createPullRequestPage = new CreatePullRequestPage(page);

    await createPullRequestPage.sourceBranchPicker.waitFor({ state: 'visible' });
    await createPullRequestPage.sourceBranchPicker.click();
    await page.waitForTimeout(250);

    await createPullRequestPage.pushCheckbox.click();

    await createPullRequestPage.createPullRequestButton.click();
    await page.waitForTimeout(250);

    await new PullRequestPage(page).expectPRCreated();

    await atlascodeDrawer.pullRequests.expectPRTreeitem();
}
