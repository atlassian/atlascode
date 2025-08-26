import { APIRequestContext, expect, Page } from '@playwright/test';
import { closeOnboardingQuickPick, setupPRCommentPost, setupPRComments } from 'e2e/helpers';
import type { PullRequestComment } from 'e2e/helpers/types';
import { prCommentPost } from 'e2e/mock-data/prComments';
import { AtlascodeDrawer, AtlassianSettings, PRInlineCommentPage, PullRequestPage } from 'e2e/page-objects';

export async function addCommentToPullRequest(page: Page, request: APIRequestContext) {
    await closeOnboardingQuickPick(page);

    await setupPRComments(request, [prCommentPost]);

    // Set up the response for when a comment is posted
    const postedComment: PullRequestComment = {
        ...prCommentPost,
        content: {
            ...prCommentPost.content,
            raw: 'test comment',
            html: '<p>test comment</p>',
        },
    } as PullRequestComment;

    await setupPRCommentPost(request, postedComment);

    await new AtlassianSettings(page).closeSettingsPage();

    const { pullRequests } = new AtlascodeDrawer(page);
    await pullRequests.prTreeitem.click();
    await pullRequests.prDetails.waitFor({ state: 'visible' });
    await pullRequests.prDetails.click();
    await page.waitForTimeout(250);

    const pullRequestPage = new PullRequestPage(page);

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
}

export async function addGeneralCommentToPullRequest(page: Page, request: APIRequestContext) {
    await closeOnboardingQuickPick(page);

    await setupPRComments(request, [prCommentPost]);

    const postedComment: PullRequestComment = {
        ...prCommentPost,
        content: {
            ...prCommentPost.content,
            raw: 'test general comment',
            html: '<p>test general comment</p>',
        },
    } as PullRequestComment;

    await setupPRCommentPost(request, postedComment);

    await new AtlassianSettings(page).closeSettingsPage();

    const { pullRequests } = new AtlascodeDrawer(page);
    await pullRequests.prTreeitem.click();
    await pullRequests.prDetails.waitFor({ state: 'visible' });
    await pullRequests.prDetails.click();
    await page.waitForTimeout(250);

    const pullRequestPage = new PullRequestPage(page);

    // First, let's make sure the PR page is loaded
    await pullRequestPage.expectPRPageLoaded();
    await pullRequestPage.summary.sectionButton.click();
    await page.waitForTimeout(1000);

    // Look for comment forms in Summary section
    const summaryForms = pullRequestPage.frame.getByTestId('common.comment-form');
    const summaryFormCount = await summaryForms.count();

    // Check Summary section for visible forms
    for (let i = 0; i < summaryFormCount; i++) {
        const isVisible = await summaryForms.nth(i).isVisible();
        if (isVisible) {
            const form = summaryForms.nth(i);
            const editor = form.getByTestId('common.rich-markdown-editor');
            const editorContent = editor.locator('div.ProseMirror[contenteditable="true"]');
            const confirmButton = form.getByRole('button', { name: 'save' });

            await editorContent.click();
            await page.waitForTimeout(250);
            await editorContent.fill('test general comment');
            await page.waitForTimeout(250);
            await confirmButton.click();
            await page.waitForTimeout(500);
            break;
        }
    }
    // Verify the comment appears in the UI
    const commentText = pullRequestPage.frame.locator('div.MuiBox-root p').filter({ hasText: 'test general comment' });
    await expect(commentText.first()).toBeVisible({ timeout: 5000 });
}
