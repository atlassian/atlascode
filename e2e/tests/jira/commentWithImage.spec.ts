import { expect, test } from '@playwright/test';
import { authenticateWithJira, getIssueFrame, setupIssueMock } from 'e2e/helpers';

test('View image in Jira comment', async ({ page, request }) => {
    await authenticateWithJira(page);

    // Set up the mock mapping for the GET request (to fetch updated issue)
    const cleanupIssueMock = await setupIssueMock(request, {
        comment:
            '<p><span class="image-wrap" style=""><img src="https://mockedteams.atlassian.net/secure/attachment/10001/test-image.jpg" alt="test-image.jpg" height="360" width="540" style="border: 0px solid black" /></span></p>',
    });

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
    await cleanupIssueMock();
});
