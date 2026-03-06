import { APIRequestContext, Page } from '@playwright/test';
import { getIssueFrame } from 'e2e/helpers';
import { JiraTypes } from 'e2e/helpers/types';
import { AtlascodeDrawer, AtlassianSettings, JiraIssuePage } from 'e2e/page-objects';

const COMMENT_TEXT = 'This is a test comment added via e2e test';

const BODY_TYPE_ERROR =
    'Jira DC expects comment body as string, not ADF object. Keep commentBodyToString() in postComment.ts.';

/**
 * Add-comment E2E. For Jira DC we rely on Wiremock request matching (see addComment-dc-reject-object-body.json):
 * the stub matches when request body has $.body as object (ADF) and returns 400. So if the app sends ADF,
 * the extension gets 400 and either shows an error or the comment does not appear — the test then fails.
 */
export async function addComment(page: Page, _request: APIRequestContext, type: JiraTypes) {
    await new AtlascodeDrawer(page).jira.openIssue('BTS-1 - User Interface Bugs');
    await new AtlassianSettings(page).closeSettingsPage();

    const issueFrame = await getIssueFrame(page);
    const issuePage = new JiraIssuePage(issueFrame);

    await issuePage.comments.addNew(COMMENT_TEXT);
    await page.waitForTimeout(2_000);

    if (type === JiraTypes.DC && (await issuePage.comments.hasCommentBodyTypeError())) {
        const errText = await issuePage.comments.getCommentBodyTypeErrorText();
        throw new Error(`${BODY_TYPE_ERROR} Error shown: ${errText.slice(0, 300)}`);
    }

    await issuePage.comments.expectExists(COMMENT_TEXT);
}
