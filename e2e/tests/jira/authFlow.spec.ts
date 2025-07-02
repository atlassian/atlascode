import { expect, test } from '@playwright/test';
import { authenticateWithJira } from 'e2e/helpers';

test('Authenticating with Jira works, and assigned items are displayed', async ({ page }) => {
    await authenticateWithJira(page);

    // I can view all issues assigned to me
    await expect(page.getByRole('treeitem', { name: 'BTS-3 - Improve Dropdown Menu Responsiveness' })).toBeVisible();
    await expect(page.getByRole('treeitem', { name: 'BTS-4 - Resolve API Timeout Issues' })).toBeVisible();
    await expect(page.getByRole('treeitem', { name: 'BTS-5 - Fix Database Connection Errors' })).toBeVisible();
    await expect(page.getByRole('treeitem', { name: 'BTS-6 - Fix Button Alignment Issue' })).toBeVisible();
});
