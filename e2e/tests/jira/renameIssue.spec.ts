import { expect, test } from '@playwright/test';
import { authenticateWithJira, getIssueFrame } from 'e2e/helpers';

test('Rename Jira issue', async ({ page }) => {
    const oldTitle = '(Sample) User Interface Bugs';

    await authenticateWithJira(page);
    await page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' }).click();
    await page.waitForTimeout(250);
    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();
    const issueFrame = await getIssueFrame(page);

    // Check the existing title
    await expect(issueFrame.getByText(oldTitle)).toBeVisible();

    // Click on the title element to enter edit mode
    await issueFrame.getByText(oldTitle).click();

    const input = issueFrame.locator(`input[value="${oldTitle}"]`);
    const saveButton = issueFrame.locator('.ac-inline-save-button');
    const cancelButton = issueFrame.locator('.ac-inline-cancel-button');

    await expect(input).toBeVisible();
    await expect(saveButton).toBeVisible();
    await expect(cancelButton).toBeVisible();
});
