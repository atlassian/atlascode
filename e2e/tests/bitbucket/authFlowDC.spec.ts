import { test } from '@playwright/test';
import { authenticateWithBitbucketDC } from 'e2e/helpers';
import { PullRequestsNavigation } from 'e2e/page-objects/fragments';

test('Authenticating with Bitbucket DC works', async ({ page }) => {
    await authenticateWithBitbucketDC(page);

    await new PullRequestsNavigation(page).expectMenuItems();
});
