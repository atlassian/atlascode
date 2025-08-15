import { Page } from '@playwright/test';
import { AppNotifications, AtlascodeDrawer, AtlassianSettings, CreateIssuePage } from 'e2e/page-objects';

const NEW_ISSUE_SUMMARY = 'Test Issue Created via E2E Test';
const NEW_ISSUE_KEY = 'BTS-7';

export async function createIssue(page: Page) {
    const atlascodeDrawer = new AtlascodeDrawer(page);
    await atlascodeDrawer.openCreateIssuePage();

    await new AtlassianSettings(page).closeSettingsPage();

    const createIssuePage = new CreateIssuePage(page);

    await createIssuePage.expectHeading('Create work item');

    await createIssuePage.fillSummary(NEW_ISSUE_SUMMARY);
    await createIssuePage.createIssue();
    await page.waitForTimeout(1_000);

    await createIssuePage.expectIssueCreated(NEW_ISSUE_KEY);
    await new AppNotifications(page).expectNotification(`Issue ${NEW_ISSUE_KEY} has been created`);
}
