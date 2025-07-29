import { test } from '@playwright/test';
import { authenticateWithJira, getIssueFrame, setupIssueMock } from 'e2e/helpers';
import { AtlascodeDrawer, AtlassianSettings, JiraIssuePage } from 'e2e/page-objects';

const OLD_TITLE = '(Sample) User Interface Bugs';
const NEW_TITLE = 'Check if renaming works';

test('Rename Jira issue', async ({ page, request }) => {
    await authenticateWithJira(page);

    await new AtlassianSettings(page).closeSettingsPage();
    await new AtlascodeDrawer(page).jira.openIssue('BTS-1 - User Interface Bugs');

    const issueFrame = await getIssueFrame(page);
    const issuePage = new JiraIssuePage(issueFrame);

    await issuePage.title.expectEqual(OLD_TITLE);

    // Add the updated mock
    const cleanupIssueMock = await setupIssueMock(request, { summary: NEW_TITLE });

    await issuePage.title.changeTo(NEW_TITLE);
    await page.waitForTimeout(1_000);
    await issuePage.title.expectEqual(NEW_TITLE);

    await cleanupIssueMock();
});
