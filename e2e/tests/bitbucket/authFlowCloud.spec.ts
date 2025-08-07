import { test } from '@playwright/test';
import { authenticateWithBitbucketCloud } from 'e2e/helpers';
import { AtlascodeDrawer } from 'e2e/page-objects';

test('Authenticating with Bitbucket Cloud works', async ({ page, context }) => {
    await authenticateWithBitbucketCloud(page, context);

    await new AtlascodeDrawer(page).pullRequests.expectMenuItems();
});
