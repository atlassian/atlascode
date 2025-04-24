import { expect, test } from '@playwright/test';

test('playwright test everything', async ({ page }) => {
    await page.goto('http://127.0.0.1:9988/');

    await page.getByRole('tab', { name: 'Atlassian' }).click();

    await page.waitForTimeout(3000);

    /* 
    Onboarding view tests
    */

    expect(page.getByRole('tab', { name: 'Getting Started' })).toBeVisible();

    await page.getByRole('tab', { name: 'Getting Started' }).click();

    const getStartedFrame = page.frameLocator('iframe.webview').frameLocator('iframe[title="Getting Started"]');

    // Jira page
    expect(getStartedFrame.getByRole('heading', { name: 'Sign in to Jira' })).toBeVisible();

    expect(getStartedFrame.getByRole('button', { name: 'Sign in to Jira Cloud' })).toBeEnabled();
    expect(getStartedFrame.getByRole('button', { name: 'Back' })).toBeDisabled();

    await getStartedFrame.getByRole('button', { name: /radio server/i }).click();

    expect(getStartedFrame.getByRole('button', { name: 'Sign in to Jira Server' })).toBeEnabled();

    await getStartedFrame.getByRole('button', { name: /radio i don\'t/i }).click();

    expect(getStartedFrame.getByRole('button', { name: 'Next' })).toBeEnabled();

    await getStartedFrame.getByRole('button', { name: 'Next' }).click();

    //Bitbucket page

    expect(getStartedFrame.getByRole('heading', { name: 'Sign in to Bitbucket' })).toBeVisible();

    expect(getStartedFrame.getByRole('button', { name: 'Sign in to Bitbucket Cloud' })).toBeEnabled();
    expect(getStartedFrame.getByRole('button', { name: 'Back' })).toBeEnabled();

    await getStartedFrame.getByRole('button', { name: /radio server/i }).click();

    expect(getStartedFrame.getByRole('button', { name: 'Sign in to Bitbucket Server' })).toBeEnabled();

    await getStartedFrame.getByRole('button', { name: /radio i don\'t/i }).click();

    expect(getStartedFrame.getByRole('button', { name: 'Next' })).toBeEnabled();

    await getStartedFrame.getByRole('button', { name: 'Next' }).click();
});
