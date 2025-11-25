import { APIRequestContext, expect, Page } from '@playwright/test';
import { getIssueFrame, setupIssueMock } from 'e2e/helpers';
import { JiraTypes } from 'e2e/helpers/types';
import { AtlascodeDrawer, AtlassianSettings } from 'e2e/page-objects';

const IMAGE_SRC = 'https://mockedteams.atlassian.net/secure/attachment/10001/test-image.jpg';
const COMMENT_CONTENT = `<p><span class="image-wrap" style=""><img src="${IMAGE_SRC}" alt="test-image.jpg" height="360" width="540" style="border: 0px solid black" /></span></p>`;

export async function viewCommentWithImage(page: Page, request: APIRequestContext, type: JiraTypes) {
    await new AtlassianSettings(page).closeSettingsPage();

    const cleanupIssueMock = await setupIssueMock(request, { comment: COMMENT_CONTENT }, 'GET', type);

    await new AtlascodeDrawer(page).jira.openIssue('BTS-1 - User Interface Bugs');

    const issueFrame = await getIssueFrame(page);

    await expect(issueFrame.locator('.image-wrap img')).toBeVisible();
    await expect(issueFrame.locator('.image-wrap img')).toHaveAttribute('atlascode-original-src', IMAGE_SRC);

    await cleanupIssueMock();
}
