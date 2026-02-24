import { APIRequestContext, Page } from '@playwright/test';
import { getIssueFrame, setupIssueMock, setupSearchMock } from 'e2e/helpers';
import { JiraTypes } from 'e2e/helpers/types';
import { AtlascodeDrawer, AtlassianSettings, JiraIssuePage } from 'e2e/page-objects';

const ISSUE_NAME = 'BTS-1 - User Interface Bugs';
const CURRENT_STATUS = 'To Do';
const NEXT_STATUS = 'In Progress';

export async function updateIssueStatus(page: Page, request: APIRequestContext, type: JiraTypes) {
    await new AtlassianSettings(page).closeSettingsPage();

    const atlascodeDrawer = new AtlascodeDrawer(page);
    await atlascodeDrawer.jira.expectIssueStatus(ISSUE_NAME, CURRENT_STATUS);
    await atlascodeDrawer.jira.openIssue(ISSUE_NAME);

    const issueFrame = await getIssueFrame(page);
    const jiraIssuePage = new JiraIssuePage(issueFrame);
    await jiraIssuePage.status.expectEqual(CURRENT_STATUS);

    // setup mocks for next status
    const cleanupIssueMock = await setupIssueMock(request, { status: NEXT_STATUS }, 'GET', type);
    const cleanupSearchMock = await setupSearchMock(request, NEXT_STATUS, type);

    await jiraIssuePage.status.changeTo(NEXT_STATUS);
    await page.waitForTimeout(6_000);

    await jiraIssuePage.status.expectEqual(NEXT_STATUS);
    await atlascodeDrawer.jira.expectIssueStatus(ISSUE_NAME, NEXT_STATUS);

    await cleanupIssueMock();
    await cleanupSearchMock();
}
