import { expect, test } from '@playwright/test';
import { authenticateWithJira, getIssueFrame } from 'e2e/helpers';

test('Add comment flow', async ({ page }) => {
    const commentText = 'This is a test comment added via e2e test';

    await authenticateWithJira(page);

    await page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    const issueFrame = await getIssueFrame(page);

    await expect(issueFrame.getByPlaceholder('Add a comment...')).toBeVisible();

    const commentTextarea = issueFrame.getByPlaceholder('Add a comment...');
    await commentTextarea.click();

    const textarea = issueFrame.locator('textarea').first();
    await expect(textarea).toBeVisible();
    await textarea.fill(commentText);
    await page.waitForTimeout(1000);

    const addCommentButton = issueFrame.getByRole('button', { name: 'Save' });
    await expect(addCommentButton).toBeVisible();
    await addCommentButton.click();
    await page.waitForTimeout(2000);

    await expect(issueFrame.getByText(commentText)).toBeVisible();
    await expect(issueFrame.locator('.jira-comment-author')).toBeVisible();
});
