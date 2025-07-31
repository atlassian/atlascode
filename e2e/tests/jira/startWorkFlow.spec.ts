import { test } from '@playwright/test';
import {
    authenticateWithBitbucketCloud,
    authenticateWithJira,
    connectRepository,
    getIssueFrame,
    setupIssueMock,
    setupSearchMock,
} from 'e2e/helpers';
import { AtlascodeDrawer, JiraIssuePage, StartWorkPage } from 'e2e/page-objects';

test.only('I can start work on a Jira', async ({ page, request, context }) => {
    const issueName = 'BTS-1 - User Interface Bugs';
    const currentStatus = 'To Do';
    const nextStatus = 'In Progress';

    await authenticateWithJira(page);
    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    await authenticateWithBitbucketCloud(page, context);
    await connectRepository(page);

    const atlascodeDrawer = new AtlascodeDrawer(page);
    await atlascodeDrawer.jira.openIssue(issueName);

    const issueFrame = await getIssueFrame(page);
    const jiraIssuePage = new JiraIssuePage(issueFrame);
    await jiraIssuePage.status.expectEqual(currentStatus);

    // setup mocks for next status
    const cleanupIssueMock = await setupIssueMock(request, { status: nextStatus });
    const cleanupSearchMock = await setupSearchMock(request, nextStatus);

    await jiraIssuePage.startWork();

    await page.getByRole('tab', { name: 'BTS-1', exact: true }).getByLabel(/close/i).click();
    await page.waitForTimeout(2_000);

    const startWorkFrame = await getIssueFrame(page);
    const startWorkPage = new StartWorkPage(startWorkFrame);

    await startWorkPage.startWork();
    await page.waitForTimeout(2_000);
    await atlascodeDrawer.jira.expectIssueStatus(issueName, nextStatus);

    await cleanupIssueMock();
    await cleanupSearchMock();
});
