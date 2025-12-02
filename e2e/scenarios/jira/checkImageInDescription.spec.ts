import { APIRequestContext, expect, Page } from '@playwright/test';
import { getIssueFrame, setupIssueMock } from 'e2e/helpers';
import { JiraTypes } from 'e2e/helpers/types';
import { description } from 'e2e/mock-data/description';
import { AtlascodeDrawer, AtlassianSettings } from 'e2e/page-objects';

const ISSUE_NAME = 'BTS-1 - User Interface Bugs';
const IMAGE_TEST_ID = 'description-image';

export async function checkImageInDescription(page: Page, request: APIRequestContext, type: JiraTypes) {
    await new AtlassianSettings(page).closeSettingsPage();

    const cleanupIssueMock = await setupIssueMock(
        request,
        {
            description: type === JiraTypes.DC ? description.dc : description.cloud,
        },
        'GET',
        type,
    );

    await new AtlascodeDrawer(page).jira.openIssue(ISSUE_NAME);

    const issueFrame = await getIssueFrame(page);

    // Check if the image with test ID exists
    const testImage = issueFrame.locator(`img[data-testid="${IMAGE_TEST_ID}"]`);
    await expect(testImage).toBeVisible();

    // Wait for the image to load properly (not showing fallback)
    await expect(testImage).not.toHaveAttribute('src', /no-image\.svg/, { timeout: 5_000 });

    // Verify image is either the direct URL or base64 data
    await expect(testImage).toHaveAttribute('src', /test\.jpg|data:image/);

    await cleanupIssueMock();
}
