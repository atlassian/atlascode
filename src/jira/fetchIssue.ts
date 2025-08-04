import { createIssueUI, EditIssueUI, editIssueUI } from '@atlassianlabs/jira-metaui-client';
import { DEFAULT_API_VERSION } from '@atlassianlabs/jira-pi-client';
import {
    isMinimalIssue,
    MinimalIssue,
    minimalIssueFromJsonObject,
    MinimalORIssueLink,
} from '@atlassianlabs/jira-pi-common-models';
import { CreateMetaTransformerResult } from '@atlassianlabs/jira-pi-meta-models';
import { Experiments, FeatureFlagClient } from 'src/util/featureFlags';

import { DetailedSiteInfo } from '../atlclients/authInfo';
import { Container } from '../container';
import { SearchJiraHelper } from '../views/jira/searchJiraHelper';

export async function fetchCreateIssueUI(
    siteDetails: DetailedSiteInfo,
    projectKey: string,
): Promise<CreateMetaTransformerResult<DetailedSiteInfo>> {
    const client = await Container.clientManager.jiraClient(siteDetails);
    if (FeatureFlagClient.checkExperimentValue(Experiments.AtlascodePerformanceExperiment)) {
        const [fields, issuelinkTypes, cMeta] = await Promise.all([
            Container.jiraSettingsManager.getAllFieldsForSite(siteDetails),
            Container.jiraSettingsManager.getIssueLinkTypes(siteDetails),
            Container.jiraSettingsManager.getIssueCreateMetadata(projectKey, siteDetails),
        ]);
        return await createIssueUI(projectKey, client, DEFAULT_API_VERSION, fields, issuelinkTypes, cMeta, true);
    }
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
    const performanceEnabled = FeatureFlagClient.checkExperimentValue(Experiments.AtlascodePerformanceExperiment);
    if (performanceEnabled) {
        const [fieldIds, client, epicInfo] = await Promise.all([
            Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite(siteDetails),
            Container.clientManager.jiraClient(siteDetails),
            Container.jiraSettingsManager.getEpicFieldsForSite(siteDetails),
        ]);

        const res = await client.getIssue(issue, fieldIds);
        return minimalIssueFromJsonObject(res, siteDetails, epicInfo);
    }
    const fieldIds = await Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite(siteDetails);
    const client = await Container.clientManager.jiraClient(siteDetails);
    const epicInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(siteDetails);
    const res = await client.getIssue(issue, fieldIds);
    return minimalIssueFromJsonObject(res, siteDetails, epicInfo);
}

export async function fetchEditIssueUI(issue: MinimalIssue<DetailedSiteInfo>): Promise<EditIssueUI<DetailedSiteInfo>> {
    const client = await Container.clientManager.jiraClient(issue.siteDetails);
    if (FeatureFlagClient.checkExperimentValue(Experiments.AtlascodePerformanceExperiment)) {
        const [fields, issuelinkTypes, cMeta] = await Promise.all([
            Container.jiraSettingsManager.getAllFieldsForSite(issue.siteDetails),
            Container.jiraSettingsManager.getIssueLinkTypes(issue.siteDetails),
            Container.jiraSettingsManager.getIssueCreateMetadata(
                issue.key.substring(0, issue.key.indexOf('-')), // Project Key
                issue.siteDetails,
            ),
        ]);
        return await editIssueUI(issue, client, DEFAULT_API_VERSION, fields, issuelinkTypes, cMeta, true);
    }
    return await editIssueUI(issue, client);
}
