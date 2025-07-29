import { test } from '@playwright/test';
import { authenticateWithBitbucketCloud } from 'e2e/helpers';
import { PullRequestsNavigation } from 'e2e/page-objects/fragments';

test('Authenticating with Bitbucket Cloud works', async ({ page, context }) => {
    await authenticateWithBitbucketCloud(page, context);

    await new PullRequestsNavigation(page).expectMenuItems();
});
