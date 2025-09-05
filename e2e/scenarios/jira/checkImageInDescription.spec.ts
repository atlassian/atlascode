import { APIRequestContext, expect, Page } from '@playwright/test';
import { getIssueFrame, setupIssueMock } from 'e2e/helpers';
import { JiraTypes } from 'e2e/helpers/types';
import { description } from 'e2e/mock-data/description';
import { AtlascodeDrawer, AtlassianSettings } from 'e2e/page-objects';

export async function checkImageInDescription(page: Page, request: APIRequestContext, type: JiraTypes) {
    await new AtlassianSettings(page).closeSettingsPage();
    await new AtlascodeDrawer(page).jira.openIssue('BTS-1 - User Interface Bugs');

    const descriptionToUse = type === JiraTypes.DC ? description.dc : description.cloud;
    const cleanupIssueMock = await setupIssueMock(request, {
        description: descriptionToUse,
    });

    // Get the issue frame using the existing helper
    const issueFrame = await getIssueFrame(page);

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

    await cleanupIssueMock();
}
