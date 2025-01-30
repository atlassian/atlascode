import { EpicFieldInfo, getEpicFieldInfo, IssueLinkType } from '@atlassianlabs/jira-pi-common-models';
import { Fields, readField } from '@atlassianlabs/jira-pi-meta-models';
import { Disposable } from 'vscode';
import { DetailedSiteInfo } from '../atlclients/authInfo';
import { Container } from '../container';
import { Logger } from '../logger';

export const detailedIssueFields: string[] = [
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
export const minimalDefaultIssueFields: string[] = [
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
];

export class JiraSettingsManager extends Disposable {
    private _fieldStore: Map<string, Fields> = new Map<string, Fields>();
    private _issueLinkTypesStore: Map<string, IssueLinkType[]> = new Map<string, IssueLinkType[]>();

    constructor() {
        super(() => this.dispose());
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

    public async getMinimalIssueFieldIdsForSite(site: DetailedSiteInfo): Promise<string[]> {
        let fields = Array.from(minimalDefaultIssueFields);
        let epicInfo = await this.getEpicFieldsForSite(site);

        if (epicInfo.epicsEnabled) {
            fields.push(epicInfo.epicLink.id, epicInfo.epicName.id);
        }

        return fields;
    }

    public async getDetailedIssueFieldIdsForSite(site: DetailedSiteInfo): Promise<string[]> {
        let fields = Array.from(detailedIssueFields);
        let epicInfo = await this.getEpicFieldsForSite(site);

        if (epicInfo.epicsEnabled) {
            fields.push(epicInfo.epicLink.id, epicInfo.epicName.id);
        }

        return fields;
    }

    public async getEpicFieldsForSite(site: DetailedSiteInfo): Promise<EpicFieldInfo> {
        let allFields: Fields = await this.getAllFieldsForSite(site);
        return getEpicFieldInfo(allFields);
    }

    public async getAllFieldsForSite(site: DetailedSiteInfo): Promise<Fields> {
        if (!this._fieldStore.has(site.id)) {
            let fields = await this.fetchAllFieldsForSite(site);
            this._fieldStore.set(site.id, fields);
        }

        return this._fieldStore.get(site.id)!;
    }

    private async fetchAllFieldsForSite(site: DetailedSiteInfo): Promise<Fields> {
        let fields: Fields = {};
        const client = await Container.clientManager.jiraClient(site);
        let allFields = await client.getFields();
        if (allFields) {
            allFields.forEach((field) => {
                const key = field.key ? field.key : field.id;
                fields[key] = readField(field);
            });
        }

        return fields;
    }
}
