import { test } from '@playwright/test';
import { authenticateWithJiraDC } from 'e2e/helpers';
import { AtlascodeDrawer } from 'e2e/page-objects';

test('Authenticating with Jira DC works', async ({ page }) => {
    await authenticateWithJiraDC(page);

    // Verify that authentication was successful by checking that an issue is visible
    await new AtlascodeDrawer(page).jira.expectIssueExists('BTS-1 - User Interface Bugs');
});
