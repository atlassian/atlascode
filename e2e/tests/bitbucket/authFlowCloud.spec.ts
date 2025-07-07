import { expect, test } from '@playwright/test';
import { authenticateWithBitbucketCloud } from 'e2e/helpers';

test('Authenticating with Bitbucket Cloud works', async ({ page, context }) => {
    await authenticateWithBitbucketCloud(page, context);

    await expect(page.getByRole('treeitem', { name: 'Add a repository to this workspace' })).toBeVisible();
    await expect(page.getByRole('treeitem', { name: 'Clone a repository from Bitbucket' })).toBeVisible();
    await expect(
        page.getByRole('treeitem', { name: 'No Bitbucket repositories found in this workspace' }),
    ).toBeVisible();
    await expect(page.getByRole('treeitem', { name: 'Switch workspace' })).toBeVisible();
});
