import { APIRequestContext, Page } from '@playwright/test';
import { closeOnboardingQuickPick, setupPRCommentPost, setupPRComments, setupPullrequests } from 'e2e/helpers';
import { prCommentPost } from 'e2e/mock-data/prComments';
import { pullrequest } from 'e2e/mock-data/pullrequest';
import { AtlascodeDrawer, AtlassianSettings, PullRequestPage } from 'e2e/page-objects';

const COMMENT_TEXT = 'This is a test comment added to the pull request via e2e test';

export async function addCommentToPullRequest(page: Page, request: APIRequestContext) {
    await closeOnboardingQuickPick(page);

    // Set up pull request with initial comments
    await setupPullrequests(request, [pullrequest]);
    await setupPRComments(request, [prCommentPost]);

    // Set up the response for when a comment is posted
    await setupPRCommentPost(request, {
        ...prCommentPost,
        content: {
            ...prCommentPost.content,
            raw: 'test comment',
            html: '<p>test comment</p>',
        },
    });

    await new AtlassianSettings(page).closeSettingsPage();

    const { pullRequests } = new AtlascodeDrawer(page);
    await pullRequests.prTreeitem.click();
    await pullRequests.prDetails.waitFor({ state: 'visible' });
    await pullRequests.prDetails.click();
    await page.waitForTimeout(250);

    const pullRequestPage = new PullRequestPage(page);

    // Add a comment via Comments fragment
    await pullRequestPage.comments.addNew(COMMENT_TEXT);
    await page.waitForTimeout(1000);
    await pullRequestPage.comments.expectExists(COMMENT_TEXT);

    // Navigate to Files Changed and click specific file
    await pullRequestPage.files.expectFilesSectionLoaded();
    await pullRequestPage.files.changedFile.click();
    await page.waitForTimeout(500);

    // Trigger an inline comment in the diff and submit via fragment
    const commentDiffAdded = page.locator('div.comment-diff-added');
    await commentDiffAdded.first().click();
    await page.waitForTimeout(500);
    await pullRequestPage.files.addInlineComment();
    await page.waitForTimeout(500);
}
