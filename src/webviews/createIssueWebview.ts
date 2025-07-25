import { emptyIssueType, emptyProject, IssueType, Project } from '@atlassianlabs/jira-pi-common-models';
import { CreateMetaTransformerResult, FieldValues, IssueTypeUI, ValueType } from '@atlassianlabs/jira-pi-meta-models';
import { decode } from 'base64-arraybuffer-es6';
import { format } from 'date-fns';
import FormData from 'form-data';
import { commands, Position, Uri, ViewColumn, window } from 'vscode';

import { issueCreatedEvent } from '../analytics';
import { DetailedSiteInfo, emptySiteInfo, Product, ProductJira } from '../atlclients/authInfo';
import { showIssue } from '../commands/jira/showIssue';
import { configuration } from '../config/configuration';
import { Commands } from '../constants';
import { Container } from '../container';
import {
    CreateIssueAction,
    isCreateIssue,
    isScreensForProjects,
    isScreensForSite,
    isSetIssueType,
} from '../ipc/issueActions';
import { CreateIssueData } from '../ipc/issueMessaging';
import { Action } from '../ipc/messaging';
import { fetchCreateIssueUI } from '../jira/fetchIssue';
import { WebViewID } from '../lib/ipc/models/common';
import { Logger } from '../logger';
import { OnJiraEditedRefreshDelay } from '../util/time';
import { SearchJiraHelper } from '../views/jira/searchJiraHelper';
import { AbstractIssueEditorWebview } from './abstractIssueEditorWebview';
import { InitializingWebview } from './abstractWebview';

export interface PartialIssue {
    uri?: Uri;
    position?: Position;
    onCreated?: (data: CommentData | BBData) => void;
    summary?: string;
    description?: string;
}

export interface CommentData {
    uri: Uri;
    position: Position;
    issueKey: string;
    summary: string;
}

export interface BBData {
    issueKey: string;
}

const emptyCreateMetaResult: CreateMetaTransformerResult<DetailedSiteInfo> = {
    selectedIssueType: emptyIssueType,
    issueTypeUIs: {},
    problems: {},
    issueTypes: [],
};

export class CreateIssueWebview
    extends AbstractIssueEditorWebview
    implements InitializingWebview<PartialIssue | undefined>
{
    private _partialIssue: PartialIssue | undefined;
    private _currentProject: Project | undefined;
    private _screenData: CreateMetaTransformerResult<DetailedSiteInfo>;
    private _selectedIssueTypeId: string | undefined;
    private _siteDetails: DetailedSiteInfo;
    private _projectsWithCreateIssuesPermission: { [siteId: string]: Project[] };

    constructor(extensionPath: string) {
        super(extensionPath);
        this._screenData = emptyCreateMetaResult;
        this._siteDetails = emptySiteInfo;
        this._projectsWithCreateIssuesPermission = {};
    }

    public get title(): string {
        return 'Create Jira Issue';
    }
    public get id(): string {
        return WebViewID.CreateJiraIssueWebview;
    }

    public get siteOrUndefined(): DetailedSiteInfo | undefined {
        return this._siteDetails;
    }

    public get productOrUndefined(): Product | undefined {
        return ProductJira;
    }

    protected onPanelDisposed() {
        this.reset();
        super.onPanelDisposed();
    }

    private reset() {
        this._screenData = emptyCreateMetaResult;
        this._siteDetails = emptySiteInfo;
    }

    async createOrShow(column?: ViewColumn, data?: PartialIssue): Promise<void> {
        await super.createOrShow(column);

        this.initialize(data);
    }

    async initialize(data?: PartialIssue) {
        this._partialIssue = data;

        await this.updateSiteAndProject();

        if (data) {
            this._screenData = emptyCreateMetaResult;
        } else {
            this._partialIssue = {};
        }

        this.invalidate();
    }

    private getSiteWithMaxIssues(): DetailedSiteInfo | undefined {
        const availableSites = Container.siteManager.getSitesAvailable(ProductJira);
        const { siteWithMaxIssues } = availableSites.reduce(
            (prev: { numIssues: number; siteWithMaxIssues: DetailedSiteInfo | null }, curr) => {
                const siteIssues = SearchJiraHelper.getAssignedIssuesPerSite(curr.id);
                if (siteIssues && siteIssues.length > 0 && siteIssues.length > prev.numIssues) {
                    prev.numIssues = siteIssues.length;
                    prev.siteWithMaxIssues = curr;
                }
                return prev;
            },
            { numIssues: 0, siteWithMaxIssues: null },
        );
        if (siteWithMaxIssues) {
            return siteWithMaxIssues;
        }
        return undefined;
    }

    private getProjectKeyWithMaxIssues(siteId: string): string | undefined {
        const siteIssues = SearchJiraHelper.getAssignedIssuesPerSite(siteId);
        if (siteIssues && siteIssues.length > 0) {
            const issuesNumberPerProjectKey = siteIssues.reduce((prev: Record<string, number>, issue) => {
                const projectKey = issue.key?.split('-')[0];
                if (!prev[projectKey]) {
                    prev[projectKey] = 1;
                    return prev;
                }
                prev[projectKey]++;
                return prev;
            }, {});
            const projectKeyWithMaxIssues = Object.keys(issuesNumberPerProjectKey).reduce(
                (prev: string, curr: string) =>
                    issuesNumberPerProjectKey[curr] > issuesNumberPerProjectKey[prev] ? curr : prev,
            );
            if (projectKeyWithMaxIssues) {
                return projectKeyWithMaxIssues;
            }
        }
        return undefined;
    }

    private async updateSiteAndProject(inputSite?: DetailedSiteInfo, inputProject?: Project) {
        if (inputSite) {
            this._siteDetails = inputSite;
        } else {
            let siteId = Container.config.jira.lastCreateSiteAndProject.siteId;
            if (!siteId) {
                siteId = '';
            }
            const configSite = Container.siteManager.getSiteForId(ProductJira, siteId);
            if (configSite) {
                this._siteDetails = configSite;
            } else {
                const siteWithMaxIssues = this.getSiteWithMaxIssues();
                if (siteWithMaxIssues) {
                    this._siteDetails = siteWithMaxIssues;
                } else {
                    this._siteDetails = Container.siteManager.getFirstSite(ProductJira.key);
                }
            }
        }

        if (inputSite && !inputProject) {
            this._currentProject = await Container.jiraProjectManager.getFirstProject(this._siteDetails);
        } else if (inputProject) {
            this._currentProject = inputProject;
        } else {
            let projectKey = Container.config.jira.lastCreateSiteAndProject.projectKey;
            if (!projectKey) {
                projectKey = '';
            }
            const configProject = await Container.jiraProjectManager.getProjectForKey(this._siteDetails, projectKey);
            if (configProject) {
                this._currentProject = configProject;
            } else {
                const projectKeyWithMaxIssues = this.getProjectKeyWithMaxIssues(this._siteDetails.id);
                if (projectKeyWithMaxIssues) {
                    this._currentProject = await Container.jiraProjectManager.getProjectForKey(
                        this._siteDetails,
                        projectKeyWithMaxIssues,
                    );
                } else {
                    this._currentProject = await Container.jiraProjectManager.getFirstProject(this._siteDetails);
                }
            }
        }

        await configuration.setLastCreateSiteAndProject({
            siteId: this._siteDetails.id,
            projectKey: this._currentProject!.key,
        });
    }

    private async getProjectsWithPermission(siteDetails: DetailedSiteInfo) {
        const siteId = siteDetails.id;
        if (this._projectsWithCreateIssuesPermission[siteId]) {
            return this._projectsWithCreateIssuesPermission[siteId];
        }

        const availableProjects = await Container.jiraProjectManager.getProjects(siteDetails);
        const projectsWithPermission = await Container.jiraProjectManager.filterProjectsByPermission(
            siteDetails,
            availableProjects,
            'CREATE_ISSUES',
        );

        this._projectsWithCreateIssuesPermission = { [siteId]: projectsWithPermission };
        return projectsWithPermission;
    }

    public async invalidate() {
        await this.updateFields();
        Container.pmfStats.touchActivity();
    }

    async handleSelectOptionCreated(fieldKey: string, newValue: any, nonce?: string): Promise<void> {
        const issueTypeUI: IssueTypeUI<DetailedSiteInfo> = this._screenData.issueTypeUIs[this._selectedIssueTypeId!];

        if (!Array.isArray(issueTypeUI.fieldValues[fieldKey])) {
            issueTypeUI.fieldValues[fieldKey] = [];
        }

        if (!Array.isArray(issueTypeUI.selectFieldOptions[fieldKey])) {
            issueTypeUI.selectFieldOptions[fieldKey] = [];
        }

        if (issueTypeUI.fields[fieldKey].valueType === ValueType.Version) {
            if (issueTypeUI.selectFieldOptions[fieldKey][0].options) {
                issueTypeUI.selectFieldOptions[fieldKey][0].options.push(newValue);
            }
        } else {
            issueTypeUI.selectFieldOptions[fieldKey].push(newValue);
            issueTypeUI.selectFieldOptions[fieldKey] = issueTypeUI.selectFieldOptions[fieldKey].sort();
        }

        issueTypeUI.fieldValues[fieldKey].push(newValue);

        this._screenData.issueTypeUIs[this._selectedIssueTypeId!] = issueTypeUI;

        const optionMessage = {
            type: 'optionCreated',
            fieldValues: { [fieldKey]: issueTypeUI.fieldValues[fieldKey] },
            selectFieldOptions: { [fieldKey]: issueTypeUI.selectFieldOptions[fieldKey] },
            fieldKey: fieldKey,
            nonce: nonce,
        };

        this.postMessage(optionMessage);
    }

    async updateFields() {
        // only update if we don't have data.
        // e.g. the user may have started editing.
        if (Object.keys(this._screenData.issueTypeUIs).length < 1) {
            this.forceUpdateFields();
        }
    }

    async forceUpdateFields(fieldValues?: FieldValues) {
        if (this.isRefeshing || !this._siteDetails || !this._currentProject) {
            return;
        }

        this.isRefeshing = true;
        try {
            const availableSites = Container.siteManager.getSitesAvailable(ProductJira);
            const projectsWithCreateIssuesPermission = await this.getProjectsWithPermission(this._siteDetails);

            const isHasPermissionForCurrentProject = projectsWithCreateIssuesPermission.find(
                (project) => project.id === this._currentProject?.id,
            );

            // if the current project does not have create issues permission, we will select the first project with permission
            if (!isHasPermissionForCurrentProject) {
                this._currentProject =
                    projectsWithCreateIssuesPermission.length > 0
                        ? projectsWithCreateIssuesPermission[0]
                        : emptyProject;
            }

            this._selectedIssueTypeId = '';
            this._screenData = await fetchCreateIssueUI(this._siteDetails, this._currentProject.key);
            this._selectedIssueTypeId = this._screenData.selectedIssueType.id;

            if (fieldValues) {
                const overrides = this.getValuesForExisitngKeys(
                    this._screenData.issueTypeUIs[this._selectedIssueTypeId],
                    fieldValues,
                    ['site', 'project', 'issuetype'],
                );
                this._screenData.issueTypeUIs[this._selectedIssueTypeId].fieldValues = {
                    ...this._screenData.issueTypeUIs[this._selectedIssueTypeId].fieldValues,
                    ...overrides,
                };
            }

            const issueTypeUI: IssueTypeUI<DetailedSiteInfo> = this._screenData.issueTypeUIs[this._selectedIssueTypeId];
            issueTypeUI.selectFieldOptions['site'] = availableSites;
            issueTypeUI.fieldValues['project'] = this._currentProject;
            issueTypeUI.selectFieldOptions['project'] = projectsWithCreateIssuesPermission;

            /*
            partial issue is used for prepopulating summary and description.
            fieldValues get sent when you change the project in the project dropdown so we can preserve any previously set values.
            e.g. you type some stuff, then you change the project...
            at this point the new project may or may not have the same (or some of the same) fields.
            we fill them in with the previous user values.
            */
            if (this._partialIssue && !fieldValues) {
                const currentVals = this._screenData.issueTypeUIs[this._selectedIssueTypeId].fieldValues;
                const partialvals = {
                    summary: this._partialIssue.summary,
                    description: this._partialIssue.description,
                };

                this._screenData.issueTypeUIs[this._selectedIssueTypeId].fieldValues = {
                    ...currentVals,
                    ...partialvals,
                };
            }

            const createData: CreateIssueData = this._screenData.issueTypeUIs[
                this._selectedIssueTypeId
            ] as CreateIssueData;

            createData.type = 'update';
            createData.transformerProblems = Container.config.jira.showCreateIssueProblems
                ? this._screenData.problems
                : {};

            this.postMessage(createData);
        } catch (e) {
            Logger.error(e, 'error updating issue fields');
            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
        } finally {
            this.isRefeshing = false;
        }
    }

    updateIssueType(issueType: IssueType, fieldValues: FieldValues) {
        const fieldOverrides = this.getValuesForExisitngKeys(this._screenData.issueTypeUIs[issueType.id], fieldValues);
        this._screenData.issueTypeUIs[issueType.id].fieldValues = {
            ...this._screenData.issueTypeUIs[issueType.id].fieldValues,
            ...fieldOverrides,
        };

        const selectOverrides = this.getValuesForExisitngKeys(
            this._screenData.issueTypeUIs[issueType.id],
            this._screenData.issueTypeUIs[this._selectedIssueTypeId!].selectFieldOptions,
        );
        this._screenData.issueTypeUIs[issueType.id].selectFieldOptions = {
            ...this._screenData.issueTypeUIs[issueType.id].selectFieldOptions,
            ...selectOverrides,
        };

        this._screenData.issueTypeUIs[issueType.id].fieldValues['issuetype'] = issueType;
        this._selectedIssueTypeId = issueType.id;

        const createData: CreateIssueData = this._screenData.issueTypeUIs[this._selectedIssueTypeId] as CreateIssueData;
        createData.type = 'update';
        createData.transformerProblems = Container.config.jira.showCreateIssueProblems ? this._screenData.problems : {};
        this.postMessage(createData);
    }

    getValuesForExisitngKeys(issueTypeUI: IssueTypeUI<DetailedSiteInfo>, values: FieldValues, keep?: string[]): any {
        const foundVals: FieldValues = {};

        Object.keys(issueTypeUI.fields).forEach((key) => {
            if (keep && keep.includes(key)) {
                // we need to use the current value
                foundVals[key] = issueTypeUI.fieldValues[key];
            } else if (values[key]) {
                foundVals[key] = values[key];
            }
        });

        return foundVals;
    }

    fireCallback(issueKey: string, summary: string) {
        if (
            this._partialIssue &&
            this._partialIssue.uri &&
            this._partialIssue.position &&
            this._partialIssue.onCreated
        ) {
            const createdSummary =
                this._partialIssue.summary && this._partialIssue.summary.trim().length > 0 ? '' : summary;
            this._partialIssue.onCreated({
                uri: this._partialIssue.uri,
                position: this._partialIssue.position,
                issueKey: issueKey,
                summary: createdSummary,
            });
            this.hide();
        }
    }

    formatIssueLinks(key: string, linkdata: any): any[] {
        const issuelinks: any[] = [];

        linkdata.issue.forEach((link: any) => {
            issuelinks.push({
                type: {
                    id: linkdata.type.id,
                },
                inwardIssue: linkdata.type.type === 'inward' ? { key: link.key } : { key: key },
                outwardIssue: linkdata.type.type === 'outward' ? { key: link.key } : { key: key },
            });
        });

        return issuelinks;
    }

    formatCreatePayload(a: CreateIssueAction): [any, any, any, any] {
        const payload: any = { ...a.issueData };
        let issuelinks: any = undefined;
        let attachments: any = undefined;
        let worklog: any = undefined;

        if (payload['issuelinks']) {
            issuelinks = payload['issuelinks'];
            delete payload['issuelinks'];
        }

        if (payload['attachment']) {
            attachments = payload['attachment'];
            delete payload['attachment'];
        }

        if (payload['worklog'] && payload['worklog'].enabled) {
            worklog = {
                worklog: [
                    {
                        add: {
                            ...payload['worklog'],
                            adjustEstimate: 'new',
                            started: payload['worklog'].started
                                ? format(payload['worklog'].started, "yyyy-MM-dd'T'HH:mm:ss.SSSXX")
                                : undefined,
                        },
                    },
                ],
            };
            delete payload['worklog'];
        }

        return [payload, worklog, issuelinks, attachments];
    }

    protected async onMessageReceived(msg: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(msg);

        if (!handled) {
            switch (msg.action) {
                case 'refresh': {
                    handled = true;
                    this.forceUpdateFields();
                    break;
                }

                case 'setIssueType': {
                    handled = true;
                    if (isSetIssueType(msg)) {
                        this.updateIssueType(msg.issueType, msg.fieldValues);
                    }
                    break;
                }

                case 'getScreensForProject': {
                    handled = true;
                    if (isScreensForProjects(msg)) {
                        await this.updateSiteAndProject(this._siteDetails, msg.project);
                        await this.forceUpdateFields(msg.fieldValues);
                    }
                    break;
                }

                case 'getScreensForSite': {
                    handled = true;
                    if (isScreensForSite(msg)) {
                        await this.updateSiteAndProject(msg.site, undefined);
                        // Note: we can't send fieldValues when site changes because custom field ids are different.
                        await this.forceUpdateFields();
                    }
                    break;
                }

                //TODO: refactor this
                case 'createIssue': {
                    handled = true;
                    if (isCreateIssue(msg)) {
                        try {
                            await configuration.setLastCreateSiteAndProject({
                                siteId: this._siteDetails.id,
                                projectKey: this._currentProject!.key,
                            });
                            const [payload, worklog, issuelinks, attachments] = this.formatCreatePayload(msg);

                            const client = await Container.clientManager.jiraClient(msg.site);
                            const resp = await client.createIssue({ fields: payload, update: worklog });

                            issueCreatedEvent(msg.site, resp.key).then((e) => {
                                Container.analyticsClient.sendTrackEvent(e);
                            });

                            if (issuelinks) {
                                this.formatIssueLinks(resp.key, issuelinks).forEach(async (link: any) => {
                                    await client.createIssueLink(resp.key, link);
                                });
                            }

                            if (attachments && attachments.length > 0) {
                                const formData = new FormData();
                                attachments.forEach((file: any) => {
                                    if (!file.fileContent) {
                                        throw new Error(`Unable to read the file '${file.name}'`);
                                    }
                                    formData.append('file', Buffer.from(decode(file.fileContent)), {
                                        filename: file.name,
                                        contentType: file.type,
                                    });
                                });
                                await client.addAttachments(resp.key, formData);
                            }
                            // TODO: [VSCODE-601] add a new analytic event for issue updates
                            commands.executeCommand(
                                Commands.RefreshAssignedWorkItemsExplorer,
                                OnJiraEditedRefreshDelay,
                            );
                            commands.executeCommand(Commands.RefreshCustomJqlExplorer, OnJiraEditedRefreshDelay);

                            this.postMessage({
                                type: 'issueCreated',
                                issueData: { ...resp, siteDetails: msg.site },
                                nonce: msg.nonce,
                            });

                            this.fireCallback(resp.key, payload.summary);

                            window
                                .showInformationMessage(`Issue ${resp.key} has been created`, 'Open Issue')
                                .then((selection) => {
                                    if (selection === 'Open Issue') {
                                        showIssue({ key: resp.key, siteDetails: msg.site });
                                    }
                                });
                        } catch (e) {
                            Logger.error(e, 'Error creating issue');
                            this.postMessage({
                                type: 'error',
                                reason: this.formatErrorReason(e, 'Error creating issue'),
                                nonce: msg.nonce,
                            });
                        }
                    }
                    break;
                }
                case 'refreshTreeViews': {
                    handled = true;
                    // Pass delay to allow Jira's indexes to update before refreshing
                    await commands.executeCommand(Commands.RefreshAssignedWorkItemsExplorer, OnJiraEditedRefreshDelay);
                    await commands.executeCommand(Commands.RefreshCustomJqlExplorer, OnJiraEditedRefreshDelay);
                    break;
                }
                case 'openProblemReport': {
                    handled = true;
                    Container.createIssueProblemsWebview.createOrShow(
                        undefined,
                        this._siteDetails,
                        this._currentProject,
                    );
                    break;
                }
                default: {
                    break;
                }
            }
        }

        return handled;
    }
}
