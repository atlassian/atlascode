import { Comment, CommentVisibility, IssueKeyAndSite } from '@atlassianlabs/jira-pi-common-models';

import { issueCommentEvent } from '../../analytics';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { Container } from '../../container';
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
