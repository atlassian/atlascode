import { APIRequestContext, Page } from '@playwright/test';
import { setupPullrequests, setupPullrequestsDC } from 'e2e/helpers';
import { JiraTypes as BitbucketTypes } from 'e2e/helpers/types';
import { pullrequest } from 'e2e/mock-data/pullrequest';
import { pullrequestDC } from 'e2e/mock-data/pullrequestDC';
import { AtlascodeDrawer, AtlassianSettings, CreatePullRequestPage, PullRequestPage } from 'e2e/page-objects';

export async function createPullRequest(page: Page, type: BitbucketTypes, request: APIRequestContext) {
    if (type === BitbucketTypes.Cloud) {
        await setupPullrequests(request, [pullrequest]);
    } else if (type === BitbucketTypes.DC) {
        await setupPullrequestsDC(request, [pullrequestDC]);
    }

    await new AtlassianSettings(page).closeSettingsPage();

    const atlascodeDrawer = new AtlascodeDrawer(page, type);

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

    // For DC PullRequest creator is mockuser2 for next steps (approve/unapprove)
    await new PullRequestPage(page).expectPRPageLoaded();

    await atlascodeDrawer.pullRequests.expectPRTreeitem();
}
