import { createIssueUI, EditIssueUI, editIssueUI } from '@atlassianlabs/jira-metaui-client'; // add back "editIssueUI"
// import { EditIssueScreenTransformer } from '@atlassianlabs/jira-metaui-transformer';
// import { JiraClient } from '@atlassianlabs/jira-pi-client';
// import { getEpicFieldInfo } from '@atlassianlabs/jira-pi-common-models';
// import { IssueCreateMetadata } from '@atlassianlabs/jira-pi-meta-models';
// import { Fields, readField } from '@atlassianlabs/jira-pi-meta-models';
// import { FieldTransformerResult } from '@atlassianlabs/jira-pi-meta-models';
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

    // return await cachedEditIssueUI(issue, client, '2'); // New method with cache
    return await editIssueUI(issue, client);
}

// async function cachedEditIssueUI(
//     issue: MinimalIssue<DetailedSiteInfo>,
//     client: JiraClient<DetailedSiteInfo>,
//     apiVersion: string = '2',
// ): Promise<EditIssueUI<DetailedSiteInfo>> {
//     let fields = await Container.jiraSettingsManager.getAllFieldsForSite(issue.siteDetails);
//     console.log('creating edit ui...');
//     if (!fields) {
//         const allFields: Fields = {};
//         const fetchedFields = await client.getFields();
//         if (fetchedFields) {
//             fetchedFields.forEach((field) => {
//                 console.log('processing field', field);
//                 const key = field.key ? field.key : field.id;
//                 allFields[key] = readField(field);
//             });
//         }
//         fields = allFields;
//     }

//     console.log('getting link types...');
//     let issuelinkTypes = await Container.jiraSettingsManager.getIssueLinkTypes(issue.siteDetails);
//     if (!issuelinkTypes) {
//         issuelinkTypes = await client.getIssueLinkTypes();
//     }

//     console.log('getting epic info...');
//     const epicInfo = getEpicFieldInfo(fields);

//     console.log('got epic info', epicInfo);

//     console.log('fetching issue...');
//     const issueResp = await client.getIssue(
//         issue.key,
//         ['*all'],
//         'transitions,renderedFields,editmeta,transitions.fields',
//     );
//     const projectKey = issue.key.substring(0, issue.key.indexOf('-'));

//     console.log('fetching IssueCreateMetadata...');
//     const cMeta: IssueCreateMetadata = await client.getCreateIssueMetadata(projectKey);

//     console.log('creating transformer...');
//     const transformer: EditIssueScreenTransformer<DetailedSiteInfo> = new EditIssueScreenTransformer(
//         issue.siteDetails,
//         apiVersion,
//         fields,
//         issuelinkTypes,
//     );

//     console.log('creating name provider...');
//     const epicNameProvider = async (key: string) => {
//         const epicIssue = await client.getIssue(key, ['summary', epicInfo.epicName.id]);
//         if (epicIssue && epicIssue.fields && epicIssue.fields[epicInfo.epicName.id]) {
//             return epicIssue.fields[epicInfo.epicName.id];
//         }

//         return undefined;
//     };

//     console.log('transforming fields...');
//     const result: FieldTransformerResult = await transformer.transformIssue(issueResp, cMeta, epicNameProvider);
//     console.log('got result', result);
//     return {
//         ...result,
//         key: issue.key,
//         id: issue.id,
//         self: issue.self,
//         siteDetails: issue.siteDetails,
//         isEpic: issue.isEpic,
//         epicChildren: issue.epicChildren,
//         apiVersion: apiVersion,
//         epicFieldInfo: epicInfo,
//     };
// }
