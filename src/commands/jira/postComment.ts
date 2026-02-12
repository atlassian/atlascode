import { Comment, CommentVisibility, IssueKeyAndSite } from '@atlassianlabs/jira-pi-common-models';

import { issueCommentEvent } from '../../analytics';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { Container } from '../../container';

/**
 * Jira REST API (Cloud and DC) expects comment body as a string (wiki markup or plain text).
 * If the webview sends ADF (object) by mistake, we normalize to string to avoid
 * "Can not deserialize instance of java.lang.String out of START_OBJECT token".
 */
function ensureCommentBodyString(comment: string | unknown): string {
    if (typeof comment === 'string') {
        return comment;
    }
    if (comment !== null && typeof comment === 'object' && 'type' in comment) {
        return extractTextFromAdf(comment as AdfNode);
    }
    return String(comment ?? '');
}

interface AdfNode {
    type?: string;
    text?: string;
    content?: AdfNode[];
}

function extractTextFromAdf(node: AdfNode): string {
    if (node.text) {
        return node.text;
    }
    if (Array.isArray(node.content)) {
        return node.content.map(extractTextFromAdf).join('');
    }
    return '';
}

export async function postComment(
    issue: IssueKeyAndSite<DetailedSiteInfo>,
    comment: string | unknown,
    commentId?: string,
    restriction?: CommentVisibility,
): Promise<Comment> {
    const client = await Container.clientManager.jiraClient(issue.siteDetails);
    const bodyString = ensureCommentBodyString(comment);

    const resp =
        commentId === undefined
            ? await client.addComment(issue.key, bodyString, restriction)
            : await client.updateComment(issue.key, commentId, bodyString, restriction);

    issueCommentEvent(issue.siteDetails).then((e) => {
        Container.analyticsClient.sendTrackEvent(e);
    });

    return resp;
}
