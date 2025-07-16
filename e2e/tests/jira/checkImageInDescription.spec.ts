import { expect, test } from '@playwright/test';
import { authenticateWithJira, getIssueFrame } from 'e2e/helpers';

test('Test image display in ticket description', async ({ page }) => {
    await authenticateWithJira(page);

    await page.getByRole('treeitem', { name: 'BTS-1 - User Interface Bugs' }).click();
    await page.waitForTimeout(2000);

    // Close the Settings tab to focus on the issue view
    await page.getByRole('tab', { name: 'Atlassian Settings' }).getByLabel(/close/i).click();

    // Get the issue frame using the existing helper
    const issueFrame = await getIssueFrame(page);

    await page.waitForTimeout(2000);
    // Check if the image with test ID exists
    const testImage = issueFrame.locator('img[data-testid="description-image"]');
    await expect(testImage).toBeVisible();
    // Verify image is properly loaded (not showing fallback)
    const imageSrc = await testImage.getAttribute('src');
    const originalSrc = await testImage.getAttribute('atlascode-original-src');
    // Wait for retry mechanism if image failed initially
    if (originalSrc && imageSrc?.includes('no-image.svg')) {
        await page.waitForTimeout(3000);
        const newSrc = await testImage.getAttribute('src');
        expect(newSrc).not.toContain('no-image.svg');
    }
    // Verify image is either the direct URL or base64 data
    const finalSrc = await testImage.getAttribute('src');
    expect(finalSrc).toMatch(/test\.jpg|data:image/);
});
