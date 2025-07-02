import { expect, test } from '@playwright/test';
import {
    authenticateWithJira,
    cleanupWireMockMapping,
    getIssueFrame,
    setupWireMockMapping,
    updateIssueField,
} from 'e2e/helpers';
import fs from 'fs';

test('Add comment flow', async ({ page, request }) => {
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

    const issueJSON = JSON.parse(fs.readFileSync('e2e/wiremock-mappings/mockedteams/BTS-1/bts1.json', 'utf-8'));
    const updatedIssue = updateIssueField(issueJSON, {
        comment: commentText,
    });
    const { id } = await setupWireMockMapping(request, 'GET', updatedIssue, '/rest/api/2/issue/BTS-1');

    const addCommentButton = issueFrame.getByRole('button', { name: 'Save' });
    await expect(addCommentButton).toBeVisible();
    await addCommentButton.click();

    await expect(issueFrame.getByText(commentText)).toBeVisible();
    await expect(issueFrame.locator('.jira-comment-author')).toBeVisible();

    await cleanupWireMockMapping(request, id);
});
