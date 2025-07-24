import { expect, test } from '@playwright/test';
import { attachment } from 'e2e/fixtures/attachment';
import { authenticateWithJira, getIssueFrame, setupIssueMock } from 'e2e/helpers';
import { AtlascodeDrawer } from 'e2e/page-objects';

test('Test upload image to attachments', async ({ page, request }) => {
    await authenticateWithJira(page);

    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    const drawer = new AtlascodeDrawer(page);
    await drawer.openJiraIssue('BTS-1 - User Interface Bugs');

    // Get the issue frame using the existing helper
    const issueFrame = await getIssueFrame(page);

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
    const cleanupIssueMock = await setupIssueMock(request, { attachment });

    // Click the Save button to save the attachment
    await saveButton.click();
    await page.waitForTimeout(2000);
    // Verify the attachment was added
    await expect(issueFrame.locator('text=test.jpg')).toBeVisible();

    // Clean up the mapping at the end
    await cleanupIssueMock();
});
