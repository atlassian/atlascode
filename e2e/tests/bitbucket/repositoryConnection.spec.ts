import { expect, test } from '@playwright/test';
import { authenticateWithBitbucketCloud, connectRepository } from 'e2e/helpers';

test('Adding Bitbucket repository works', async ({ page, context }) => {
    await authenticateWithBitbucketCloud(page, context);
    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    await connectRepository(page);

    const createPullRequestButton = page.getByRole('treeitem', { name: 'Create pull request' });
    await createPullRequestButton.waitFor({ state: 'visible' });

    await expect(page.getByRole('treeitem', { name: 'mock-repository' }).first()).toBeVisible();
});
