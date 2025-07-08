import type { BrowserContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Helper function to open atlassian settings with provided credentials
 */
export const openAtlassianSettings = async (page: Page, itemName: string) => {
    await page.goto('http://localhost:9988/');

    await page.getByRole('tab', { name: 'Atlassian' }).click();
    await page.waitForTimeout(250);

    await page.getByRole('tab', { name: 'Getting Started' }).getByLabel(/close/i).click();

    await page.getByRole('treeitem', { name: itemName }).click();
    await page.waitForTimeout(250);

    return page.frameLocator('iframe.webview').frameLocator('iframe[title="Atlassian Settings"]');
};

/**
 * Helper function to authenticate with Jira using the provided credentials
 */
export const authenticateWithJira = async (
    page: Page,
    baseUrl: string = 'https://mockedteams.atlassian.net',
    username: string = 'mock@atlassian.code',
    password: string = '12345',
) => {
    const settingsFrame = await openAtlassianSettings(page, 'Please login to Jira');

    await expect(settingsFrame.getByRole('button', { name: 'Authentication authenticate' })).toBeVisible();
    await expect(settingsFrame.getByRole('button', { name: 'Login to Jira' })).toBeVisible();

    settingsFrame.getByRole('button', { name: 'Login to Jira' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Base URL' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Base URL' }).fill(baseUrl);
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Username' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Username' }).fill(username);
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Password (API token)' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Password (API token)' }).fill(password);
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('button', { name: 'Save Site' }).click();
    await page.waitForTimeout(3000);

    // Wait for authentication to complete and tree items to be visible
    await expect(page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' })).toBeVisible();
};

/**
 * Helper function to authenticate with Bitbucket DC using the provided credentials
 */
export const authenticateWithBitbucketDC = async (
    page: Page,
    baseUrl: string = 'https://bitbucket.mockeddomain.com',
    username: string = 'mockedUser',
    password: string = '12345',
) => {
    const settingsFrame = await openAtlassianSettings(page, 'Connect Bitbucket to view pull requests');

    await expect(settingsFrame.getByRole('button', { name: 'Authentication authenticate' })).toBeVisible();
    await expect(settingsFrame.getByRole('button', { name: 'Login to Bitbucket' })).toBeVisible();

    await settingsFrame.getByRole('button', { name: 'Login to Bitbucket' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Base URL' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Base URL' }).fill(baseUrl);
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Username' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Username' }).fill(username);
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Password' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('button', { name: 'Save Site' }).click();
    await page.waitForTimeout(1000);

    await expect(settingsFrame.getByText('bitbucket.mockeddomain.com')).toBeVisible();
    await expect(settingsFrame.getByText('No sites found')).not.toBeVisible();
};

/**
 * Helper function to authenticate with Bitbucket Cloud using OAuth
 */
export const authenticateWithBitbucketCloud = async (
    page: Page,
    context: BrowserContext,
    baseUrl: string = 'https://bitbucket.org',
) => {
    await context.route('https://bitbucket.org/site/oauth2/authorize*', async (route) => {
        const reqUrl = new URL(route.request().url());
        const state = reqUrl.searchParams.get('state');
        const callbackUrl = `http://localhost:31415/bbcloud?code=mocked-code&state=${state}`;

        await context.request.get(callbackUrl);

        route.abort();
    });

    const settingsFrame = await openAtlassianSettings(page, 'Connect Bitbucket to view pull requests');

    await expect(settingsFrame.getByRole('button', { name: 'Authentication authenticate' })).toBeVisible();
    await expect(settingsFrame.getByRole('button', { name: 'Login to Bitbucket' })).toBeVisible();

    await settingsFrame.getByRole('button', { name: 'Login to Bitbucket' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Base URL' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Base URL' }).fill(baseUrl);
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('button', { name: 'Save Site' }).click();
    await page.waitForTimeout(250);

    const externalPrompt = page
        .getByRole('dialog')
        .filter({ hasText: 'Do you want code-server to open the external website' });

    if (await externalPrompt.isVisible()) {
        await externalPrompt.getByRole('button', { name: 'Open' }).click();
        await page.waitForTimeout(1000);
    }

    await expect(settingsFrame.getByText('Bitbucket Cloud')).toBeVisible();
};
