import { test } from '@playwright/test';
import { authenticateWithBitbucketDC } from 'e2e/helpers';
import { AtlascodeDrawer } from 'e2e/page-objects';

test('Authenticating with Bitbucket DC works', async ({ page }) => {
    await authenticateWithBitbucketDC(page);

    await new AtlascodeDrawer(page).pullRequests.expectMenuItems();
});
