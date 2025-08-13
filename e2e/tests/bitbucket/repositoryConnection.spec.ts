import { expect } from '@playwright/test';
import { authenticateWithBitbucketCloud, cleanupWireMockMapping, connectRepository } from 'e2e/helpers';

import { test } from '../../fixtures/repository-disconnection';

test('Adding Bitbucket repository works', async ({ page, context, request }) => {
    await authenticateWithBitbucketCloud(page, context);
    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    const id = await connectRepository(page, request);

    const createPullRequestButton = page.getByRole('treeitem', { name: 'Create pull request' });
    await createPullRequestButton.waitFor({ state: 'visible' });

    await expect(page.getByRole('treeitem', { name: 'mock-repository' }).first()).toBeVisible();

    await cleanupWireMockMapping(request, id);
});
