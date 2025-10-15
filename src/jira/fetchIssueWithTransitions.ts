import { MinimalIssue, minimalIssueFromJsonObject } from '@atlassianlabs/jira-pi-common-models';

import { DetailedSiteInfo } from '../atlclients/authInfo';
import { Container } from '../container';

export async function fetchIssueWithTransitions(
    issueKey: string,
    siteDetails: DetailedSiteInfo,
): Promise<MinimalIssue<DetailedSiteInfo>> {
    const [client, epicInfo] = await Promise.all([
        Container.clientManager.jiraClient(siteDetails),
        Container.jiraSettingsManager.getEpicFieldsForSite(siteDetails),
    ]);
    const fieldIds = Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite(epicInfo);

    const res = await client.getIssue(issueKey, fieldIds, 'transitions,renderedFields,transitions.fields');
    const result = minimalIssueFromJsonObject(res, siteDetails, epicInfo);

    if (res.fields?.assignee) {
        (result as any).assignee = res.fields.assignee;
    }

    return result;
}

export async function fetchMultipleIssuesWithTransitions(
    issueKeys: string[],
    siteDetails: DetailedSiteInfo,
): Promise<MinimalIssue<DetailedSiteInfo>[]> {
    if (issueKeys.length === 0) {
        return [];
    }

    const issuePromises = issueKeys.map((key) => fetchIssueWithTransitions(key, siteDetails));

    return Promise.all(issuePromises);
}
