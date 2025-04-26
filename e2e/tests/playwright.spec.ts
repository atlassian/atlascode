import { expect, test } from '@playwright/test';

test('Onboarding flow', async ({ page }) => {
    await page.goto('http://[::1]:9988/');

    await page.getByRole('tab', { name: 'Atlassian' }).click();

    /*
     * Onboarding view tests
     **/

    await expect(page.getByRole('tab', { name: 'Getting Started' })).toBeVisible();

    await page.getByRole('tab', { name: 'Getting Started' }).click();

    const getStartedFrame = page.frameLocator('iframe.webview').frameLocator('iframe[title="Getting Started"]');

    // Jira page

    await page.waitForTimeout(3000);

    await expect(page).toHaveScreenshot();

    await expect(getStartedFrame.getByRole('heading', { name: 'Sign in to Jira' })).toBeVisible();

    await expect(getStartedFrame.getByRole('button', { name: 'Sign in to Jira Cloud' })).toBeEnabled();
    await expect(getStartedFrame.getByRole('button', { name: 'Back' })).toBeDisabled();

    await getStartedFrame.getByRole('button', { name: /radio server/i }).click();

    await expect(getStartedFrame.getByRole('button', { name: 'Sign in to Jira Server' })).toBeEnabled();

    await getStartedFrame.getByRole('button', { name: /radio i don\'t/i }).click();

    await expect(getStartedFrame.getByRole('button', { name: 'Next' })).toBeEnabled();

    await getStartedFrame.getByRole('button', { name: 'Next' }).click();

    // Bitbucket page

    await page.waitForTimeout(3000);

    await expect(page).toHaveScreenshot();

    await expect(getStartedFrame.getByRole('heading', { name: 'Sign in to Bitbucket' })).toBeVisible();

    await expect(getStartedFrame.getByRole('button', { name: 'Sign in to Bitbucket Cloud' })).toBeEnabled();
    await expect(getStartedFrame.getByRole('button', { name: 'Back' })).toBeEnabled();

    await getStartedFrame.getByRole('button', { name: /radio server/i }).click();

    await expect(getStartedFrame.getByRole('button', { name: 'Sign in to Bitbucket Server' })).toBeEnabled();

    await getStartedFrame.getByRole('button', { name: /radio i don\'t/i }).click();

    await expect(getStartedFrame.getByRole('button', { name: 'Next' })).toBeEnabled();

    await getStartedFrame.getByRole('button', { name: 'Next' }).click();

    // Landing page

    await page.waitForTimeout(3000);
    await expect(page).toHaveScreenshot();

    await expect(getStartedFrame.getByRole('heading', { name: "You're ready to get started!" })).toBeVisible();
});

test('everything else', async ({ page }) => {
    await page.goto('http://[::1]:9988/');

    await page.getByRole('tab', { name: 'Atlassian' }).click();

    // Close the onboarding view

    await page.getByRole('tab', { name: 'Getting Started' }).getByLabel(/close/i).click();

    /**
     * Settings page
     */

    await page.getByRole('treeitem', { name: 'Please login to Jira' }).click();

    await expect(page.getByRole('tab', { name: 'Atlassian Settings' })).toBeVisible();

    await page.getByRole('tab', { name: 'Atlassian Settings' }).click();

    const settingsFrame = page.frameLocator('iframe.webview').frameLocator('iframe[title="Atlassian Settings"]');

    await expect(settingsFrame.getByRole('button', { name: 'Authentication authenticate' })).toBeVisible();

    await expect(page).toHaveScreenshot({ fullPage: true });

    await expect(settingsFrame.getByRole('button', { name: 'Login to Jira' })).toBeVisible();

    await page.getByRole('treeitem', { name: /authenticate with bitbucket/i }).click();

    await expect(settingsFrame.getByRole('button', { name: 'Login to Bitbucket' })).toBeVisible();

    await expect(page).toHaveScreenshot();
});
