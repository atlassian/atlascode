import { expect, test } from '@playwright/test';
import {
    authenticateWithJira,
    cleanupWireMockMapping,
    getIssueFrame,
    setupWireMockMapping,
    updateIssueField,
} from 'e2e/helpers';
import fs from 'fs';

test('Update description flow', async ({ page, request }) => {
    const oldDescription = 'Track and resolve bugs related to the user interface.';
    const newDescription = 'Add e2e test for this functionality';

    await authenticateWithJira(page);

    await page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' }).click();
    await page.waitForTimeout(250);

    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();
    const issueFrame = await getIssueFrame(page);

    // Check the existing description
    await expect(issueFrame.getByText(oldDescription)).toBeVisible();

    // Click on the description element to enter edit mode
    await issueFrame.getByText(oldDescription).click();
    const textarea = issueFrame.locator('textarea');
    await expect(textarea).toBeVisible();

    // Clear the existing description and enter new one
    await textarea.clear();
    await textarea.fill(newDescription);
    await page.waitForTimeout(500);

    // Add the updated mock
    const issueJSON = JSON.parse(fs.readFileSync('e2e/wiremock-mappings/mockedteams/BTS-1/bts1.json', 'utf-8'));
    const updatedIssue = updateIssueField(issueJSON, {
        description: newDescription,
    });
    const { id } = await setupWireMockMapping(request, 'GET', updatedIssue, '/rest/api/2/issue/BTS-1');

    await issueFrame.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(2000);

    await expect(issueFrame.getByText(oldDescription)).not.toBeVisible();
    await expect(issueFrame.getByText(newDescription)).toBeVisible();
    await cleanupWireMockMapping(request, id);
});
