import { expect, test } from '@playwright/test';
import {
    authenticateWithJira,
    cleanupWireMockMapping,
    getIssueFrame,
    setupWireMockMapping,
    updateIssueField,
} from 'e2e/helpers';
import fs from 'fs';

test('View image in Jira comment', async ({ page, request }) => {
    await authenticateWithJira(page);

    //Prepare the mock data
    const issueJSON = JSON.parse(fs.readFileSync('e2e/wiremock-mappings/mockedteams/BTS-1/bts1.json', 'utf-8'));

    const updatedIssue = updateIssueField(issueJSON, {
        comment:
            '<p><span class="image-wrap" style=""><img src="https://mockedteams.atlassian.net/secure/attachment/10001/test-image.jpg" alt="test-image.jpg" height="360" width="540" style="border: 0px solid black" /></span></p>',
    });

    // Set up the mock mapping for the GET request (to fetch updated issue)
    const { id } = await setupWireMockMapping(request, 'GET', updatedIssue, '/rest/api/2/issue/BTS-1');

    await page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    const issueFrame = await getIssueFrame(page);
    await page.waitForTimeout(2000);

    await expect(issueFrame.locator('.image-wrap img')).toBeVisible();

    // Check that the atlascode-original-src attribute matches the expected URL
    await expect(issueFrame.locator('.image-wrap img')).toHaveAttribute(
        'atlascode-original-src',
        'https://mockedteams.atlassian.net/secure/attachment/10001/test-image.jpg',
    );

    // Clean up the mappings at the end
    await cleanupWireMockMapping(request, id);
});
