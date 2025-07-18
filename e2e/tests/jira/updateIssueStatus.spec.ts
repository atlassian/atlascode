import { test } from '@playwright/test';
import {
    authenticateWithJira,
    cleanupWireMockMapping,
    getIssueFrame,
    setupWireMockMapping,
    updateIssueField,
} from 'e2e/helpers';
import { AtlascodeDrawer } from 'e2e/page-objects/AtlascodeDrawer';
import { JiraIssuePage } from 'e2e/page-objects/JiraIssuePage';
import fs from 'fs';

test.only('I can transition a Jira', async ({ page, request }) => {
    const issueName = 'BTS-1 - User Interface Bugs';
    const currentStatus = 'In Progress';
    const nextStatus = 'In Review';

    await authenticateWithJira(page);

    const atlascodeDrawer = new AtlascodeDrawer(page);
    atlascodeDrawer.expectStatusForJiraIssue(issueName, currentStatus);
    await atlascodeDrawer.openJiraIssue(issueName);

    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    const issueFrame = await getIssueFrame(page);
    const jiraIssuePage = new JiraIssuePage(issueFrame);
    await jiraIssuePage.expectStatus(currentStatus);

    // Update mock for GET issue request -------------------------
    const issueJSON = JSON.parse(fs.readFileSync('e2e/wiremock-mappings/mockedteams/BTS-1/bts1.json', 'utf-8'));
    const updatedIssue = updateIssueField(issueJSON, {
        status: nextStatus,
    });
    const { id } = await setupWireMockMapping(request, 'GET', updatedIssue, '/rest/api/2/issue/BTS-1');
    // ------------------------------------------------------------

    // TODO; update mock for search request

    await jiraIssuePage.updateStatus(nextStatus);

    await page.waitForTimeout(1000);
    await jiraIssuePage.expectStatus(nextStatus);

    // TODO: check status in the drawer
    atlascodeDrawer.expectStatusForJiraIssue(issueName, nextStatus);

    await cleanupWireMockMapping(request, id);
});
