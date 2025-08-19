import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { closeAllNotifications, openAtlassianSettings } from './common';

const BASE_URL: string = 'https://mockedteams.atlassian.net';
const USERNAME: string = 'mock@atlassian.code';
const PASSWORD: string = '12345';

/**
 * Helper function to authenticate with Jira using the provided credentials
 */
export const authenticateWithJira = async (
    page: Page,
    baseUrl: string = BASE_URL,
    username: string = USERNAME,
    password: string = PASSWORD,
) => {
    const settingsFrame = await openAtlassianSettings(page, 'Please login to Jira');

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

    await settingsFrame.getByRole('textbox', { name: 'Password (API token)' }).click();
    await page.waitForTimeout(250);

    await settingsFrame.getByRole('textbox', { name: 'Password (API token)' }).fill(password);
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
    baseUrl: string = BASE_URL,
    username: string = USERNAME,
    password: string = PASSWORD,
) => {
    const settingsFrame = await openAtlassianSettings(page, 'Please login to Jira');

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
