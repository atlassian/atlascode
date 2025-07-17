import { expect, test } from '@playwright/test';
import {
    authenticateWithJira,
    cleanupWireMockMapping,
    getIssueFrame,
    setupWireMockMapping,
    updateIssueField,
} from 'e2e/helpers';
import { AtlascodeDrawer } from 'e2e/page-objects/AtlascodeDrawer';
import fs from 'fs';

test('I can transition a Jira', async ({ page, request }) => {
    const atlascodeDrawer = new AtlascodeDrawer(page);

    // Authenticate
    await authenticateWithJira(page);

    // check current status
    // const currentStatus = await atlascodeDrawer.getJiraIssueStatus('BTS-1 - User Interface Bugs');

    // Open BTS-1 issue
    await atlascodeDrawer.openJiraIssue('BTS-1 - User Interface Bugs');

    // Close the Atlassian Settings
    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    // move to page object (JiraIssueFrame ???)
    const issueFrame = await getIssueFrame(page);
    const statusTransitionMenu = issueFrame.getByTestId('issue.status-transition-menu');
    await expect(statusTransitionMenu).toHaveText('In Progress');

    // Add the updated mock
    const issueJSON = JSON.parse(fs.readFileSync('e2e/wiremock-mappings/mockedteams/BTS-1/bts1.json', 'utf-8'));
    const updatedIssue = updateIssueField(issueJSON, {
        status: 'In Review',
    });
    const { id } = await setupWireMockMapping(request, 'GET', updatedIssue, '/rest/api/2/issue/BTS-1');

    // change status
    await statusTransitionMenu.getByRole('button', { name: 'In Progress' }).click();

    const menuDropdown = issueFrame.getByTestId('issue.status-transition-menu-dropdown');
    const inReview = menuDropdown.getByText('In Review');
    await expect(inReview).toBeVisible();
    await inReview.click();
    await page.waitForTimeout(2000);

    await expect(statusTransitionMenu).toHaveText('In Review');

    await cleanupWireMockMapping(request, id);
});
