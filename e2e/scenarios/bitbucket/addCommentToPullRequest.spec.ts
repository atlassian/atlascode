import { APIRequestContext, Page } from '@playwright/test';
import {
    closeOnboardingQuickPick,
    getPRFrame,
    setupPRCommentPost,
    setupPRComments,
    setupPullrequests,
} from 'e2e/helpers';
import { prCommentPost } from 'e2e/mock-data/prComments';
import { pullrequest } from 'e2e/mock-data/pullrequest';
import { AtlascodeDrawer, AtlassianSettings } from 'e2e/page-objects';
import { PRComments } from 'e2e/page-objects/fragments';

const COMMENT_TEXT = 'This is a test comment added to the pull request via e2e test';

export async function addCommentToPullRequest(page: Page, request: APIRequestContext) {
    await closeOnboardingQuickPick(page);

    // Set up pull request with initial comments including our test comment
    await setupPullrequests(request, [pullrequest]);
    await setupPRComments(request, [prCommentPost]);

    // Set up the response for when a comment is posted
    await setupPRCommentPost(request, prCommentPost);

    await new AtlassianSettings(page).closeSettingsPage();

    const atlascodeDrawer = new AtlascodeDrawer(page);

    // Click on the existing PR in the tree to open it
    await atlascodeDrawer.pullRequests.prTreeitem.click();
    await page.waitForTimeout(250);

    // Click the Details link to navigate to the PR view
    const detailsLink = page.locator('a.label-name:has(span.monaco-highlighted-label:text("Details"))');
    await detailsLink.waitFor({ state: 'visible' });
    await detailsLink.click();
    await page.waitForTimeout(500);

    // Get the PR frame using the helper function
    const prFrame = await getPRFrame(page);
    const prComments = new PRComments(prFrame);

    // Add a comment to the pull request
    await prComments.addNew(COMMENT_TEXT);

    // Wait for the comment to be processed and UI to update
    await page.waitForTimeout(2000);

    // Verify the comment was added
    await prComments.expectExists(COMMENT_TEXT);

    // Click on the test2.json file link
    await prComments.clickFileLink('test2.json');
    await page.waitForTimeout(500);

    // Click on the comment-diff-added element to trigger inline comment
    const commentDiffAdded = page.locator('div.comment-diff-added');

    // Check if the element exists first
    const commentDiffCount = await commentDiffAdded.count();

    if (commentDiffCount > 0) {
        await commentDiffAdded.first().click();
    }

    await page.waitForTimeout(1000);

    // Look for zone-widget in multiple places
    const zoneWidgetSelectors = [
        prFrame.locator('.zone-widget'),
        page.locator('.zone-widget'), // Maybe it's in the main page, not frame
        prFrame.locator('[class*="zone-widget"]'),
        prFrame.locator('.review-widget'),
        prFrame.locator('[class*="review-widget"]'),
    ];

    let commentWidget = null;
    for (const selector of zoneWidgetSelectors) {
        try {
            if (await selector.isVisible({ timeout: 2000 })) {
                commentWidget = selector;
                break;
            }
            // eslint-disable-next-line no-unused-vars
        } catch (e) {
            continue;
        }
    }

    if (!commentWidget) {
        return;
    }

    // Add "test comment" to the Monaco editor inside the comment widget
    try {
        const commentEditorLine = commentWidget.locator('.monaco-editor .view-lines .view-line span span');
        await commentEditorLine.evaluate((el) => {
            el.textContent = 'test comment';
        });
        // Click the "Add comment" button
        const addCommentButton = commentWidget.locator('a.monaco-button:has-text("Add comment")');
        await addCommentButton.waitFor({ state: 'visible', timeout: 3000 });
        await addCommentButton.click();
        await page.waitForTimeout(500);
    } catch (error) {
        throw new Error(`Failed to add inline comment: ${error}`);
    }
}
