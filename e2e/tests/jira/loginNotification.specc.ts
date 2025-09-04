import { Page } from '@playwright/test';
import { AppNotifications, AtlascodeDrawer } from 'e2e/page-objects';

export async function loginNotification(page: Page) {
    await page.goto('http://localhost:9988/');

    await page.waitForTimeout(1_000);

    // Verify initial unauthenticated state: login prompt is visible in both sidebar and notifications
    await new AtlascodeDrawer(page).jira.expectLoginToJiraItemExists();
    await new AppNotifications(page).expectNotification(/Log in to Jira/);
}
