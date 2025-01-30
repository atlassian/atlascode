import { createIssueUI, editIssueUI, EditIssueUI } from '@atlassianlabs/jira-metaui-client';
import { MinimalIssue, minimalIssueFromJsonObject, MinimalORIssueLink } from '@atlassianlabs/jira-pi-common-models';
import { CreateMetaTransformerResult } from '@atlassianlabs/jira-pi-meta-models';
import { DetailedSiteInfo } from '../atlclients/authInfo';
import { Container } from '../container';

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
): Promise<MinimalORIssueLink<DetailedSiteInfo>> {
    let foundIssue = await getCachedIssue(issueKey);

    if (!foundIssue) {
        foundIssue = await fetchMinimalIssue(issueKey, siteDetails);
    }

    return foundIssue;
}

export async function getCachedIssue(issueKey: string): Promise<MinimalORIssueLink<DetailedSiteInfo> | undefined> {
    return await Container.jiraExplorer.findIssue(issueKey);
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
