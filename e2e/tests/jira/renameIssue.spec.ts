import { expect, test } from '@playwright/test';
import { authenticateWithJira, getIssueFrame, setupIssueMock } from 'e2e/helpers';

test('Rename Jira issue', async ({ page, request }) => {
    const oldTitle = '(Sample) User Interface Bugs';
    const newTitle = 'Check if renaming works';

    await authenticateWithJira(page);
    await page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' }).click();
    await page.waitForTimeout(250);
    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();
    const issueFrame = await getIssueFrame(page);

    // Check the existing title
    await expect(issueFrame.getByText(oldTitle)).toBeVisible();

    // Click on the title element to enter edit mode
    await issueFrame.getByText(oldTitle).click();

    const input = issueFrame.locator('h1 input');
    const saveButton = issueFrame.locator('.ac-inline-save-button');
    const cancelButton = issueFrame.locator('.ac-inline-cancel-button');

    await expect(input).toBeVisible();
    await expect(saveButton).toBeVisible();
    await expect(cancelButton).toBeVisible();
    await expect(input).toHaveValue(oldTitle);
    await page.waitForTimeout(500);

    await input.clear();
    await input.fill(newTitle);
    await expect(input).toHaveValue(newTitle);
    await page.waitForTimeout(500);

    // Add the updated mock
    const cleanupIssueMock = await setupIssueMock(request, { summary: newTitle });

    await saveButton.click();
    await page.waitForTimeout(2000);

    await expect(saveButton).not.toBeVisible();
    await expect(cancelButton).not.toBeVisible();
    await expect(issueFrame.getByText(oldTitle)).not.toBeVisible();
    await expect(issueFrame.getByText(newTitle)).toBeVisible();

    await cleanupIssueMock();
});
