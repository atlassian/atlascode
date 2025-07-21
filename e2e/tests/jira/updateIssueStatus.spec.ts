import { test } from '@playwright/test';
import { authenticateWithJira, getIssueFrame, setupIssueMock, setupSearchMock } from 'e2e/helpers';
import { AtlascodeDrawer } from 'e2e/page-objects/AtlascodeDrawer';
import { JiraIssuePage } from 'e2e/page-objects/JiraIssuePage';

test('I can transition a Jira', async ({ page, request }) => {
    const ISSUE = {
        name: 'BTS-1 - User Interface Bugs',
        status: {
            current: 'To Do',
            next: 'In Progress',
        },
    };

    // setup mocks for current status
    const resetTodoIssue = await setupIssueMock(request, { status: ISSUE.status.current });
    const resetTodoSearch = await setupSearchMock(request, ISSUE.status.current);

    await authenticateWithJira(page);
    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    const atlascodeDrawer = new AtlascodeDrawer(page);
    await atlascodeDrawer.expectStatusForJiraIssue(ISSUE.name, ISSUE.status.current);
    await atlascodeDrawer.openJiraIssue(ISSUE.name);

    const issueFrame = await getIssueFrame(page);
    const jiraIssuePage = new JiraIssuePage(issueFrame);
    await jiraIssuePage.expectStatus(ISSUE.status.current);

    // setup mocks for next status
    const resetNextIssue = await setupIssueMock(request, { status: ISSUE.status.next });
    const resetNextSearch = await setupSearchMock(request, ISSUE.status.next);

    await jiraIssuePage.updateStatus(ISSUE.status.next);
    await page.waitForTimeout(1000);

    await jiraIssuePage.expectStatus(ISSUE.status.next);
    await atlascodeDrawer.expectStatusForJiraIssue(ISSUE.name, ISSUE.status.next);

    await Promise.all(
        [resetTodoIssue, resetTodoSearch, resetNextIssue, resetNextSearch].map(async (reset) => await reset()),
    );
});
