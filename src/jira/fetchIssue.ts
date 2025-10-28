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
import { Logger } from '../logger';
import { SearchJiraHelper } from '../views/jira/searchJiraHelper';

// Use API v3 for all operations
const API_VERSION = '3';

export async function fetchCreateIssueUI(
    siteDetails: DetailedSiteInfo,
    projectKey: string,
): Promise<CreateMetaTransformerResult<DetailedSiteInfo>> {
    Logger.info(`[V3] fetchCreateIssueUI: Using API version ${API_VERSION} for CREATE`);
    Logger.info(`[V3] Project: ${projectKey}, Site: ${siteDetails.baseApiUrl}`);

    const client = await Container.clientManager.jiraClient(siteDetails);
    const [fields, issueLinkTypes, issueCreateMetadata] = await Promise.all([
        Container.jiraSettingsManager.getAllFieldsForSite(siteDetails),
        Container.jiraSettingsManager.getIssueLinkTypes(siteDetails),
        Container.jiraSettingsManager.getIssueCreateMetadata(projectKey, siteDetails),
    ]);
    return await createIssueUI(projectKey, client, API_VERSION, {
        fields,
        issueLinkTypes,
        issueCreateMetadata,
    });
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
    const [client, epicInfo] = await Promise.all([
        Container.clientManager.jiraClient(siteDetails),
        Container.jiraSettingsManager.getEpicFieldsForSite(siteDetails),
    ]);
    const fieldIds = Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite(epicInfo);

    const res = await client.getIssue(issue, fieldIds);
    return minimalIssueFromJsonObject(res, siteDetails, epicInfo);
}

export async function fetchEditIssueUI(issue: MinimalIssue<DetailedSiteInfo>): Promise<EditIssueUI<DetailedSiteInfo>> {
    Logger.info(`[V3] fetchEditIssueUI: Using API version ${API_VERSION} for UPDATE`);
    Logger.info(`[V3] Issue: ${issue.key}, Site: ${issue.siteDetails.baseApiUrl}`);

    const client = await Container.clientManager.jiraClient(issue.siteDetails);
    const [fields, issueLinkTypes, issueCreateMetadata] = await Promise.all([
        Container.jiraSettingsManager.getAllFieldsForSite(issue.siteDetails),
        Container.jiraSettingsManager.getIssueLinkTypes(issue.siteDetails),
        Container.jiraSettingsManager.getIssueCreateMetadata(
            issue.key.substring(0, issue.key.indexOf('-')), // Project Key
            issue.siteDetails,
        ),
    ]);
    return await editIssueUI(issue, client, API_VERSION, { fields, issueLinkTypes, issueCreateMetadata });
}
