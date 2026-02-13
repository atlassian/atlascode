import { Comment, CommentVisibility, IssueKeyAndSite } from '@atlassianlabs/jira-pi-common-models';

import { issueCommentEvent } from '../../analytics';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { Container } from '../../container';
import { convertAdfToWikimarkup } from '../../webviews/components/issue/common/adfToWikimarkup';

/**
 * Jira DC (and legacy) expects comment body as a string (wiki markup). If the UI sends ADF (object),
 * the API returns "Cannot deserialize value of type java.lang.String from Object value". Normalize
 * so we always send a string; Cloud accepts string too.
 */
function ensureCommentBodyString(comment: string | Record<string, unknown>): string {
    return typeof comment === 'string'
        ? comment
        : convertAdfToWikimarkup(comment as unknown as Parameters<typeof convertAdfToWikimarkup>[0]);
}

export async function postComment(
    issue: IssueKeyAndSite<DetailedSiteInfo>,
    comment: string | Record<string, unknown>,
    commentId?: string,
    restriction?: CommentVisibility,
): Promise<Comment> {
    const client = await Container.clientManager.jiraClient(issue.siteDetails);
    const body = ensureCommentBodyString(comment);

    const resp =
        commentId === undefined
            ? await client.addComment(issue.key, body, restriction)
            : await client.updateComment(issue.key, commentId, body, restriction);

    issueCommentEvent(issue.siteDetails).then((e) => {
        Container.analyticsClient.sendTrackEvent(e);
    });

    return resp;
}
