import type { APIRequestContext, Page } from '@playwright/test';
import { setupWireMockMapping } from 'e2e/helpers/setup-mock';
import { pullrequest } from 'e2e/mock-data/pullrequest';

export const createPullrequest = async (page: Page, request: APIRequestContext) => {
    await setupWireMockMapping(
        request,
        'GET',
        { values: [pullrequest], pagelen: 25, size: 0, page: 1 },
        '/2.0/repositories/mockuser/test-repository/pullrequests',
        {
            pagelen: 25,
        },
    );
    const createPRFrame = page.frameLocator('iframe.webview').frameLocator('iframe[title="Create pull request"]');
    const sourceBranchInput = createPRFrame.getByRole('combobox').filter({ hasText: 'Source branch' }).locator('input');
    await sourceBranchInput.waitFor({ state: 'visible' });
    await sourceBranchInput.click();

    const testBranchOption = createPRFrame.getByRole('option', { name: 'test-branch' });
    await testBranchOption.waitFor({ state: 'visible' });
    await testBranchOption.click();
    await page.waitForTimeout(250);

    await createPRFrame
        .locator('div:has-text("Push latest changes from local to remote branch")')
        .locator('input[type="checkbox"]')
        .first()
        .click();

    // await setupPullrequests(request, { values: [pullrequest], pagelen: 25, size: 1, page: 1 });
    await createPRFrame.getByRole('button', { name: 'Create pull request' }).click();
    await page.waitForTimeout(250);
};
