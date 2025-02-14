import { Comment, CommentVisibility, IssueKeyAndSite } from '@atlassianlabs/jira-pi-common-models';
import { issueCommentEvent } from '../../analytics';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { Container } from '../../container';

export async function postComment(
    issue: IssueKeyAndSite<DetailedSiteInfo>,
    comment: string,
    commentId?: string,
    restriction?: CommentVisibility,
): Promise<Comment> {
    const client = await Container.clientManager.jiraClient(issue.siteDetails);

    const resp =
        commentId === undefined
            ? await client.addComment(issue.key, comment, restriction)
            : await client.updateComment(issue.key, commentId, comment, restriction);

    issueCommentEvent(issue.siteDetails).then((e) => {
        Container.analyticsClient.sendTrackEvent(e);
    });

    return resp;
}
