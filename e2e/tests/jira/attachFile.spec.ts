import { expect, test } from '@playwright/test';
import {
    authenticateWithJira,
    cleanupWireMockMapping,
    getIssueFrame,
    setupWireMockMapping,
    updateIssueField,
} from 'e2e/helpers';
import fs from 'fs';

test('Test upload image to attachments', async ({ page, request }) => {
    await authenticateWithJira(page);

    await page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' }).click();
    await page.waitForTimeout(2000);

    // Close the Settings tab to focus on the issue view
    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    // Get the issue frame using the existing helper
    const issueFrame = await getIssueFrame(page);

    await page.waitForTimeout(2000);

    // Click on the Add span element
    await issueFrame.locator('span').filter({ hasText: 'Add' }).click();
    await page.waitForTimeout(1000);

    // Click on the Attachment button
    await issueFrame.locator('button[role="menuitem"]').filter({ hasText: 'Attachment' }).click();
    await page.waitForTimeout(1000);

    // Upload image file to the attachment dropzone
    const fileInput = issueFrame.locator('input[type="file"]');
    await fileInput.setInputFiles('e2e/wiremock-mappings/mockedteams/test-files/test.jpg');
    await page.waitForTimeout(1000);

    // Wait for the Save button to be visible and enabled
    const saveButton = issueFrame.locator('button.ac-button').filter({ hasText: 'Save' });
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();

    // Prepare the mock data with the new attachment before clicking Save
    const issueJSON = JSON.parse(fs.readFileSync('e2e/wiremock-mappings/mockedteams/BTS-1/bts1.json', 'utf-8'));
    const newAttachment = {
        id: '10001',
        filename: 'test.jpg',
        author: {
            self: 'https://mockedteams.atlassian.net/rest/api/2/user?accountId=712020:13354d79-beaa-49d6-a55f-b9510892e3f4',
            accountId: '712020:13354d79-beaa-49d6-a55f-b9510892e3f4',
            displayName: 'Mocked McMock',
        },
        created: '2025-05-10T00:15:00.000-0700',
        size: 1024,
        mimeType: 'image/jpeg',
        content: 'https://mockedteams.atlassian.net/secure/attachment/10001/test.jpg',
    };

    const updatedIssue = updateIssueField(issueJSON, {
        attachment: newAttachment,
    });
    // Set up the mock mapping for the GET request (to fetch updated issue)
    const { id } = await setupWireMockMapping(request, 'GET', updatedIssue, '/rest/api/2/issue/BTS-1');
    // Click the Save button to save the attachment
    await saveButton.click();
    await page.waitForTimeout(2000);
    // Verify the attachment was added
    await expect(issueFrame.locator('text=test.jpg')).toBeVisible();

    // Clean up the mapping at the end
    await cleanupWireMockMapping(request, id);
});
