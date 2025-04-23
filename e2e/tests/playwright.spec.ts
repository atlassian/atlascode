import { expect, test } from '@playwright/test';

test('Jira login flow', async ({ page }) => {
    await page.goto('http://127.0.0.1:9988/');

    await page.getByRole('tab', { name: 'Atlassian' }).click();
    await page.getByText('Please login to Jira').click();

    await expect(page.getByRole('tab', { name: 'Atlassian Settings' })).toBeVisible();

    await page.waitForTimeout(3000);

    const webview = page.mainFrame().childFrames()[2].childFrames()[0];

    await expect(webview.getByRole('button', { name: 'Login to Jira' })).toBeVisible();
});
