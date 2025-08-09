import { Page } from '@playwright/test';
import { getIssueFrame } from 'e2e/helpers';
import { AtlascodeDrawer, AtlassianSettings, JiraIssuePage } from 'e2e/page-objects';

const COMMENT_TEXT = 'This is a test comment added via e2e test';

export async function addComment(page: Page) {
    await new AtlascodeDrawer(page).jira.openIssue('BTS-1 - User Interface Bugs');
    await new AtlassianSettings(page).closeSettingsPage();

    const issueFrame = await getIssueFrame(page);
    const issuePage = new JiraIssuePage(issueFrame);

    await issuePage.comments.addNew(COMMENT_TEXT);
    await page.waitForTimeout(1_000);

    await issuePage.comments.expectExists(COMMENT_TEXT);
}
