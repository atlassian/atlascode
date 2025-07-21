import { test } from '@playwright/test';
import { authenticateWithJira, getIssueFrame, setupIssueMock, setupSearchMock } from 'e2e/helpers';
import { AtlascodeDrawer } from 'e2e/page-objects/AtlascodeDrawer';
import { JiraIssuePage } from 'e2e/page-objects/JiraIssuePage';

test('I can transition a Jira', async ({ page, request }) => {
    const issueName = 'BTS-1 - User Interface Bugs';
    const currentStatus = 'To Do';
    const nextStatus = 'In Progress';

    await authenticateWithJira(page);
    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    const atlascodeDrawer = new AtlascodeDrawer(page);
    await atlascodeDrawer.expectStatusForJiraIssue(issueName, currentStatus);
    await atlascodeDrawer.openJiraIssue(issueName);

    const issueFrame = await getIssueFrame(page);
    const jiraIssuePage = new JiraIssuePage(issueFrame);
    await jiraIssuePage.expectStatus(currentStatus);

    // setup mocks for next status
    const cleanupIssueMock = await setupIssueMock(request, { status: nextStatus });
    const cleanupSearchMock = await setupSearchMock(request, nextStatus);

    await jiraIssuePage.updateStatus(nextStatus);
    await page.waitForTimeout(2_000);

    await jiraIssuePage.expectStatus(nextStatus);
    await atlascodeDrawer.expectStatusForJiraIssue(issueName, nextStatus);

    await cleanupIssueMock();
    await cleanupSearchMock();
});
