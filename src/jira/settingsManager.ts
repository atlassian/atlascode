import { EpicFieldInfo, getEpicFieldInfo, IssueLinkType } from '@atlassianlabs/jira-pi-common-models';
import { Fields, readField } from '@atlassianlabs/jira-pi-meta-models';
import { IssueCreateMetadata } from '@atlassianlabs/jira-pi-meta-models';
import { Disposable } from 'vscode';

import { DetailedSiteInfo } from '../atlclients/authInfo';
import { Container } from '../container';
import { Logger } from '../logger';

const detailedIssueFields: string[] = [
    'summary',
    'description',
    'comment',
    'issuetype',
    'parent',
    'subtasks',
    'issuelinks',
    'status',
    'created',
    'reporter',
    'assignee',
    'labels',
    'attachment',
    'status',
    'priority',
    'components',
    'fixVersions',
];

const minimalDefaultIssueFields: string[] = [
    'summary',
    'issuetype',
    'status',
    'priority',
    'description',
    'created',
    'updated',
    'parent',
    'subtasks',
    'issuelinks',
    'assignee',
];

export class JiraSettingsManager extends Disposable {
    private _fieldStore: Map<string, Fields> = new Map<string, Fields>();
    private _issueLinkTypesStore: Map<string, IssueLinkType[]> = new Map<string, IssueLinkType[]>();
    private _projectKeyCMetaStore: Map<string, IssueCreateMetadata> = new Map<string, IssueCreateMetadata>(); // cMeta for different projects, (projectKey, siteInfi)

    constructor() {
        super(() => this.dispose());
    }

    public async getIssueCreateMetadata(
        projectKey: string,
        siteInfo: DetailedSiteInfo,
    ): Promise<IssueCreateMetadata | undefined> {
        let cMeta: IssueCreateMetadata = { projects: [] };
        if (
            !this._projectKeyCMetaStore.has(projectKey) ||
            this._projectKeyCMetaStore.get(projectKey)?.projects.length === 0
        ) {
            try {
                const client = await Container.clientManager.jiraClient(siteInfo);
                cMeta = await client.getCreateIssueMetadata(projectKey);
                this._projectKeyCMetaStore.set(projectKey, cMeta);
            } catch (error) {
                Logger.error(error, 'Create issue metadata not available.');
            }
        }
        return this._projectKeyCMetaStore.get(projectKey);
    }

    public async getIssueLinkTypes(site: DetailedSiteInfo): Promise<IssueLinkType[]> {
        if (!this._issueLinkTypesStore.has(site.id)) {
            let ilts: IssueLinkType[] = [];
            try {
                const client = await Container.clientManager.jiraClient(site);
                const issuelinkTypes = await client.getIssueLinkTypes();

                if (Array.isArray(issuelinkTypes)) {
                    ilts = issuelinkTypes;
                }
            } catch (err) {
                // TODO: [VSCODE-549] use /configuration to get settings
                // for now we need to catch 404 and set an empty array.
                Logger.error(err, 'issue links not enabled');
            } finally {
                this._issueLinkTypesStore.set(site.id, ilts);
            }
        }

        return this._issueLinkTypesStore.get(site.id)!;
    }

    public getMinimalIssueFieldIdsForSite(epicInfo: EpicFieldInfo): string[] {
        const fields = Array.from(minimalDefaultIssueFields);

        if (epicInfo.epicsEnabled) {
            fields.push(epicInfo.epicLink.id, epicInfo.epicName.id);
        }

        return fields;
    }

    public async getDetailedIssueFieldIdsForSite(site: DetailedSiteInfo): Promise<string[]> {
        const fields = Array.from(detailedIssueFields);
        const epicInfo = await this.getEpicFieldsForSite(site);

        if (epicInfo.epicsEnabled) {
            fields.push(epicInfo.epicLink.id, epicInfo.epicName.id);
        }

        return fields;
    }

    public async getEpicFieldsForSite(site: DetailedSiteInfo): Promise<EpicFieldInfo> {
        const allFields: Fields = await this.getAllFieldsForSite(site);
        return getEpicFieldInfo(allFields);
    }

    public async getAllFieldsForSite(site: DetailedSiteInfo): Promise<Fields> {
        if (!this._fieldStore.has(site.id)) {
            const fields = await this.fetchAllFieldsForSite(site);
            this._fieldStore.set(site.id, fields);
        }

        return this._fieldStore.get(site.id)!;
    }

    private async fetchAllFieldsForSite(site: DetailedSiteInfo): Promise<Fields> {
        const fields: Fields = {};
        const client = await Container.clientManager.jiraClient(site);
        const allFields = await client.getFields();
        if (allFields) {
            allFields.forEach((field) => {
                const key = field.key ? field.key : field.id;
                fields[key] = readField(field);
            });
        }

        return fields;
    }
}
