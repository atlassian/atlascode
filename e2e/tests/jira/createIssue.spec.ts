import { expect, test } from '@playwright/test';
import { authenticateWithJira } from 'e2e/helpers';
import { AtlassianSettings } from 'e2e/page-objects';

test('Create an issue via side panel flow', async ({ page }) => {
    const newIssueSummary = 'Test Issue Created via E2E Test';
    const newIssueKey = 'BTS-7';

    await authenticateWithJira(page);

    await page.getByRole('button', { name: 'Create Jira issue' }).click();
    await new AtlassianSettings(page).closeSettingsPage();

    const createIssueFrame = page.frameLocator('iframe.webview').frameLocator('iframe[title="Create Jira Issue"]');

    await expect(createIssueFrame.getByRole('heading', { name: 'Create work item' })).toBeVisible();

    await createIssueFrame.getByLabel('Summary').click();
    await createIssueFrame.getByLabel('Summary').fill(newIssueSummary);
    await createIssueFrame.locator('textarea').click();
    await createIssueFrame.locator('textarea').fill('Text');

    await createIssueFrame.getByRole('button', { name: 'Create' }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    await createIssueFrame.getByRole('button', { name: 'Create' }).click();

    await page.waitForTimeout(2000);

    await expect(page.getByRole('dialog', { name: new RegExp(`Issue ${newIssueKey} has been created`) })).toBeVisible();

    await expect(createIssueFrame.getByLabel('Summary')).toBeEmpty();
    await expect(createIssueFrame.locator('textarea')).toBeEmpty();
});
