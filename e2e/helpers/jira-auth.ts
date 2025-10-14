import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { closeAllNotifications, openAtlassianSettings } from './common';

const BASE_URL_CLOUD: string = 'https://mockedteams.atlassian.net';
const BASE_URL_DC: string = 'https://jira.mockeddomain.com';
const USERNAME: string = 'mock@atlassian.code';
const PASSWORD: string = '12345';

/**
 * Helper function to authenticate with Jira using the provided credentials
 */
export const authenticateWithJiraCloud = async (
    page: Page,
    baseUrl: string = BASE_URL_CLOUD,
    username: string = USERNAME,
    password: string = PASSWORD,
) => {
    const settingsFrame = await openAtlassianSettings(page, 'Log in to Jira');

    await expect(settingsFrame.getByRole('button', { name: 'Authentication authenticate' })).toBeVisible();
    await expect(settingsFrame.getByRole('button', { name: 'Login with API Token' })).toBeVisible();

    settingsFrame.getByRole('button', { name: 'Login with API Token' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Base URL' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Base URL' }).fill(baseUrl);
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Email' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Email' }).fill(username);
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'API token' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'API token' }).fill(password);
    await page.waitForTimeout(250);

    await closeAllNotifications(page);

    await settingsFrame.getByRole('button', { name: 'Save Site' }).click();
    await page.waitForTimeout(3000);

    // Wait for authentication to complete and tree items to be visible
    await expect(page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' })).toBeVisible();
};

/**
 * Helper function to authenticate with Jira DC using the provided credentials
 */
export const authenticateWithJiraDC = async (
    page: Page,
    baseUrl: string = BASE_URL_DC,
    username: string = USERNAME,
    password: string = PASSWORD,
) => {
    const settingsFrame = await openAtlassianSettings(page, 'Log in to Jira');

    await expect(settingsFrame.getByRole('button', { name: 'Authentication authenticate' })).toBeVisible();
    await expect(settingsFrame.getByRole('button', { name: 'Login with API Token' })).toBeVisible();

    settingsFrame.getByRole('button', { name: 'Login with API Token' }).click();
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

    await closeAllNotifications(page);

    await settingsFrame.getByRole('button', { name: 'Save Site' }).click();
    await page.waitForTimeout(3000);

    // Authentication successful - DC auth complete
    await expect(page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' })).toBeVisible();
};
