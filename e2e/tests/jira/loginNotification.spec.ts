import { test } from '@playwright/test';
import { AppNotifications, AtlascodeDrawer } from 'e2e/page-objects';

test('When user is not authenticated in Jira, a badge notification prompts for login', async ({ page }) => {
    await page.goto('http://localhost:9988/');

    await page.waitForTimeout(1_000);

    // Verify initial unauthenticated state: login prompt is visible in both sidebar and notifications
    await new AtlascodeDrawer(page).jira.expectLoginToJiraItemExists();
    await new AppNotifications(page).expectNotification(/Log in to Jira/);
});
