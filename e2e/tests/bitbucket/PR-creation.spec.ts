import { expect } from '@playwright/test';
import { authenticateWithBitbucketCloud, connectRepository, createPullrequest } from 'e2e/helpers';

import { test } from '../../fixtures/repository-disconnection';

test('PR creation works', async ({ page, context }) => {
    await authenticateWithBitbucketCloud(page, context);
    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    await connectRepository(page);

    await page.getByRole('treeitem', { name: 'Create pull request' }).click();

    await createPullrequest(page);
    await page.waitForTimeout(250);

    await expect(
        page
            .frameLocator('iframe.webview')
            .frameLocator('iframe[title="Pull Request 123"]')
            .getByText('test-repository: Pull request #123'),
    ).toBeVisible();
});
