import { APIRequestContext, Page } from '@playwright/test';
import { getIssueFrame, getLastCommentPostBody } from 'e2e/helpers';
import { JiraTypes } from 'e2e/helpers/types';
import { AtlascodeDrawer, AtlassianSettings, JiraIssuePage } from 'e2e/page-objects';

const COMMENT_TEXT = 'This is a test comment added via e2e test';

const BODY_TYPE_ERROR =
    'Jira (especially DC) expects comment body as wiki markup string, not ADF object. ' +
    'Add or keep the normalization in postComment.ts (ensureCommentBodyString).';

export async function addComment(page: Page, request: APIRequestContext, type: JiraTypes) {
    await new AtlascodeDrawer(page).jira.openIssue('BTS-1 - User Interface Bugs');
    await new AtlassianSettings(page).closeSettingsPage();

    const issueFrame = await getIssueFrame(page);
    const issuePage = new JiraIssuePage(issueFrame);

    await issuePage.comments.addNew(COMMENT_TEXT);
    await page.waitForTimeout(2_000);

    // DC only: Jira DC expects comment body as string (wiki markup), not ADF object. Cloud accepts ADF.
    if (type === JiraTypes.DC) {
        const lastComment = await getLastCommentPostBody(request);
        if (lastComment !== null && lastComment !== undefined) {
            const { body } = lastComment;
            if (typeof body !== 'string') {
                const preview =
                    typeof body === 'object' && body !== null && 'type' in body
                        ? `ADF object (type: ${(body as { type?: string }).type})`
                        : String(body).slice(0, 100);
                throw new Error(
                    `${BODY_TYPE_ERROR} Request sent body as: ${preview}. ` +
                        'Ensure ensureCommentBodyString() in postComment.ts converts ADF to string before calling the API.',
                );
            }
        }

        if (await issuePage.comments.hasCommentBodyTypeError()) {
            const errText = await issuePage.comments.getCommentBodyTypeErrorText();
            throw new Error(`${BODY_TYPE_ERROR} Error shown: ${errText.slice(0, 300)}`);
        }
    }

    await issuePage.comments.expectExists(COMMENT_TEXT);
}
