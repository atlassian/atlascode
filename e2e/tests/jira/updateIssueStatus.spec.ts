import { test } from '@playwright/test';
import { authenticateWithJira, getIssueFrame, setupIssueMock, setupSearchMock } from 'e2e/helpers';
import { AtlascodeDrawer, AtlassianSettings, JiraIssuePage } from 'e2e/page-objects';

const ISSUE_NAME = 'BTS-1 - User Interface Bugs';
const CURRENT_STATUS = 'To Do';
const NEXT_STATUS = 'In Progress';

test('I can transition a Jira', async ({ page, request }) => {
    await authenticateWithJira(page);
    await new AtlassianSettings(page).closeSettingsPage();

    const atlascodeDrawer = new AtlascodeDrawer(page);
    await atlascodeDrawer.jira.expectIssueStatus(ISSUE_NAME, CURRENT_STATUS);
    await atlascodeDrawer.jira.openIssue(ISSUE_NAME);

    const issueFrame = await getIssueFrame(page);
    const jiraIssuePage = new JiraIssuePage(issueFrame);
    await jiraIssuePage.status.expectEqual(CURRENT_STATUS);

    // setup mocks for next status
    const cleanupIssueMock = await setupIssueMock(request, { status: NEXT_STATUS });
    const cleanupSearchMock = await setupSearchMock(request, NEXT_STATUS);

    await jiraIssuePage.status.changeTo(NEXT_STATUS);
    await page.waitForTimeout(2_000);

    await jiraIssuePage.status.expectEqual(NEXT_STATUS);
    await atlascodeDrawer.jira.expectIssueStatus(ISSUE_NAME, NEXT_STATUS);

    await cleanupIssueMock();
    await cleanupSearchMock();
});
