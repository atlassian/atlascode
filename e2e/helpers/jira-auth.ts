import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { openAtlassianSettings } from './common';

/**
 * Helper function to close all notification toasts
 */
const closeAllNotifications = async (page: Page) => {
    const clearNotificationButton = page.getByRole('button', { name: /Clear Notification/i });

    while ((await clearNotificationButton.count()) > 0) {
        const closeButton = clearNotificationButton.first();
        await closeButton.click().catch(() => {}); // Ignore errors if toast is already closed
        await page.waitForTimeout(100);
    }
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

    await closeAllNotifications(page);

    await settingsFrame.getByRole('button', { name: 'Save Site' }).click();
    await page.waitForTimeout(3000);

    // Wait for authentication to complete and tree items to be visible
    await expect(page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' })).toBeVisible();
};
