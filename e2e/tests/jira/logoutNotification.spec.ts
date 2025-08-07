import { Page } from '@playwright/test';
import { authenticateWithJira } from 'e2e/helpers';
import { AppNotifications, AtlascodeDrawer } from 'e2e/page-objects';

export async function logoutNotification(page: Page) {
    await authenticateWithJira(page);

    // Verify logout functionality: ensure notification dialog and sidebar login prompt appear after logout
    const settingsFrame = page.frameLocator('iframe.webview').frameLocator('iframe[title="Atlassian Settings"]');
    await settingsFrame.getByRole('button', { name: 'delete' }).click();
    await page.waitForTimeout(2_000);

    await new AtlascodeDrawer(page).jira.expectLoginToJiraItemExists();
    await new AppNotifications(page).expectNotification(/You have been logged out of Jira/);
}
