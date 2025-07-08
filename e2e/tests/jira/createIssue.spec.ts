import { expect, test } from '@playwright/test';
import { authenticateWithJira } from 'e2e/helpers';

test('Create an issue via side pannel flow', async ({ page }) => {
    const newIssueSummary = 'Test Issue Created via E2E Test';
    const newIssueKey = 'BTS-7';

    await authenticateWithJira(page);

    await page.getByRole('button', { name: 'Create Jira issue' }).click();

    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    const createIssueFrame = page.frameLocator('iframe.webview').frameLocator('iframe[title="Create Jira Issue"]');

    await expect(createIssueFrame.getByRole('heading', { name: 'Create work item' })).toBeVisible();

    await createIssueFrame.getByLabel('Summary').click();
    await createIssueFrame.getByLabel('Summary').fill(newIssueSummary);

    await createIssueFrame.getByRole('button', { name: 'Create' }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    await createIssueFrame.getByRole('button', { name: 'Create' }).click();

    await createIssueFrame.getByText('Issue Created').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    await expect(createIssueFrame.getByText('Issue Created')).toBeVisible();
    await expect(createIssueFrame.getByText(newIssueKey)).toBeVisible();
});
