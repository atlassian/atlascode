import { expect, test } from '@playwright/test';
import {
    authenticateWithJira,
    cleanupWireMockMapping,
    getIssueFrame,
    setupWireMockMapping,
    updateIssueField,
} from 'e2e/helpers';
import fs from 'fs';

test('Test image check on attachments', async ({ page, context }) => {
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

    // Upload fake image file to the attachment dropzone
    const fileInput = issueFrame.locator('input[type="file"]');
    await fileInput.setInputFiles({
        name: 'new-image.png',
        mimeType: 'image/png',
        buffer: Buffer.from('fake-image-content'),
    });
    await page.waitForTimeout(2000);

    // Click the Save button to save the attachment
    await issueFrame.locator('button.ac-button').filter({ hasText: 'Save' }).click();
    await page.waitForTimeout(2000);

    await page.waitForTimeout(2000);
});
