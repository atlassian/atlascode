import { APIRequestContext, Page } from '@playwright/test';
import { getIssueFrame, getLastCommentPostBody } from 'e2e/helpers';
import { JiraTypes } from 'e2e/helpers/types';
import { AtlascodeDrawer, AtlassianSettings, JiraIssuePage } from 'e2e/page-objects';

const COMMENT_TEXT = 'This is a test comment added via e2e test';

const BODY_TYPE_ERROR =
    'Jira DC expects comment body as string, not ADF object. Keep commentBodyToString() in postComment.ts.';

export async function addComment(page: Page, request: APIRequestContext, type: JiraTypes) {
    await new AtlascodeDrawer(page).jira.openIssue('BTS-1 - User Interface Bugs');
    await new AtlassianSettings(page).closeSettingsPage();

    const issueFrame = await getIssueFrame(page);
    const issuePage = new JiraIssuePage(issueFrame);

    await issuePage.comments.addNew(COMMENT_TEXT);
    await page.waitForTimeout(2_000);

    // DC only: assert comment body was sent as string (not ADF). Requires Wiremock journal (CI must reach it too).
    if (type === JiraTypes.DC) {
        let lastComment = await getLastCommentPostBody(request);
        if (lastComment === null || lastComment === undefined) {
            await page.waitForTimeout(2_000);
            lastComment = await getLastCommentPostBody(request);
        }
        if (lastComment === null || lastComment === undefined) {
            throw new Error(
                'Could not verify comment request body: Wiremock journal empty or __admin/requests unreachable. ' +
                    'In CI, ensure wiremock-mockedteams has --max-request-journal-entries and the E2E container can reach http://wiremock-mockedteams:8080.',
            );
        }
        const { body } = lastComment;
        if (typeof body !== 'string') {
            const preview =
                typeof body === 'object' && body !== null && 'type' in body
                    ? `ADF object (type: ${(body as { type?: string }).type})`
                    : String(body).slice(0, 100);
            throw new Error(
                `${BODY_TYPE_ERROR} Request sent body as: ${preview}. ` +
                    'Keep commentBodyToString() in postComment.ts to convert ADF to string before calling the API.',
            );
        }
        if (!body.includes(COMMENT_TEXT)) {
            throw new Error(
                `Comment request body does not contain expected text "${COMMENT_TEXT.slice(0, 40)}...". ` +
                    'Wrong request in journal? Ensure we read the most recent POST to .../issue/.../comment.',
            );
        }

        if (await issuePage.comments.hasCommentBodyTypeError()) {
            const errText = await issuePage.comments.getCommentBodyTypeErrorText();
            throw new Error(`${BODY_TYPE_ERROR} Error shown: ${errText.slice(0, 300)}`);
        }
    }

    await issuePage.comments.expectExists(COMMENT_TEXT);
}
