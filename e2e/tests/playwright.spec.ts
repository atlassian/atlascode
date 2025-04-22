import { expect, test } from '@playwright/test';

test('Jira login flow', async ({ page }) => {
    await page.goto('http://0.0.0.0:9988/');

    await page.getByRole('tab', { name: 'Atlassian' }).click();
    await page.getByText('Please login to Jira').click();

    await expect(page.getByRole('tab', { name: 'Atlassian Settings' })).toBeVisible();

    await page.waitForTimeout(5000);

    // await expect(page.getByRole('button', { name: /login to jira/i })).toBeVisible();

    //   await page.getByLabel(/login to jira/i).click()

    //   await expect(page.getByText('Add Jira Site')).toBeVisible();

    //   await expect(page).toHaveScreenshot();
});
