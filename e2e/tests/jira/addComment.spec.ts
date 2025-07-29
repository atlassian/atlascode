import { test } from '@playwright/test';
import { authenticateWithJira, getIssueFrame } from 'e2e/helpers';
import { AtlascodeDrawer, AtlassianSettings, JiraIssuePage } from 'e2e/page-objects';

const COMMENT_TEXT = 'This is a test comment added via e2e test';

test('Add comment flow', async ({ page }) => {
    await authenticateWithJira(page);

    await new AtlascodeDrawer(page).jira.openIssue('BTS-1 - User Interface Bugs');
    await new AtlassianSettings(page).closeSettingsPage();

    const issueFrame = await getIssueFrame(page);
    const issuePage = new JiraIssuePage(issueFrame);

    await issuePage.comments.addNew(COMMENT_TEXT);
    await page.waitForTimeout(1_000);

    await issuePage.comments.expectExists(COMMENT_TEXT);
});
