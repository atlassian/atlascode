import { createIssueUI, EditIssueUI, editIssueUI } from '@atlassianlabs/jira-metaui-client';
import {
    isMinimalIssue,
    MinimalIssue,
    minimalIssueFromJsonObject,
    MinimalORIssueLink,
} from '@atlassianlabs/jira-pi-common-models';
import { CreateMetaTransformerResult } from '@atlassianlabs/jira-pi-meta-models';

import { DetailedSiteInfo } from '../atlclients/authInfo';
import { Container } from '../container';
import { SearchJiraHelper } from '../views/jira/searchJiraHelper';

export async function fetchCreateIssueUI(
    siteDetails: DetailedSiteInfo,
    projectKey: string,
): Promise<CreateMetaTransformerResult<DetailedSiteInfo>> {
    const client = await Container.clientManager.jiraClient(siteDetails);

    return await createIssueUI(projectKey, client);
}

export async function getCachedOrFetchMinimalIssue(
    issueKey: string,
    siteDetails: DetailedSiteInfo,
): Promise<MinimalIssue<DetailedSiteInfo>> {
    const foundIssue = await getCachedIssue(issueKey);

    if (foundIssue && isMinimalIssue(foundIssue)) {
        return foundIssue;
    }

    return await fetchMinimalIssue(issueKey, siteDetails);
}

export async function getCachedIssue(issueKey: string): Promise<MinimalORIssueLink<DetailedSiteInfo> | undefined> {
    return SearchJiraHelper.findIssue(issueKey);
}

export async function fetchMinimalIssue(
    issue: string,
    siteDetails: DetailedSiteInfo,
): Promise<MinimalIssue<DetailedSiteInfo>> {
    const fieldIds = await Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite(siteDetails);
    const client = await Container.clientManager.jiraClient(siteDetails);
    const epicInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(siteDetails);

    const res = await client.getIssue(issue, fieldIds);
    return minimalIssueFromJsonObject(res, siteDetails, epicInfo);
}

export async function fetchEditIssueUI(issue: MinimalIssue<DetailedSiteInfo>): Promise<EditIssueUI<DetailedSiteInfo>> {
    const client = await Container.clientManager.jiraClient(issue.siteDetails);

    return await editIssueUI(issue, client);
}
