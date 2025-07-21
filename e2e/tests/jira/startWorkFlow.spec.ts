import { test } from '@playwright/test';
import { authenticateWithJira, getIssueFrame, setupIssueMock, setupSearchMock } from 'e2e/helpers';
import { AtlascodeDrawer, JiraIssuePage, StartWorkPage } from 'e2e/page-objects';

test.only('I can start work on a Jira', async ({ page, request }) => {
    const issueName = 'BTS-1 - User Interface Bugs';
    const currentStatus = 'To Do';
    const nextStatus = 'In Progress';

    await authenticateWithJira(page);
    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    const atlascodeDrawer = new AtlascodeDrawer(page);
    await atlascodeDrawer.openJiraIssue(issueName);

    const issueFrame = await getIssueFrame(page);
    const jiraIssuePage = new JiraIssuePage(issueFrame);
    await jiraIssuePage.expectStatus(currentStatus);

    await jiraIssuePage.startWork();
    await page.waitForTimeout(2_000);

    // setup mocks for next status
    const cleanupIssueMock = await setupIssueMock(request, { status: nextStatus });
    const cleanupSearchMock = await setupSearchMock(request, nextStatus);

    const startWorkFrame = await getIssueFrame(page);
    const startWorkPage = new StartWorkPage(startWorkFrame);

    await startWorkPage.startWork();
    await page.waitForTimeout(2_000);
    await atlascodeDrawer.expectStatusForJiraIssue(issueName, nextStatus);

    await cleanupIssueMock();
    await cleanupSearchMock();
});
