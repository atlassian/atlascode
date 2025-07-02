import { expect, test } from '@playwright/test';
import { authenticateWithJira } from 'e2e/helpers';

test('When user logs out, they see a badge notification about being logged out', async ({ page }) => {
    await authenticateWithJira(page);

    // Verify logout functionality: ensure notification dialog and sidebar login prompt appear after logout
    const settingsFrame = page.frameLocator('iframe.webview').frameLocator('iframe[title="Atlassian Settings"]');
    await settingsFrame.getByRole('button', { name: 'delete' }).click();

    await page.waitForTimeout(2000);

    await expect(page.getByRole('treeitem', { name: 'Please login to Jira' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: /You have been logged out of Jira/ })).toBeVisible();
});
