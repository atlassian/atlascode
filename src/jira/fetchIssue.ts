import { EditIssueUI } from '@atlassianlabs/jira-metaui-client'; // add back editIssueUI and createIssueUI when we change jira-metaui-client
// // Extra imports to test modifiedEditIssueUI and modifiedCreateIssueUI
import { CreateIssueScreenTransformer, EditIssueScreenTransformer } from '@atlassianlabs/jira-metaui-transformer';
import { DEFAULT_API_VERSION } from '@atlassianlabs/jira-pi-client';
import { JiraClient } from '@atlassianlabs/jira-pi-client';
import {
    isMinimalIssue,
    MinimalIssue,
    minimalIssueFromJsonObject,
    MinimalORIssueLink,
} from '@atlassianlabs/jira-pi-common-models';
import { IssueLinkType } from '@atlassianlabs/jira-pi-common-models';
import { getEpicFieldInfo } from '@atlassianlabs/jira-pi-common-models';
import { JiraSiteInfo } from '@atlassianlabs/jira-pi-common-models';
import { CreateMetaTransformerResult, emptyProjectIssueCreateMetadata } from '@atlassianlabs/jira-pi-meta-models';
import { IssueCreateMetadata } from '@atlassianlabs/jira-pi-meta-models';
import { Fields, readField } from '@atlassianlabs/jira-pi-meta-models';
import { FieldTransformerResult } from '@atlassianlabs/jira-pi-meta-models';

// End of extra imports
import { DetailedSiteInfo } from '../atlclients/authInfo';
import { Container } from '../container';
import { SearchJiraHelper } from '../views/jira/searchJiraHelper';

export async function fetchCreateIssueUI(
    siteDetails: DetailedSiteInfo,
    projectKey: string,
): Promise<CreateMetaTransformerResult<DetailedSiteInfo>> {
    const client = await Container.clientManager.jiraClient(siteDetails);
    const [fields, issuelinkTypes, cMeta] = await Promise.all([
        Container.jiraSettingsManager.getAllFieldsForSite(siteDetails),
        Container.jiraSettingsManager.getIssueLinkTypes(siteDetails),
        Container.jiraSettingsManager.getIssueCreateMetadata(projectKey, siteDetails),
    ]);
    return await modifiedCreateIssueUI(projectKey, client, DEFAULT_API_VERSION, fields, issuelinkTypes, cMeta);
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
    const [fields, issuelinkTypes, cMeta] = await Promise.all([
        Container.jiraSettingsManager.getAllFieldsForSite(issue.siteDetails),
        Container.jiraSettingsManager.getIssueLinkTypes(issue.siteDetails),
        Container.jiraSettingsManager.getIssueCreateMetadata(
            issue.key.substring(0, issue.key.indexOf('-')),
            issue.siteDetails,
        ),
    ]);
    // Lets do the cMeta call here so we can cache it
    // Still need to finish getting all the calls here lol
    // return await editIssueUI(issue, client, DEFAULT_API_VERSION); // This is the regular version for the function call
    return await modifiedEditIssueUI(issue, client, DEFAULT_API_VERSION, fields, issuelinkTypes, cMeta);
}

async function modifiedEditIssueUI<S extends JiraSiteInfo>(
    issue: MinimalIssue<S>,
    client: JiraClient<S>,
    apiVersion: string = '2',
    fields?: Fields,
    cachedIssueLinkTypes?: IssueLinkType[],
    cachedCMeta?: IssueCreateMetadata,
): Promise<EditIssueUI<S>> {
    console.log('creating edit ui...');
    const projectKey = issue.key.substring(0, issue.key.indexOf('-'));
    const [allFields, issuelinkTypes, cMeta, issueResp] = await Promise.all([
        getFieldsInfo(client, fields),
        getIssueLinkTypesInfo(client, cachedIssueLinkTypes),
        getCreateIssueMetadataInfo(client, projectKey, cachedCMeta),
        client.getIssue(issue.key, ['*all'], 'transitions,renderedFields,editmeta,transitions.fields'),
    ]); // Added some parallel HTTP requests for preformace....

    const epicInfo = getEpicFieldInfo(allFields);
    const transformer: EditIssueScreenTransformer<S> = new EditIssueScreenTransformer(
        issue.siteDetails,
        apiVersion,
        allFields,
        issuelinkTypes,
    );

    const epicNameProvider = async (key: string) => {
        const epicIssue = await client.getIssue(key, ['summary', epicInfo.epicName.id]);
        if (epicIssue && epicIssue.fields && epicIssue.fields[epicInfo.epicName.id]) {
            return epicIssue.fields[epicInfo.epicName.id];
        }

        return undefined;
    };
    const result: FieldTransformerResult = await transformer.transformIssue(issueResp, cMeta, epicNameProvider);
    return {
        ...result,
        key: issue.key,
        id: issue.id,
        self: issue.self,
        siteDetails: issue.siteDetails,
        isEpic: issue.isEpic,
        epicChildren: issue.epicChildren,
        apiVersion: apiVersion,
        epicFieldInfo: epicInfo,
    };
}

async function modifiedCreateIssueUI<S extends JiraSiteInfo>(
    projectKey: string,
    client: JiraClient<S>,
    apiVersion: string = '2',
    fields?: Fields,
    cachedIssueLinkTypes?: IssueLinkType[],
    cachedCMeta?: IssueCreateMetadata,
): Promise<CreateMetaTransformerResult<S>> {
    const [allFields, issuelinkTypes, cMeta] = await Promise.all([
        getFieldsInfo(client, fields),
        getIssueLinkTypesInfo(client, cachedIssueLinkTypes),
        getCreateIssueMetadataInfo(client, projectKey, cachedCMeta),
    ]); // Added some parallel HTTP requests for preformace....
    const createIssueTransformer: CreateIssueScreenTransformer<S> = new CreateIssueScreenTransformer(
        client.site,
        apiVersion,
        allFields,
        issuelinkTypes,
    );
    if (!Array.isArray(cMeta.projects) || cMeta.projects.length < 1) {
        cMeta.projects = [emptyProjectIssueCreateMetadata];
        cMeta.projects[0].issuetypes[0].fields['project'] = {
            id: 'project',
            key: 'project',
            name: 'Project',
            schema: {
                type: 'project',
                system: 'project',
                custom: undefined,
                items: undefined,
            },
            required: true,
            autoCompleteUrl: undefined,
            allowedValues: [],
        };
    }

    return await createIssueTransformer.transformIssueScreens(cMeta.projects[0]);
}

/*
    These three functions handle whether our application have sort of caching
    for the information needed for createIssueUI and editIssueUI.
    For our application, we will mostly always have sort of cache information
    but it is meant to handle first uses of each function where we do not have any
    information like the first time render of a webview. After the first, the application will
    have a registered cached for the Atlascode. Also, since this is a public package,
    these functions handle input with only the client and issue passed as arguments.
*/

async function getFieldsInfo<S extends JiraSiteInfo>(client: JiraClient<S>, fields?: Fields): Promise<Fields> {
    if (!fields) {
        const allFields: Fields = {};
        const fetchedFields = await client.getFields();
        if (fetchedFields) {
            fetchedFields.forEach((field) => {
                console.log('processing field', field);
                const key = field.key ? field.key : field.id;
                allFields[key] = readField(field);
            });
        }
        return allFields;
    }
    return fields;
}

async function getIssueLinkTypesInfo<S extends JiraSiteInfo>(
    client: JiraClient<S>,
    cachedIssueLinkTypes?: IssueLinkType[],
): Promise<IssueLinkType[]> {
    if (!cachedIssueLinkTypes) {
        return await client.getIssueLinkTypes();
    }
    return cachedIssueLinkTypes;
}

async function getCreateIssueMetadataInfo<S extends JiraSiteInfo>(
    client: JiraClient<S>,
    projectKey: string,
    cachedCMeta?: IssueCreateMetadata,
): Promise<IssueCreateMetadata> {
    if (!cachedCMeta) {
        return await client.getCreateIssueMetadata(projectKey);
    }
    return cachedCMeta;
}
