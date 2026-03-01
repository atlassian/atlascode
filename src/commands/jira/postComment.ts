import { Comment, CommentVisibility, IssueKeyAndSite } from '@atlassianlabs/jira-pi-common-models';

import { issueCommentEvent } from '../../analytics';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { Container } from '../../container';
import { Logger } from '../../logger';
import { commentBodyToString } from '../../util/adfToCommentBody';

/** DC expects comment body as string; Cloud accepts ADF. Normalize only for DC. */
export async function postComment(
    issue: IssueKeyAndSite<DetailedSiteInfo>,
    comment: string | Record<string, unknown>,
    commentId?: string,
    restriction?: CommentVisibility,
): Promise<Comment> {
    const client = await Container.clientManager.jiraClient(issue.siteDetails);
    const bodyForApi = issue.siteDetails.isCloud ? comment : commentBodyToString(comment);
    const bodyTyped = bodyForApi as string; // Cloud accepts ADF object; client .d.ts types body as string

    const resp =
        commentId === undefined
            ? await client.addComment(issue.key, bodyTyped, restriction)
            : await client.updateComment(issue.key, commentId, bodyTyped, restriction);

    issueCommentEvent(issue.siteDetails).then((e) => {
        Container.analyticsClient.sendTrackEvent(e);
    });

    return resp;
}

/**
 * Fetches a comment with its renderedBody field populated.
 * This ensures wiki markup formatting is preserved when displaying comments.
 *
 * @param issue - The issue containing the comment
 * @param commentId - The ID of the comment to fetch
 * @returns Promise<Comment> with renderedBody populated
 */
export async function fetchCommentWithRenderedBody(
    issue: IssueKeyAndSite<DetailedSiteInfo>,
    commentId: string,
): Promise<Comment> {
    try {
        const client = await Container.clientManager.jiraClient(issue.siteDetails);

        // Fetch comment with expand parameter to get renderedBody
        // The expand parameter requests additional fields including HTML-rendered content
        const comment = await (client as any).getComment(issue.key, commentId, 'renderedBody');

        return comment;
    } catch (error) {
        Logger.error(error, `Failed to fetch comment ${commentId} with renderedBody for issue ${issue.key}`);
        throw error;
    }
}
