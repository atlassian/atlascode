import { expect, test } from '@playwright/test';
import { authenticateWithBitbucketDC } from 'e2e/helpers';

test('Authenticating with Bitbucket DC works', async ({ page }) => {
    await authenticateWithBitbucketDC(page);

    await expect(page.getByRole('treeitem', { name: 'Add a repository' })).toBeVisible();
    await expect(page.getByRole('treeitem', { name: 'Clone a repository' })).toBeVisible();
    await expect(page.getByRole('treeitem', { name: 'No Bitbucket repositories found' })).toBeVisible();
    await expect(page.getByRole('treeitem', { name: 'Switch workspace' })).toBeVisible();
});
