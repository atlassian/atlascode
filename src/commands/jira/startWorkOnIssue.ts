import { isMinimalIssue, MinimalIssue, MinimalIssueOrKeyAndSite } from '@atlassianlabs/jira-pi-common-models';

import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { Container } from '../../container';
import { fetchMinimalIssue } from '../../jira/fetchIssue';
import { Features } from '../../util/featureFlags';

export async function startWorkOnIssue(issueOrKeyAndSite: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) {
    let issue: MinimalIssue<DetailedSiteInfo>;

    if (Container.featureFlagClient.checkGate(Features.StartWorkV3)) {
        issue = await fetchMinimalIssue(issueOrKeyAndSite.key, issueOrKeyAndSite.siteDetails);
    } else {
        if (isMinimalIssue(issueOrKeyAndSite)) {
            issue = issueOrKeyAndSite;
        } else {
            issue = await fetchMinimalIssue(issueOrKeyAndSite.key, issueOrKeyAndSite.siteDetails);
        }
    }

    if (!issue) {
        throw new Error(`Jira issue ${issueOrKeyAndSite.key} not found in site ${issueOrKeyAndSite.siteDetails}`);
    }

    const { startWorkV3WebviewFactory, startWorkWebviewFactory } = Container;

    const factory = Container.featureFlagClient.checkGate(Features.StartWorkV3)
        ? startWorkV3WebviewFactory
        : startWorkWebviewFactory;

    factory.createOrShow({ issue });
}
