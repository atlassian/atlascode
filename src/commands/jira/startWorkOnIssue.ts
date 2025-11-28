import { MinimalIssue, MinimalIssueOrKeyAndSite } from '@atlassianlabs/jira-pi-common-models';

import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { Container } from '../../container';
import { fetchMinimalIssue } from '../../jira/fetchIssue';

export async function startWorkOnIssue(issueOrKeyAndSite: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) {
    const issue: MinimalIssue<DetailedSiteInfo> = await fetchMinimalIssue(
        issueOrKeyAndSite.key,
        issueOrKeyAndSite.siteDetails,
    );

    if (!issue) {
        throw new Error(`Jira issue ${issueOrKeyAndSite.key} not found in site ${issueOrKeyAndSite.siteDetails}`);
    }

    Container.startWorkWebviewFactory.createOrShow({ issue });
}
