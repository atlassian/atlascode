import { APIRequestContext, Page } from '@playwright/test';
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
