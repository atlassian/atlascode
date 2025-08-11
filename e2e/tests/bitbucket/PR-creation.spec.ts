import { expect } from '@playwright/test';
import {
    authenticateWithBitbucketCloud,
    cleanupWireMockMapping,
    connectRepository,
    createPullrequest,
} from 'e2e/helpers';

import { test } from '../../fixtures/repository-disconnection';

test('PR creation works', async ({ page, context, request }) => {
    await authenticateWithBitbucketCloud(page, context);
    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    const id = await connectRepository(page, request);
    await cleanupWireMockMapping(request, id);
    await page.getByRole('treeitem', { name: 'Create pull request' }).click();
    await page.waitForTimeout(250);

    await createPullrequest(page, request);
    await page.waitForTimeout(250);

    await expect(
        page
            .frameLocator('iframe.webview')
            .frameLocator('iframe[title="Pull Request 123"]')
            .getByText('test-repository: Pull request #123'),
    ).toBeVisible();
    await page.waitForTimeout(250);
    const createPRButton = page.getByRole('button', { name: 'Bitbucket pull requests Section' });
    await createPRButton.hover();
    await page.waitForTimeout(250);
    await createPRButton.getByRole('button', { name: 'Refresh pull requests' }).click();

    await page.waitForTimeout(5000);
});
