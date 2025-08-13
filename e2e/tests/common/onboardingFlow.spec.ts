import { expect, test } from '@playwright/test';

test("Onboarding flow's navigation among pages works", async ({ page }) => {
    await page.goto('http://localhost:9988/');

    await page.getByRole('tab', { name: 'Atlassian' }).click();
    await page.waitForTimeout(250);

    await expect(page.getByRole('tab', { name: 'Getting Started' })).toBeVisible();

    await page.getByRole('tab', { name: 'Getting Started' }).click();
    await page.waitForTimeout(250);

    const getStartedFrame = page.frameLocator('iframe.webview').frameLocator('iframe[title="Getting Started"]');

    // Jira page

    await expect(getStartedFrame.getByRole('heading', { name: 'Sign in to Jira' })).toBeVisible();
    await expect(getStartedFrame.getByRole('button', { name: 'Sign in to Jira Cloud' })).toBeEnabled();
    await expect(getStartedFrame.getByRole('button', { name: 'Back' })).toBeDisabled();

    await getStartedFrame.getByRole('button', { name: /radio server/i }).click();
    await page.waitForTimeout(250);

    await expect(getStartedFrame.getByRole('button', { name: 'Sign in to Jira Server' })).toBeEnabled();

    await getStartedFrame.getByRole('button', { name: /radio i don\'t/i }).click();
    await page.waitForTimeout(250);

    await expect(getStartedFrame.getByRole('button', { name: 'Next' })).toBeEnabled();

    await getStartedFrame.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(250);

    // Bitbucket page

    await expect(getStartedFrame.getByRole('heading', { name: 'Sign in to Bitbucket' })).toBeVisible();
    await expect(getStartedFrame.getByRole('button', { name: 'Sign in to Bitbucket Cloud' })).toBeEnabled();
    await expect(getStartedFrame.getByRole('button', { name: 'Back' })).toBeEnabled();

    await getStartedFrame.getByRole('button', { name: /radio server/i }).click();
    await page.waitForTimeout(250);

    await expect(getStartedFrame.getByRole('button', { name: 'Sign in to Bitbucket Server' })).toBeEnabled();

    await getStartedFrame.getByRole('button', { name: /radio i don\'t/i }).click();
    await page.waitForTimeout(250);

    await expect(getStartedFrame.getByRole('button', { name: 'Next' })).toBeEnabled();

    await getStartedFrame.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(250);

    // Landing page

    await expect(getStartedFrame.getByRole('heading', { name: "You're ready to get started!" })).toBeVisible();
});
