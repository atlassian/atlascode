import { APIRequestContext, expect, Page } from '@playwright/test';
import { closeOnboardingQuickPick, setupPRCommentPost, setupPRComments } from 'e2e/helpers';
import type { PullRequestComment } from 'e2e/helpers/types';
import { prCommentPost } from 'e2e/mock-data/prComments';
import { AtlascodeDrawer, AtlassianSettings, PRInlineCommentPage, PullRequestPage } from 'e2e/page-objects';

export async function addCommentToPullRequest(page: Page, request: APIRequestContext) {
    await closeOnboardingQuickPick(page);

    await new AtlassianSettings(page).closeSettingsPage();

    const { pullRequests } = new AtlascodeDrawer(page);
    await pullRequests.prTreeitem.click();
    await pullRequests.prDetails.waitFor({ state: 'visible' });
    await pullRequests.prDetails.click();
    await page.waitForTimeout(250);

    const pullRequestPage = new PullRequestPage(page);

    // Setup initial empty comments - PR page will request this first
    const cleanupComments = await setupPRComments(request, []);

    // First, let's make sure the PR page is loaded
    await pullRequestPage.expectPRPageLoaded();

    // Now that PR page is open and has requested comments, setup the mock for posting a comment
    const postedComment: PullRequestComment = {
        ...prCommentPost,
        content: {
            ...prCommentPost.content,
            raw: 'test comment',
            html: '<p>test comment</p>',
        },
    } as PullRequestComment;

    const cleanupCommentPost = await setupPRCommentPost(request, postedComment);

    await pullRequestPage.summary.sectionButton.click();
    await page.waitForTimeout(1000);

    // Look for comment forms in Summary section
    const editorContent = pullRequestPage.comments.editorContent;

    // Wait for editor components to be ready
    await pullRequestPage.comments.editor.waitFor({ state: 'visible', timeout: 10000 });
    await editorContent.waitFor({ state: 'visible', timeout: 10000 });

    await editorContent.click();
    await page.waitForTimeout(250);
    await editorContent.fill('test comment');
    await page.waitForTimeout(250);
    await pullRequestPage.comments.editorConfirmButton.click();
    await page.waitForTimeout(500);

    // Verify the comment appears in the UI
    const commentText = pullRequestPage.frame.locator('div.MuiBox-root p').filter({ hasText: 'test comment' });
    await expect(commentText.first()).toBeVisible({ timeout: 5000 });

    const cleanupInlineComments = await setupPRComments(request, [prCommentPost]);

    const cleanupInlineCommentPost = await setupPRCommentPost(request, postedComment);

    // Navigate to Files Changed and click specific file
    await pullRequestPage.files.expectFilesSectionLoaded();
    await pullRequestPage.files.changedFile.click();
    await page.waitForTimeout(500);

    // Trigger an inline comment in the diff and submit via fragment
    const commentDiffAdded = page.locator('div.comment-diff-added');
    await commentDiffAdded.first().click();
    await page.waitForTimeout(500);
    const PrInlineComment = new PRInlineCommentPage(page);
    await PrInlineComment.addInlineComment('test comment');
    await page.waitForTimeout(500);

    // Cleanup WireMock mappings
    await cleanupComments();
    await cleanupCommentPost();
    await cleanupInlineComments();
    await cleanupInlineCommentPost();
}
