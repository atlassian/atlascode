import { expect, test } from '@playwright/test';

test('When user is not authenticated in Jira, a badge notification prompts for login', async ({ page }) => {
    await page.goto('http://localhost:9988/');

    await page.waitForTimeout(2000);

    // Verify initial unauthenticated state: login prompt is visible in both sidebar and notifications
    await expect(page.getByRole('treeitem', { name: 'Please login to Jira' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: /Log in to Jira/ })).toBeVisible();
});
