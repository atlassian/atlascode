import { expect, test } from '@playwright/test';
import { authenticateWithJira, getIssueFrame } from 'e2e/helpers';
import { AtlascodeDrawer, JiraIssuePage } from 'e2e/page-objects';

test('Add comment flow', async ({ page }) => {
    const commentText = 'This is a test comment added via e2e test';

    await authenticateWithJira(page);

    await new AtlascodeDrawer(page).openJiraIssue('BTS-1 - User Interface Bugs');

    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    const issueFrame = await getIssueFrame(page);
    const issuePage = new JiraIssuePage(issueFrame);

    await issuePage.addComment(commentText);
    await page.waitForTimeout(1_000);

    await expect(issueFrame.getByText(commentText)).toBeVisible();
    await expect(issueFrame.locator('.jira-comment-author')).toBeVisible();
});
