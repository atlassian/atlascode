import { APIRequestContext, expect, Page } from '@playwright/test';
import { getIssueFrame, setupIssueMock, setupSearchMock } from 'e2e/helpers';
import { AtlascodeDrawer, JiraIssuePage, StartWorkPage } from 'e2e/page-objects';

const ISSUE_NAME = 'BTS-1 - User Interface Bugs';
const CURRENT_STATUS = 'To Do';
const NEXT_STATUS = 'In Progress';

export const startWorkFlow = async (page: Page, request: APIRequestContext) => {
    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    const atlascodeDrawer = new AtlascodeDrawer(page);
    await atlascodeDrawer.jira.openIssue(ISSUE_NAME);

    const issueFrame = await getIssueFrame(page);
    const jiraIssuePage = new JiraIssuePage(issueFrame);
    await jiraIssuePage.status.expectEqual(CURRENT_STATUS);

    await jiraIssuePage.startWork();

    await page.getByRole('tab', { name: 'BTS-1', exact: true }).getByLabel(/close/i).click();
    await page.waitForTimeout(2_000);

    const startWorkFrame = await getIssueFrame(page);
    const startWorkPage = new StartWorkPage(startWorkFrame);
    await startWorkPage.setupCheckbox(startWorkPage.gitBranchCheckbox, false);
    await startWorkPage.startWork();
    await page.waitForTimeout(2_000);

    expect(startWorkFrame.getByText(new RegExp('Assigned the issue to you', 'i'))).toBeVisible();
    expect(startWorkFrame.getByText(new RegExp(`Transitioned status to ${NEXT_STATUS}`, 'i'))).toBeVisible();

    // setup mocks for next status
    const cleanupIssueMock = await setupIssueMock(request, { status: NEXT_STATUS });
    const cleanupSearchMock = await setupSearchMock(request, NEXT_STATUS);

    await page.getByRole('tab', { name: 'Start work on BTS-1', exact: true }).getByLabel(/close/i).click();

    await atlascodeDrawer.jira.openIssue(ISSUE_NAME);
    const updatedIssueFrame = await getIssueFrame(page);
    const updatedIssuePage = new JiraIssuePage(updatedIssueFrame);

    await updatedIssuePage.status.expectEqual(NEXT_STATUS);
    await atlascodeDrawer.jira.openIssue(ISSUE_NAME);

    await cleanupIssueMock();
    await cleanupSearchMock();
};
