import { EditIssueUI } from '@atlassianlabs/jira-metaui-client';
import {
    Comment,
    createEmptyMinimalIssue,
    emptyUser,
    isEmptyUser,
    IssueLinkIssueKeys,
    MinimalIssue,
    readIssueLinkIssue,
    readSearchResults,
    User,
} from '@atlassianlabs/jira-pi-common-models';
import { FieldValues, ValueType } from '@atlassianlabs/jira-pi-meta-models';
import { decode } from 'base64-arraybuffer-es6';
import FormData from 'form-data';
import timer from 'src/util/perf';
import { commands, env, window } from 'vscode';

import { issueCreatedEvent, issueUpdatedEvent, issueUrlCopiedEvent } from '../analytics';
import { performanceEvent } from '../analytics';
import { DetailedSiteInfo, emptySiteInfo, Product, ProductJira } from '../atlclients/authInfo';
import { clientForSite } from '../bitbucket/bbUtils';
import { PullRequestData } from '../bitbucket/model';
import { postComment } from '../commands/jira/postComment';
import { showIssue } from '../commands/jira/showIssue';
import { startWorkOnIssue } from '../commands/jira/startWorkOnIssue';
import { Commands } from '../constants';
import { Container } from '../container';
import {
    EditChildIssueAction,
    EditIssueAction,
    isAddAttachmentsAction,
    isCloneIssue,
    isCreateIssue,
    isCreateIssueLink,
    isCreateWorklog,
    isDeleteByIDAction,
    isDeleteWorklog,
    isGetImage,
    isHandleEditorFocus,
    isIssueComment,
    isIssueDeleteComment,
    isOpenStartWorkPageAction,
    isTransitionIssue,
    isUpdateVoteAction,
    isUpdateWatcherAction,
    isUpdateWorklog,
    TransitionChildIssueAction,
} from '../ipc/issueActions';
import { EditIssueData, emptyEditIssueData } from '../ipc/issueMessaging';
import { Action } from '../ipc/messaging';
import { isOpenPullRequest } from '../ipc/prActions';
import { fetchEditIssueUI, fetchMinimalIssue } from '../jira/fetchIssue';
import { fetchMultipleIssuesWithTransitions } from '../jira/fetchIssueWithTransitions';
import { parseJiraIssueKeys } from '../jira/issueKeyParser';
import { transitionIssue } from '../jira/transitionIssue';
import { Logger } from '../logger';
import { iconSet, Resources } from '../resources';
import { OnJiraEditedRefreshDelay } from '../util/time';
import { getJiraIssueUri } from '../views/jira/treeViews/utils';
import { NotificationManagerImpl } from '../views/notifications/notificationManager';
import { AbstractIssueEditorWebview } from './abstractIssueEditorWebview';
import { ContextMenuCommandData, InitializingWebview } from './abstractWebview';

const EditJiraIssueUIRenderEventName = 'ui.jira.editJiraIssue.render.lcp';
const EditJiraIssueUpdatesEventName = 'ui.jira.editJiraIssue.update.lcp';

export class JiraIssueWebview
    extends AbstractIssueEditorWebview
    implements InitializingWebview<MinimalIssue<DetailedSiteInfo>>
{
    private _issue: MinimalIssue<DetailedSiteInfo>;
    private _editUIData: EditIssueData;
    private _currentUser: User;

    constructor(extensionPath: string) {
        super(extensionPath);
        this._issue = createEmptyMinimalIssue(emptySiteInfo);
        this._editUIData = emptyEditIssueData;
        this._currentUser = emptyUser;
    }

    public get title(): string {
        return 'Jira Issue';
    }
    public get id(): string {
        return 'viewIssueScreen';
    }

    public get siteOrUndefined(): DetailedSiteInfo | undefined {
        return this._issue.siteDetails;
    }

    public get productOrUndefined(): Product | undefined {
        return ProductJira;
    }

    override setIconPath() {
        this._panel!.iconPath = Resources.icons.get(iconSet.JIRAICON);
    }

    async initialize(issue: MinimalIssue<DetailedSiteInfo>) {
        this._issue = issue;

        this.fireAdditionalSettings({
            rovoDevEnabled: Container.isRovoDevEnabled,
        });

        this.invalidate();

        NotificationManagerImpl.getInstance().clearNotificationsByUri(getJiraIssueUri(issue));
    }

    async invalidate() {
        // TODO: we might want to also update feature gates here?
        this.fireAdditionalSettings({
            rovoDevEnabled: Container.isRovoDevEnabled,
        });
        await this.forceUpdateIssue();
        Container.jiraActiveIssueStatusBar.handleActiveIssueChange(this._issue.key);
        Container.pmfStats.touchActivity();
    }

    private getFieldValuesForKeys(keys: string[]): FieldValues {
        const values: FieldValues = {};
        const editKeys: string[] = Object.keys(this._editUIData.fieldValues);

        keys.map((key, idx) => {
            if (editKeys.includes(key)) {
                values[key] = this._editUIData.fieldValues[key];
            }
        });

        return values;
    }

    /**
     * Enhances child issues (subtasks) and linked issues with their transitions data
     */
    private async enhanceChildAndLinkedIssuesWithTransitions(): Promise<void> {
        if (!this._editUIData?.fieldValues) {
            return;
        }

        try {
            const issueKeysToFetch: string[] = [];

            const subtasks = this._editUIData.fieldValues['subtasks'];
            if (Array.isArray(subtasks)) {
                subtasks.forEach((subtask: any) => {
                    if (subtask.key) {
                        issueKeysToFetch.push(subtask.key);
                    }
                });
            }

            const issuelinks = this._editUIData.fieldValues['issuelinks'];
            if (Array.isArray(issuelinks)) {
                issuelinks.forEach((issuelink: any) => {
                    if (issuelink.inwardIssue?.key) {
                        issueKeysToFetch.push(issuelink.inwardIssue.key);
                    }
                    if (issuelink.outwardIssue?.key) {
                        issueKeysToFetch.push(issuelink.outwardIssue.key);
                    }
                });
            }

            if (issueKeysToFetch.length > 0) {
                const enhancedIssues = await fetchMultipleIssuesWithTransitions(
                    issueKeysToFetch,
                    this._issue.siteDetails,
                );

                const enhancedIssuesMap = new Map();
                enhancedIssues.forEach((issue) => {
                    enhancedIssuesMap.set(issue.key, issue);
                });

                if (Array.isArray(subtasks)) {
                    subtasks.forEach((subtask: any, index: number) => {
                        const enhanced = enhancedIssuesMap.get(subtask.key);
                        if (enhanced) {
                            this._editUIData.fieldValues['subtasks'][index] = this.enhanceIssueWithTransitions(
                                subtask,
                                enhanced,
                            );
                        }
                    });
                }

                if (Array.isArray(issuelinks)) {
                    issuelinks.forEach((issuelink: any, index: number) => {
                        if (issuelink.inwardIssue?.key) {
                            this._editUIData.fieldValues['issuelinks'][index].inwardIssue =
                                this.enhanceIssueIfAvailable(issuelink.inwardIssue, enhancedIssuesMap);
                        }
                        if (issuelink.outwardIssue?.key) {
                            this._editUIData.fieldValues['issuelinks'][index].outwardIssue =
                                this.enhanceIssueIfAvailable(issuelink.outwardIssue, enhancedIssuesMap);
                        }
                    });
                }
            }
        } catch (error) {
            Logger.error(error, 'Error enhancing child and linked issues with transitions');
        }
    }

    private async forceUpdateIssue(refetchMinimalIssue: boolean = false) {
        if (this.isRefeshing) {
            return;
        }
        this.isRefeshing = true;
        this.postMessage({ type: 'loadingStart', loadingField: 'refresh' });
        try {
            if (refetchMinimalIssue) {
                this._issue = await fetchMinimalIssue(this._issue.key, this._issue.siteDetails);
            }
            // First Request begins here for issue rendering
            const renderPerfMarker = `${EditJiraIssueUIRenderEventName}_${this._issue.id}`;
            timer.mark(renderPerfMarker);

            const editUI: EditIssueUI<DetailedSiteInfo> = await fetchEditIssueUI(this._issue);
            if (this._panel) {
                this._panel.title = `${this._issue.key}`;
            }

            this._editUIData = editUI as EditIssueData;

            await this.enhanceChildAndLinkedIssuesWithTransitions();
            if (this._issue.issuetype.name === 'Epic') {
                this._issue.isEpic = true;
                this._editUIData.isEpic = true;
            } else {
                this._issue.isEpic = false;
                this._editUIData.isEpic = false;
            }
            this._editUIData.recentPullRequests = [];

            const msg = this._editUIData;

            msg.type = 'update';

            this.postMessage(msg); // Issue has rendered
            const uiDuration = timer.measureAndClear(renderPerfMarker);
            const epicFlag = { isEpic: this._issue.isEpic };
            performanceEvent(EditJiraIssueUIRenderEventName, uiDuration, epicFlag).then((event) => {
                Container.analyticsClient.sendTrackEvent(event);
            });

            // UI component updates
            const updatePerfMarker = `${EditJiraIssueUpdatesEventName}_${this._issue.id}`;
            timer.mark(updatePerfMarker);
            // call async-able update functions here
            await Promise.allSettled([
                this.updateEpicChildren(),
                this.updateCurrentUser(),
                this.updateWatchers(),
                this.updateVoters(),
                this.updateRelatedPullRequests(),
                this.fetchFullHierarchy(),
            ]);

            const updatesDuration = timer.measureAndClear(updatePerfMarker);
            performanceEvent(EditJiraIssueUpdatesEventName, updatesDuration, epicFlag).then((event) => {
                Container.analyticsClient.sendTrackEvent(event);
            });

            this.fireAdditionalSettings({
                rovoDevEnabled: Container.isRovoDevEnabled,
            });
        } catch (e) {
            Logger.error(e, 'Error updating issue');
            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
        } finally {
            this.isRefeshing = false;
            this.postMessage({ type: 'loadingEnd' });
        }
    }

    async updateEpicChildren() {
        if (this._issue.isEpic) {
            const site = this._issue.siteDetails;
            const [client, epicInfo] = await Promise.all([
                Container.clientManager.jiraClient(site),
                Container.jiraSettingsManager.getEpicFieldsForSite(site),
            ]);
            const fields = Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite(epicInfo);
            let jqlQuery: string = '';
            if (site.isCloud) {
                jqlQuery = `parent = "${this._issue.key}" order by lastViewed DESC`;
            } else {
                jqlQuery = `"Epic Link" = ${this._issue.key} order by lastViewed DESC`;
            }
            const res = await client.searchForIssuesUsingJqlGet(jqlQuery, fields);
            const searchResults = await readSearchResults(res, site, epicInfo);
            this.postMessage({ type: 'epicChildrenUpdate', epicChildren: searchResults.issues });
        }
    }

    async updateCurrentUser() {
        if (isEmptyUser(this._currentUser)) {
            const client = await Container.clientManager.jiraClient(this._issue.siteDetails);
            const user = await client.getCurrentUser();
            this._currentUser = user;
            this.postMessage({ type: 'currentUserUpdate', currentUser: user });
        }
    }

    async updateRelatedPullRequests() {
        const relatedPrs = await this.recentPullRequests();
        if (relatedPrs.length > 0) {
            this.postMessage({ type: 'pullRequestUpdate', recentPullRequests: relatedPrs });
        }
    }

    async updateWatchers() {
        if (this._editUIData.fieldValues['watches'] && this._editUIData.fieldValues['watches'].watchCount > 0) {
            const client = await Container.clientManager.jiraClient(this._issue.siteDetails);
            const watches = await client.getWatchers(this._issue.key);

            this._editUIData.fieldValues['watches'] = watches;
            this.postMessage({
                type: 'fieldValueUpdate',
                fieldValues: { watches: this._editUIData.fieldValues['watches'] },
            });
        }
    }

    async updateVoters() {
        if (this._editUIData.fieldValues['votes'] && this._editUIData.fieldValues['votes'].votes > 0) {
            const client = await Container.clientManager.jiraClient(this._issue.siteDetails);
            const votes = await client.getVotes(this._issue.key);

            this._editUIData.fieldValues['votes'] = votes;
            this.postMessage({
                type: 'fieldValueUpdate',
                fieldValues: { votes: this._editUIData.fieldValues['votes'] },
            });
        }
    }

    async handleSelectOptionCreated(fieldKey: string, newValue: any, nonce?: string): Promise<void> {
        if (!Array.isArray(this._editUIData.fieldValues[fieldKey])) {
            this._editUIData.fieldValues[fieldKey] = [];
        }

        if (!Array.isArray(this._editUIData.selectFieldOptions[fieldKey])) {
            this._editUIData.selectFieldOptions[fieldKey] = [];
        }

        if (this._editUIData.fields[fieldKey].valueType === ValueType.Version) {
            if (this._editUIData.selectFieldOptions[fieldKey][0].options) {
                this._editUIData.selectFieldOptions[fieldKey][0].options.push(newValue);
            }
        } else {
            this._editUIData.selectFieldOptions[fieldKey].push(newValue);
            this._editUIData.selectFieldOptions[fieldKey] = this._editUIData.selectFieldOptions[fieldKey].sort();
        }

        this._editUIData.fieldValues[fieldKey].push(newValue);

        const client = await Container.clientManager.jiraClient(this._issue.siteDetails);
        await client.editIssue(this._issue!.key, { [fieldKey]: this._editUIData.fieldValues[fieldKey] });

        const optionMessage = {
            type: 'optionCreated',
            fieldValues: { [fieldKey]: this._editUIData.fieldValues[fieldKey] },
            selectFieldOptions: { [fieldKey]: this._editUIData.selectFieldOptions[fieldKey] },
            fieldKey: fieldKey,
            nonce: nonce,
        };

        this.postMessage(optionMessage);
    }

    fieldNameForKey(key: string): string {
        const found = Object.values(this._editUIData.fields).filter((field) => field.key === key);
        if (Array.isArray(found) && found.length > 0) {
            return found[0].name;
        }

        return '';
    }

    private findMatchingTransition(transitions: any[] | undefined, statusName: string): any | undefined {
        if (!transitions) {
            return undefined;
        }

        return transitions.find((transition: any) => {
            const targetStatus = transition.to.name.toLowerCase();
            const desiredStatus = statusName.toLowerCase();

            return (
                targetStatus.includes(desiredStatus) ||
                (desiredStatus.includes('todo') && targetStatus.includes('todo')) ||
                (desiredStatus.includes('to do') && targetStatus.includes('todo')) ||
                (desiredStatus.includes('progress') && targetStatus.includes('progress')) ||
                (desiredStatus.includes('done') && (targetStatus.includes('done') || targetStatus.includes('closed')))
            );
        });
    }

    private enhanceIssueWithTransitions(originalIssue: any, enhancedIssue: any): any {
        return {
            ...originalIssue,
            transitions: enhancedIssue.transitions,
            status: enhancedIssue.status,
            assignee: enhancedIssue.assignee,
            priority: enhancedIssue.priority,
        };
    }

    private enhanceIssueIfAvailable(originalIssue: any, enhancedIssuesMap: Map<string, any>): any {
        if (!originalIssue?.key) {
            return originalIssue;
        }

        const enhanced = enhancedIssuesMap.get(originalIssue.key);
        return enhanced ? this.enhanceIssueWithTransitions(originalIssue, enhanced) : originalIssue;
    }

    protected override async onMessageReceived(msg: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(msg);

        if (!handled) {
            switch (msg.action) {
                case 'copyJiraIssueLink': {
                    handled = true;
                    const linkUrl = `${this._issue.siteDetails.baseLinkUrl}/browse/${this._issue.key}`;
                    await env.clipboard.writeText(linkUrl);
                    issueUrlCopiedEvent().then((e) => {
                        Container.analyticsClient.sendTrackEvent(e);
                    });
                    break;
                }
                case 'editIssue': {
                    handled = true;
                    const newFieldValues: FieldValues = (msg as EditIssueAction).fields;
                    try {
                        const client = await Container.clientManager.jiraClient(this._issue.siteDetails);
                        const teamId = (msg as EditIssueAction).teamId;

                        await client.editIssue(
                            this._issue!.key,
                            teamId ? { [Object.keys(newFieldValues)[0]]: teamId } : newFieldValues,
                        );
                        if (
                            Object.keys(newFieldValues).some(
                                (fieldKey) => this._editUIData.fieldValues[`${fieldKey}.rendered`] !== undefined,
                            )
                        ) {
                            await this.forceUpdateIssue();
                            await this.postMessage({
                                type: 'editIssueDone',
                                nonce: msg.nonce,
                            });
                        } else {
                            this._editUIData.fieldValues = { ...this._editUIData.fieldValues, ...newFieldValues };
                            this.postMessage({
                                type: 'fieldValueUpdate',
                                fieldValues: newFieldValues,
                                nonce: msg.nonce,
                            });
                            await this.postMessage({
                                type: 'editIssueDone',
                                nonce: msg.nonce,
                            });
                        }

                        Object.keys(newFieldValues).forEach((key) => {
                            issueUpdatedEvent(
                                this._issue.siteDetails,
                                this._issue.key,
                                key,
                                this.fieldNameForKey(key),
                            ).then((e) => {
                                Container.analyticsClient.sendTrackEvent(e);
                            });
                        });

                        await commands.executeCommand(
                            Commands.RefreshAssignedWorkItemsExplorer,
                            OnJiraEditedRefreshDelay,
                        );
                        await commands.executeCommand(Commands.RefreshCustomJqlExplorer, OnJiraEditedRefreshDelay);
                    } catch (e) {
                        Logger.error(e, 'Error updating issue');
                        this.postMessage({
                            type: 'error',
                            reason: this.formatErrorReason(e, 'Error updating issue'),
                            fieldValues: this.getFieldValuesForKeys(Object.keys(newFieldValues)),
                            nonce: msg.nonce,
                        });
                    }
                    break;
                }
                case 'editChildIssue': {
                    handled = true;
                    const childIssueMsg = msg as EditChildIssueAction;
                    const issueKey = childIssueMsg.issueKey;
                    const newFieldValues: FieldValues = childIssueMsg.fields;
                    try {
                        const client = await Container.clientManager.jiraClient(this._issue.siteDetails);
                        await client.editIssue(issueKey, newFieldValues);

                        await this.forceUpdateIssue();
                        await this.postMessage({
                            type: 'editIssueDone',
                            nonce: msg.nonce,
                        });

                        Object.keys(newFieldValues).forEach((key) => {
                            issueUpdatedEvent(this._issue.siteDetails, issueKey, key, this.fieldNameForKey(key)).then(
                                (e) => {
                                    Container.analyticsClient.sendTrackEvent(e);
                                },
                            );
                        });

                        await commands.executeCommand(
                            Commands.RefreshAssignedWorkItemsExplorer,
                            OnJiraEditedRefreshDelay,
                        );
                        await commands.executeCommand(Commands.RefreshCustomJqlExplorer, OnJiraEditedRefreshDelay);
                    } catch (e) {
                        Logger.error(e, 'Error updating child issue');
                        this.postMessage({
                            type: 'error',
                            reason: this.formatErrorReason(e, 'Error updating child issue'),
                            nonce: msg.nonce,
                        });
                    }
                    break;
                }
                case 'transitionChildIssue': {
                    handled = true;
                    const transitionMsg = msg as TransitionChildIssueAction;
                    const issueKey = transitionMsg.issueKey;
                    const statusName = transitionMsg.statusName;
                    try {
                        const client = await Container.clientManager.jiraClient(this._issue.siteDetails);

                        const childIssue = await fetchMinimalIssue(issueKey, this._issue.siteDetails);

                        const targetTransition = this.findMatchingTransition(childIssue.transitions, statusName);

                        if (targetTransition) {
                            await client.transitionIssue(issueKey, targetTransition.id);

                            await this.forceUpdateIssue();
                            await this.postMessage({
                                type: 'editIssueDone',
                                nonce: msg.nonce,
                            });
                        } else {
                            throw new Error(`No transition found for status: ${statusName}`);
                        }
                    } catch (e) {
                        Logger.error(e, 'Error transitioning child issue');
                        this.postMessage({
                            type: 'error',
                            reason: this.formatErrorReason(e, 'Error transitioning child issue'),
                            nonce: msg.nonce,
                        });
                    }
                    break;
                }
                case 'comment': {
                    if (isIssueComment(msg)) {
                        handled = true;
                        try {
                            if (msg.commentId) {
                                const res = await postComment(
                                    msg.issue,
                                    msg.commentBody,
                                    msg.commentId,
                                    msg.restriction,
                                );
                                const comments: Comment[] = this._editUIData.fieldValues['comment'].comments;
                                comments.splice(
                                    comments.findIndex((value) => value.id === msg.commentId),
                                    1,
                                    res,
                                );
                            } else {
                                const res = await postComment(msg.issue, msg.commentBody, undefined, msg.restriction);
                                this._editUIData.fieldValues['comment'].comments.push(res);
                            }

                            this.postMessage({
                                type: 'fieldValueUpdate',
                                fieldValues: { comment: this._editUIData.fieldValues['comment'], nonce: msg.nonce },
                            });
                        } catch (e) {
                            Logger.error(e, 'Error posting comment');
                            this.postMessage({
                                type: 'error',
                                reason: this.formatErrorReason(e, 'Error posting comment'),
                                nonce: msg.nonce,
                            });
                        }
                    }
                    break;
                }
                case 'deleteComment': {
                    if (isIssueDeleteComment(msg)) {
                        handled = true;
                        try {
                            const client = await Container.clientManager.jiraClient(msg.issue.siteDetails);
                            await client.deleteComment(msg.issue.key, msg.commentId);
                            const comments: Comment[] = this._editUIData.fieldValues['comment'].comments;
                            comments.splice(
                                comments.findIndex((value) => value.id === msg.commentId),
                                1,
                            );

                            this.postMessage({
                                type: 'fieldValueUpdate',
                                fieldValues: { comment: this._editUIData.fieldValues['comment'], nonce: msg.nonce },
                            });
                        } catch (e) {
                            Logger.error(e, 'Error deleting comment');
                            this.postMessage({
                                type: 'error',
                                reason: this.formatErrorReason(e, 'Error deleting comment'),
                                nonce: msg.nonce,
                            });
                        }
                    }
                    break;
                }
                case 'createIssue': {
                    if (isCreateIssue(msg)) {
                        handled = true;
                        try {
                            const client = await Container.clientManager.jiraClient(msg.site);
                            const resp = await client.createIssue(msg.issueData);

                            const createdIssue = await client.getIssue(resp.key, IssueLinkIssueKeys, '');
                            const picked = readIssueLinkIssue(createdIssue, msg.site);

                            // Check if this is an epic creating children vs regular issue creating subtasks
                            if (this._issue.isEpic) {
                                // For epics, refresh the epic children list
                                await this.updateEpicChildren();
                            } else {
                                // For regular issues, update subtasks as before
                                if (!Array.isArray(this._editUIData.fieldValues['subtasks'])) {
                                    this._editUIData.fieldValues['subtasks'] = [];
                                }

                                this._editUIData.fieldValues['subtasks'].push(picked);
                                this.postMessage({
                                    type: 'fieldValueUpdate',
                                    fieldValues: {
                                        subtasks: this._editUIData.fieldValues['subtasks'],
                                        nonce: msg.nonce,
                                    },
                                });
                            }

                            issueCreatedEvent(msg.site, resp.key).then((e) => {
                                Container.analyticsClient.sendTrackEvent(e);
                            });

                            commands.executeCommand(Commands.RefreshAssignedWorkItemsExplorer);
                            commands.executeCommand(Commands.RefreshCustomJqlExplorer);
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
                case 'createIssueLink': {
                    if (isCreateIssueLink(msg)) {
                        handled = true;
                        try {
                            const client = await Container.clientManager.jiraClient(msg.site);
                            const resp = await client.createIssueLink(this._issue.key, msg.issueLinkData);

                            this._editUIData.fieldValues['issuelinks'] = resp;

                            this.postMessage({
                                type: 'fieldValueUpdate',
                                fieldValues: {
                                    issuelinks: this._editUIData.fieldValues['issuelinks'],
                                    nonce: msg.nonce,
                                },
                            });

                            issueUpdatedEvent(
                                this._issue.siteDetails,
                                this._issue.key,
                                'issuelinks',
                                this.fieldNameForKey('issuelinks'),
                            ).then((e) => {
                                Container.analyticsClient.sendTrackEvent(e);
                            });

                            commands.executeCommand(Commands.RefreshAssignedWorkItemsExplorer);
                            commands.executeCommand(Commands.RefreshCustomJqlExplorer);
                        } catch (e) {
                            Logger.error(e, 'Error creating issue issue link');
                            this.postMessage({
                                type: 'error',
                                reason: this.formatErrorReason(e, 'Error creating issue issue link'),
                                nonce: msg.nonce,
                            });
                        }
                    }
                    break;
                }
                case 'deleteIssuelink': {
                    if (isDeleteByIDAction(msg)) {
                        handled = true;
                        try {
                            const client = await Container.clientManager.jiraClient(msg.site);

                            // We wish we could just call the delete issuelink endpoint, but it doesn't support OAuth 2.0
                            //await client.deleteIssuelink(msg.objectWithId.id);

                            if (
                                !this._editUIData.fieldValues['issuelinks'] ||
                                !Array.isArray(this._editUIData.fieldValues['issuelinks'])
                            ) {
                                this._editUIData.fieldValues['issuelinks'] = [];
                            }

                            this._editUIData.fieldValues['issuelinks'] = this._editUIData.fieldValues[
                                'issuelinks'
                            ].filter((link: any) => link.id !== msg.objectWithId.id);

                            await client.editIssue(this._issue.key, {
                                ['issuelinks']: this._editUIData.fieldValues['issuelinks'],
                            });

                            this.postMessage({
                                type: 'fieldValueUpdate',
                                fieldValues: {
                                    issuelinks: this._editUIData.fieldValues['issuelinks'],
                                    nonce: msg.nonce,
                                },
                            });

                            commands.executeCommand(Commands.RefreshAssignedWorkItemsExplorer);
                            commands.executeCommand(Commands.RefreshCustomJqlExplorer);

                            issueUpdatedEvent(
                                this._issue.siteDetails,
                                this._issue.key,
                                'issuelinks',
                                this.fieldNameForKey('issuelinks'),
                            ).then((e) => {
                                Container.analyticsClient.sendTrackEvent(e);
                            });
                        } catch (e) {
                            Logger.error(e, 'Error deleting issuelink');
                            this.postMessage({
                                type: 'error',
                                reason: this.formatErrorReason(e, 'Error deleting issuelink'),
                                nonce: msg.nonce,
                            });
                        }
                    }
                    break;
                }

                case 'createWorklog': {
                    if (isCreateWorklog(msg)) {
                        handled = true;
                        try {
                            const client = await Container.clientManager.jiraClient(msg.site);
                            const { adjustEstimate, newEstimate, ...worklogBody } = msg.worklogData as any;
                            let queryParams: any = { adjustEstimate };
                            if (adjustEstimate === 'new' && newEstimate) {
                                queryParams = { ...queryParams, newEstimate };
                            }
                            const resp = await client.addWorklog(msg.issueKey, worklogBody, queryParams);

                            if (!Array.isArray(this._editUIData.fieldValues['worklog']?.worklogs)) {
                                this._editUIData.fieldValues['worklog'] = { worklogs: [] };
                            }

                            this._editUIData.fieldValues['worklog'].worklogs.push(resp);
                            this.postMessage({
                                type: 'fieldValueUpdate',
                                fieldValues: { worklog: this._editUIData.fieldValues['worklog'], nonce: msg.nonce },
                            });
                            this.refreshIssueHistory();
                            issueUpdatedEvent(
                                this._issue.siteDetails,
                                this._issue.key,
                                'worklog',
                                this.fieldNameForKey('worklog'),
                            ).then((e) => {
                                Container.analyticsClient.sendTrackEvent(e);
                            });
                        } catch (e) {
                            Logger.error(e, 'Error creating worklog');
                            this.postMessage({
                                type: 'error',
                                reason: this.formatErrorReason(e, 'Error creating worklog'),
                                nonce: msg.nonce,
                            });
                        }
                    }
                    break;
                }

                case 'updateWorklog': {
                    if (isUpdateWorklog(msg)) {
                        handled = true;
                        try {
                            const client = await Container.clientManager.jiraClient(msg.site);
                            const { adjustEstimate, newEstimate, ...worklogBody } = msg.worklogData as any;
                            let queryParams: any = { adjustEstimate };
                            if (adjustEstimate === 'new' && newEstimate) {
                                queryParams = { ...queryParams, newEstimate };
                            }

                            const resp = await (client as any).putToJira(
                                `issue/${msg.issueKey}/worklog/${msg.worklogId}`,
                                worklogBody,
                                queryParams,
                            );

                            if (Array.isArray(this._editUIData.fieldValues['worklog']?.worklogs)) {
                                const worklogIndex = this._editUIData.fieldValues['worklog'].worklogs.findIndex(
                                    (w: any) => w.id === msg.worklogId,
                                );
                                if (worklogIndex !== -1) {
                                    this._editUIData.fieldValues['worklog'].worklogs[worklogIndex] = resp;
                                }
                            }

                            this.postMessage({
                                type: 'fieldValueUpdate',
                                fieldValues: { worklog: this._editUIData.fieldValues['worklog'], nonce: msg.nonce },
                            });
                            this.refreshIssueHistory();
                            issueUpdatedEvent(
                                this._issue.siteDetails,
                                this._issue.key,
                                'worklog',
                                this.fieldNameForKey('worklog'),
                            ).then((e) => {
                                Container.analyticsClient.sendTrackEvent(e);
                            });
                        } catch (e) {
                            Logger.error(e, 'Error updating worklog');
                            this.postMessage({
                                type: 'error',
                                reason: this.formatErrorReason(e, 'Error updating worklog'),
                                nonce: msg.nonce,
                            });
                        }
                    }
                    break;
                }

                case 'deleteWorklog': {
                    if (isDeleteWorklog(msg)) {
                        handled = true;
                        try {
                            const client = await Container.clientManager.jiraClient(msg.site);
                            const queryParams: any = {};
                            if (msg.adjustEstimate) {
                                queryParams.adjustEstimate = msg.adjustEstimate;
                                if (msg.adjustEstimate === 'new' && msg.newEstimate) {
                                    queryParams.newEstimate = msg.newEstimate;
                                }
                            }

                            await (client as any).deleteToJira(
                                `issue/${msg.issueKey}/worklog/${msg.worklogId}`,
                                queryParams,
                            );

                            if (Array.isArray(this._editUIData.fieldValues['worklog']?.worklogs)) {
                                this._editUIData.fieldValues['worklog'].worklogs = this._editUIData.fieldValues[
                                    'worklog'
                                ].worklogs.filter((w: any) => w.id !== msg.worklogId);
                            }

                            this.postMessage({
                                type: 'fieldValueUpdate',
                                fieldValues: { worklog: this._editUIData.fieldValues['worklog'], nonce: msg.nonce },
                            });
                            this.refreshIssueHistory();
                            issueUpdatedEvent(
                                this._issue.siteDetails,
                                this._issue.key,
                                'worklog',
                                this.fieldNameForKey('worklog'),
                            ).then((e) => {
                                Container.analyticsClient.sendTrackEvent(e);
                            });
                        } catch (e) {
                            Logger.error(e, 'Error deleting worklog');
                            this.postMessage({
                                type: 'error',
                                reason: this.formatErrorReason(e, 'Error deleting worklog'),
                                nonce: msg.nonce,
                            });
                        }
                    }
                    break;
                }
                case 'addWatcher': {
                    if (isUpdateWatcherAction(msg)) {
                        handled = true;
                        try {
                            const client = await Container.clientManager.jiraClient(msg.site);
                            await client.addWatcher(msg.issueKey, msg.watcher.accountId);

                            if (
                                !this._editUIData.fieldValues['watches'] ||
                                !this._editUIData.fieldValues['watches'].watchers ||
                                !Array.isArray(this._editUIData.fieldValues['watches'].watchers)
                            ) {
                                this._editUIData.fieldValues['watches'].watchers = [];
                            }

                            this._editUIData.fieldValues['watches'].watchers.push(msg.watcher);
                            this._editUIData.fieldValues['watches'].watchCount =
                                this._editUIData.fieldValues['watches'].watchers.length;
                            if (msg.watcher.accountId === this._currentUser.accountId) {
                                this._editUIData.fieldValues['watches'].isWatching = true;
                            }

                            this.postMessage({
                                type: 'fieldValueUpdate',
                                fieldValues: { watches: this._editUIData.fieldValues['watches'], nonce: msg.nonce },
                            });
                            issueUpdatedEvent(
                                this._issue.siteDetails,
                                this._issue.key,
                                'watches',
                                this.fieldNameForKey('watches'),
                            ).then((e) => {
                                Container.analyticsClient.sendTrackEvent(e);
                            });
                        } catch (e) {
                            Logger.error(e, 'Error adding watcher');
                            this.postMessage({
                                type: 'error',
                                reason: this.formatErrorReason(e, 'Error adding watcher'),
                                nonce: msg.nonce,
                            });
                        }
                    }
                    break;
                }
                case 'removeWatcher': {
                    if (isUpdateWatcherAction(msg)) {
                        handled = true;
                        try {
                            const client = await Container.clientManager.jiraClient(msg.site);
                            await client.removeWatcher(msg.issueKey, msg.watcher.accountId);
                            if (
                                !this._editUIData.fieldValues['watches'] ||
                                !this._editUIData.fieldValues['watches'].watchers ||
                                !Array.isArray(this._editUIData.fieldValues['watches'].watchers)
                            ) {
                                this._editUIData.fieldValues['watches'].watchers = [];
                            }
                            const foundIndex: number = this._editUIData.fieldValues['watches'].watchers.findIndex(
                                (user: User) => user.accountId === msg.watcher.accountId,
                            );
                            if (foundIndex > -1) {
                                this._editUIData.fieldValues['watches'].watchers.splice(foundIndex, 1);
                            }

                            if (msg.watcher.accountId === this._currentUser.accountId) {
                                this._editUIData.fieldValues['watches'].isWatching = false;
                            }

                            this._editUIData.fieldValues['watches'].watchCount =
                                this._editUIData.fieldValues['watches'].watchers.length;

                            this.postMessage({
                                type: 'fieldValueUpdate',
                                fieldValues: { watches: this._editUIData.fieldValues['watches'], nonce: msg.nonce },
                            });
                            issueUpdatedEvent(
                                this._issue.siteDetails,
                                this._issue.key,
                                'watches',
                                this.fieldNameForKey('watches'),
                            ).then((e) => {
                                Container.analyticsClient.sendTrackEvent(e);
                            });
                        } catch (e) {
                            Logger.error(e, 'Error removing watcher');
                            this.postMessage({
                                type: 'error',
                                reason: this.formatErrorReason(e, 'Error removing watcher'),
                                nonce: msg.nonce,
                            });
                        }
                    }
                    break;
                }
                case 'addVote': {
                    if (isUpdateVoteAction(msg)) {
                        handled = true;
                        try {
                            const client = await Container.clientManager.jiraClient(msg.site);
                            await client.addVote(msg.issueKey);

                            if (
                                !this._editUIData.fieldValues['votes'] ||
                                !this._editUIData.fieldValues['votes'].voters ||
                                !Array.isArray(this._editUIData.fieldValues['votes'].voters)
                            ) {
                                this._editUIData.fieldValues['votes'].voters = [];
                            }

                            const voterToAdd = this._currentUser.displayName ? this._currentUser : msg.voter;
                            this._editUIData.fieldValues['votes'].voters.push(voterToAdd);
                            this._editUIData.fieldValues['votes'].votes =
                                this._editUIData.fieldValues['votes'].voters.length;
                            this._editUIData.fieldValues['votes'].hasVoted = true;

                            this.postMessage({
                                type: 'fieldValueUpdate',
                                fieldValues: { votes: this._editUIData.fieldValues['votes'], nonce: msg.nonce },
                            });
                            issueUpdatedEvent(
                                this._issue.siteDetails,
                                this._issue.key,
                                'votes',
                                this.fieldNameForKey('votes'),
                            ).then((e) => {
                                Container.analyticsClient.sendTrackEvent(e);
                            });
                        } catch (e) {
                            Logger.error(e, 'Error adding vote');
                            this.postMessage({
                                type: 'error',
                                reason: this.formatErrorReason(e, 'Error adding vote'),
                                nonce: msg.nonce,
                            });
                        }
                    }
                    break;
                }
                case 'removeVote': {
                    if (isUpdateVoteAction(msg)) {
                        handled = true;
                        try {
                            const client = await Container.clientManager.jiraClient(msg.site);
                            await client.removeVote(msg.issueKey);
                            if (
                                !this._editUIData.fieldValues['votes'] ||
                                !this._editUIData.fieldValues['votes'].voters ||
                                !Array.isArray(this._editUIData.fieldValues['votes'].voters)
                            ) {
                                this._editUIData.fieldValues['votes'].voters = [];
                            }
                            const voterAccountId = this._currentUser.accountId || msg.voter.accountId;
                            const foundIndex: number = this._editUIData.fieldValues['votes'].voters.findIndex(
                                (user: User) => user.accountId === voterAccountId,
                            );
                            if (foundIndex > -1) {
                                this._editUIData.fieldValues['votes'].voters.splice(foundIndex, 1);
                            }

                            this._editUIData.fieldValues['votes'].hasVoted = false;
                            this._editUIData.fieldValues['votes'].votes =
                                this._editUIData.fieldValues['votes'].voters.length;

                            this.postMessage({
                                type: 'fieldValueUpdate',
                                fieldValues: { votes: this._editUIData.fieldValues['votes'], nonce: msg.nonce },
                            });
                            issueUpdatedEvent(
                                this._issue.siteDetails,
                                this._issue.key,
                                'votes',
                                this.fieldNameForKey('votes'),
                            ).then((e) => {
                                Container.analyticsClient.sendTrackEvent(e);
                            });
                        } catch (e) {
                            Logger.error(e, 'Error removing vote');
                            this.postMessage({
                                type: 'error',
                                reason: this.formatErrorReason(e, 'Error removing vote'),
                                nonce: msg.nonce,
                            });
                        }
                    }
                    break;
                }
                case 'addAttachments': {
                    if (isAddAttachmentsAction(msg)) {
                        handled = true;
                        try {
                            const formData = new FormData();
                            msg.files.forEach((file: any) => {
                                if (!file.fileContent) {
                                    throw new Error(`Unable to read the file '${file.name}'`);
                                }
                                formData.append('file', Buffer.from(decode(file.fileContent)), {
                                    filename: file.name,
                                    contentType: file.type,
                                });
                            });

                            const client = await Container.clientManager.jiraClient(msg.site);
                            const resp = await client.addAttachments(msg.issueKey, formData);

                            if (
                                !this._editUIData.fieldValues['attachment'] ||
                                !Array.isArray(this._editUIData.fieldValues['attachment'])
                            ) {
                                this._editUIData.fieldValues['attachment'] = [];
                            }

                            resp.forEach((attachment: any) => {
                                this._editUIData.fieldValues['attachment'].push(attachment);
                            });

                            this.postMessage({
                                type: 'fieldValueUpdate',
                                fieldValues: {
                                    attachment: this._editUIData.fieldValues['attachment'],
                                    nonce: msg.nonce,
                                },
                            });
                            issueUpdatedEvent(
                                this._issue.siteDetails,
                                this._issue.key,
                                'attachment',
                                this.fieldNameForKey('attachment'),
                            ).then((e) => {
                                Container.analyticsClient.sendTrackEvent(e);
                            });
                        } catch (e) {
                            Logger.error(e, 'Error adding attachments');
                            this.postMessage({
                                type: 'error',
                                reason: this.formatErrorReason(e, 'Error adding attachments'),
                                nonce: msg.nonce,
                            });
                        }
                    }
                    break;
                }
                case 'deleteAttachment': {
                    if (isDeleteByIDAction(msg)) {
                        handled = true;
                        try {
                            const client = await Container.clientManager.jiraClient(msg.site);
                            await client.deleteAttachment(msg.objectWithId.id);

                            if (
                                !this._editUIData.fieldValues['attachment'] ||
                                !Array.isArray(this._editUIData.fieldValues['attachment'])
                            ) {
                                this._editUIData.fieldValues['attachment'] = [];
                            }

                            this._editUIData.fieldValues['attachment'] = this._editUIData.fieldValues[
                                'attachment'
                            ].filter((file: any) => file.id !== msg.objectWithId.id);

                            this.postMessage({
                                type: 'fieldValueUpdate',
                                fieldValues: {
                                    attachment: this._editUIData.fieldValues['attachment'],
                                    nonce: msg.nonce,
                                },
                            });
                            issueUpdatedEvent(
                                this._issue.siteDetails,
                                this._issue.key,
                                'attachment',
                                this.fieldNameForKey('attachment'),
                            ).then((e) => {
                                Container.analyticsClient.sendTrackEvent(e);
                            });
                        } catch (e) {
                            Logger.error(e, 'Error deleting attachments');
                            this.postMessage({
                                type: 'error',
                                reason: this.formatErrorReason(e, 'Error deleting attachments'),
                                nonce: msg.nonce,
                            });
                        }
                    }
                    break;
                }
                case 'transitionIssue': {
                    if (isTransitionIssue(msg)) {
                        handled = true;
                        try {
                            // note, this will refresh the explorer
                            await transitionIssue(msg.issue, msg.transition, { source: 'jiraIssueWebview' });

                            this._editUIData.fieldValues['status'] = msg.transition.to;
                            // we need to force an update in case any new tranisitions are available
                            await this.forceUpdateIssue(true);
                        } catch (e) {
                            Logger.error(e, 'Error transitioning issue');
                            this.postMessage({
                                type: 'error',
                                reason: this.formatErrorReason(e, 'Error transitioning issue'),
                                nonce: msg.nonce,
                            });
                        }
                    }
                    break;
                }
                case 'refreshIssue': {
                    handled = true;
                    try {
                        await this.forceUpdateIssue(true);
                    } catch (e) {
                        Logger.error(e, 'Error refeshing issue');
                        this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Error refeshing issue') });
                    }
                    break;
                }
                case 'openStartWorkPage': {
                    if (isOpenStartWorkPageAction(msg)) {
                        handled = true;
                        startWorkOnIssue(this._issue);
                    }
                    break;
                }
                case 'cloneIssue': {
                    if (isCloneIssue(msg)) {
                        handled = true;
                        try {
                            window.showInformationMessage(
                                `Cloning ${this._issue.key}\n\nWhen cloning is complete, the cloned work item will be linked to ${this._issue.key} and you'll receive another pop-up here just like this one.`,
                                'OK',
                            );

                            const client = await Container.clientManager.jiraClient(this._issue.siteDetails);

                            const clonedIssueData = {
                                fields: {
                                    summary: msg.issueData.summary,
                                    project: { key: this._issue.key.split('-')[0] },
                                    issuetype: { name: 'Task' }, // Default to Task, could be made configurable
                                    assignee: msg.issueData.assignee
                                        ? { accountId: msg.issueData.assignee.accountId }
                                        : undefined,
                                    reporter: msg.issueData.reporter
                                        ? { accountId: msg.issueData.reporter.accountId }
                                        : undefined,
                                },
                            };

                            if (msg.issueData.cloneOptions?.includeDescription) {
                                try {
                                    const originalIssue = await client.getIssue(this._issue.key, ['description'], '');
                                    if (originalIssue.fields.description) {
                                        (clonedIssueData.fields as any).description = originalIssue.fields.description;
                                        Logger.info('Including description in cloned issue');
                                    }
                                } catch (e) {
                                    Logger.warn('Could not fetch description for cloning', e);
                                }
                            }

                            const resp = await client.createIssue(clonedIssueData);

                            // Create a link between the original and cloned issue
                            await client.createIssueLink(resp.key, {
                                type: { name: 'Cloners' },
                                inwardIssue: { key: this._issue.key },
                                outwardIssue: { key: resp.key },
                            });

                            // Handle linked issues if requested
                            if (msg.issueData.cloneOptions?.includeLinkedIssues) {
                                try {
                                    const originalIssue = await client.getIssue(this._issue.key, ['issuelinks'], '');
                                    if (originalIssue.fields.issuelinks && originalIssue.fields.issuelinks.length > 0) {
                                        Logger.info(`Cloning ${originalIssue.fields.issuelinks.length} linked issues`);

                                        for (const link of originalIssue.fields.issuelinks) {
                                            try {
                                                const linkedKey = link.outwardIssue
                                                    ? link.outwardIssue.key
                                                    : link.inwardIssue.key;

                                                await client.createIssueLink(resp.key, {
                                                    type: { name: link.type.name },
                                                    inwardIssue: { key: resp.key },
                                                    outwardIssue: { key: linkedKey },
                                                });
                                                Logger.info(`Cloned link to issue: ${linkedKey}`);
                                            } catch (linkError) {
                                                Logger.warn(
                                                    `Failed to clone link to issue ${link.outwardIssue?.key || link.inwardIssue?.key}:`,
                                                    linkError,
                                                );
                                            }
                                        }
                                    }
                                } catch (e) {
                                    Logger.warn('Could not clone linked issues', e);
                                }
                            }

                            // Handle child issues if requested
                            if (msg.issueData.cloneOptions?.includeChildIssues) {
                                try {
                                    const originalIssue = await client.getIssue(this._issue.key, ['subtasks'], '');
                                    if (originalIssue.fields.subtasks && originalIssue.fields.subtasks.length > 0) {
                                        Logger.info(`Cloning ${originalIssue.fields.subtasks.length} child issues`);

                                        for (const subtask of originalIssue.fields.subtasks) {
                                            try {
                                                const subtaskDetails = await client.getIssue(
                                                    subtask.key,
                                                    ['summary', 'description', 'assignee', 'reporter', 'issuetype'],
                                                    '',
                                                );

                                                const clonedSubtaskData = {
                                                    fields: {
                                                        summary: `CLONE - ${subtaskDetails.fields.summary}`,
                                                        project: { key: this._issue.key.split('-')[0] },
                                                        issuetype: { name: subtaskDetails.fields.issuetype.name },
                                                        parent: { key: resp.key }, // Set the cloned issue as parent
                                                        assignee: subtaskDetails.fields.assignee
                                                            ? { accountId: subtaskDetails.fields.assignee.accountId }
                                                            : undefined,
                                                        reporter: subtaskDetails.fields.reporter
                                                            ? { accountId: subtaskDetails.fields.reporter.accountId }
                                                            : undefined,
                                                        description: subtaskDetails.fields.description,
                                                    },
                                                };

                                                const clonedSubtask = await client.createIssue(clonedSubtaskData);
                                                Logger.info(
                                                    `Cloned child issue: ${subtask.key} -> ${clonedSubtask.key}`,
                                                );
                                            } catch (subtaskError) {
                                                Logger.warn(
                                                    `Failed to clone child issue ${subtask.key}:`,
                                                    subtaskError,
                                                );
                                            }
                                        }
                                    }
                                } catch (e) {
                                    Logger.warn('Could not clone child issues', e);
                                }
                            }

                            issueCreatedEvent(this._issue.siteDetails, resp.key).then((e) => {
                                Container.analyticsClient.sendTrackEvent(e);
                            });

                            commands.executeCommand(
                                Commands.RefreshAssignedWorkItemsExplorer,
                                OnJiraEditedRefreshDelay,
                            );
                            commands.executeCommand(Commands.RefreshCustomJqlExplorer, OnJiraEditedRefreshDelay);

                            // Show VS Code notification
                            window
                                .showInformationMessage(
                                    `Cloning complete! Issue ${resp.key} has been cloned from ${this._issue.key} and linked successfully.`,
                                    'Open Cloned Issue',
                                )
                                .then((selection: string | undefined) => {
                                    if (selection === 'Open Cloned Issue') {
                                        showIssue({ key: resp.key, siteDetails: this._issue.siteDetails });
                                    }
                                });

                            this.postMessage({
                                type: 'fieldValueUpdate',
                                fieldValues: { loadingField: '' },
                                nonce: msg.nonce,
                            });
                        } catch (e) {
                            Logger.error(e, 'Error cloning issue');
                            this.postMessage({
                                type: 'error',
                                reason: 'Error cloning issue',
                                nonce: msg.nonce,
                            });
                        }
                    }
                    break;
                }
                case 'setRovoDevPromptText': {
                    Container.rovodevWebviewProvider.setPromptTextWithFocus((msg as any).text);
                    break;
                }
                case 'openPullRequest': {
                    if (isOpenPullRequest(msg)) {
                        handled = true;
                        // TODO: [VSCODE-606] abstract madness for calling Commands.BitbucketShowPullRequestDetails into a reusable function
                        const pr = (await Container.bitbucketContext.recentPullrequestsForAllRepos()).find(
                            (p) => p.data.url === msg.prHref,
                        );
                        if (pr) {
                            const bbApi = await clientForSite(pr.site);
                            commands.executeCommand(
                                Commands.BitbucketShowPullRequestDetails,
                                await bbApi.pullrequests.get(pr.site, pr.data.id, pr.workspaceRepo),
                            );
                        } else {
                            Logger.error(
                                new Error(`error opening pullrequest: ${msg.prHref}`),
                                'Error opening pullrequest',
                            );
                            this.postMessage({
                                type: 'error',
                                reason: this.formatErrorReason(`Error opening pullrequest: ${msg.prHref}`),
                                nonce: msg.nonce,
                            });
                        }
                    }
                    break;
                }
                case 'getImage': {
                    if (isGetImage(msg)) {
                        handled = true;
                        try {
                            const baseApiUrl = new URL(
                                this._issue.siteDetails.baseApiUrl.slice(
                                    0,
                                    this._issue.siteDetails.baseApiUrl.lastIndexOf('/rest'),
                                ),
                            );
                            // Prefix base URL for a relative URL
                            const href = msg.url.startsWith('/')
                                ? new URL(baseApiUrl.href + msg.url)
                                : new URL(msg.url);
                            // Skip fetching external images (that do not belong to the site)
                            if (href.hostname !== baseApiUrl.hostname) {
                                this.postMessage({
                                    type: 'getImageDone',
                                    imgData: '',
                                    nonce: msg.nonce,
                                });
                            }

                            const url = href.toString();

                            const client = await Container.clientManager.jiraClient(this._issue.siteDetails);
                            const response = await client.transportFactory().get(url, {
                                method: 'GET',
                                headers: {
                                    Authorization: await client.authorizationProvider('GET', url),
                                },
                                responseType: 'arraybuffer',
                            });
                            const imgData = Buffer.from(response.data, 'binary').toString('base64');
                            this.postMessage({
                                type: 'getImageDone',
                                imgData: imgData,
                                nonce: msg.nonce,
                            });
                        } catch (e) {
                            Logger.error(e, `Error fetching image: ${msg.url}`);
                            this.postMessage({
                                type: 'getImageDone',
                                imgData: '',
                                nonce: msg.nonce,
                            });
                        }
                    }
                    break;
                }
                case 'fetchIssueHistory': {
                    handled = true;
                    try {
                        await this.refreshIssueHistory();
                    } catch (e) {
                        Logger.error(e, 'Error fetching issue history');
                        this.postMessage({
                            type: 'historyUpdate',
                            history: [],
                        });
                    }
                    break;
                }
                case 'handleEditorFocus': {
                    if (isHandleEditorFocus(msg)) {
                        handled = true;
                        Container.setIsEditorFocused(msg.isFocused);
                    }
                    break;
                }
            }
        }

        return handled;
    }

    private async fetchFullHierarchy() {
        if (!this._issue.parentKey) {
            return;
        }

        const hierarchy = [this._issue];

        this.postMessage({ type: 'hierarchyLoading', hierarchy });

        try {
            let currentParentKey: string | undefined = this._issue.parentKey;
            while (currentParentKey) {
                const parent = await fetchMinimalIssue(currentParentKey, this._issue.siteDetails);
                hierarchy.unshift(parent);
                currentParentKey = parent.parentKey;
            }
        } catch (e) {
            Logger.error(e, 'Error fetching issue hierarchy');
        } finally {
            this.postMessage({ type: 'hierarchyUpdate', hierarchy });
        }

        return hierarchy;
    }

    private async refreshIssueHistory() {
        try {
            const client = await Container.clientManager.jiraClient(this._issue.siteDetails);
            const apiVersion = client.apiVersion || '2';
            const baseApiUrl = this._issue.siteDetails.baseApiUrl.replace(/\/rest$/, '');
            const historyUrl = `${baseApiUrl}/rest/api/${apiVersion}/issue/${this._issue.key}?expand=changelog`;

            const [historyResponse, worklogResponse] = await Promise.all([
                client.transportFactory().get(historyUrl, {
                    method: 'GET',
                    headers: {
                        Authorization: await client.authorizationProvider('GET', historyUrl),
                    },
                }),
                client
                    .transportFactory()
                    .get(`${baseApiUrl}/rest/api/${apiVersion}/issue/${this._issue.key}/worklog`, {
                        method: 'GET',
                        headers: {
                            Authorization: await client.authorizationProvider(
                                'GET',
                                `${baseApiUrl}/rest/api/${apiVersion}/issue/${this._issue.key}/worklog`,
                            ),
                        },
                    })
                    .catch((e) => {
                        Logger.warn(e, 'Error fetching worklogs for history');
                        return { data: { worklogs: [] } };
                    }),
            ]);

            const historyItems: any[] = [];
            const changelog = historyResponse.data.changelog;
            const issueData = historyResponse.data;
            const worklogs = worklogResponse.data.worklogs || [];

            // Add the "Work item created" event
            if (issueData.fields?.created && issueData.fields?.reporter) {
                const reporter = issueData.fields.reporter;
                historyItems.push({
                    id: '__CREATED__',
                    timestamp: issueData.fields.created,
                    author: {
                        displayName: reporter.displayName || reporter.name,
                        accountId: reporter.accountId,
                        avatarUrl: reporter.avatarUrls?.['48x48'] || reporter.avatarUrls?.['32x32'],
                    },
                    field: '__CREATED__',
                    fieldDisplayName: '__CREATED__',
                    from: null,
                    to: null,
                    fromString: undefined,
                    toString: undefined,
                });
            }

            if (changelog && changelog.histories) {
                changelog.histories.forEach((history: any) => {
                    history.items.forEach((item: any) => {
                        let fieldKey = item.fieldId || item.field;
                        if (fieldKey && fieldKey.toLowerCase() === 'worklogid') {
                            return;
                        }
                        if (fieldKey) {
                            const lowerFieldKey = fieldKey.toLowerCase();
                            if (lowerFieldKey === 'assignee' || item.field?.toLowerCase() === 'assignee') {
                                fieldKey = 'assignee';
                            }
                        }
                        const fieldDisplayName = this.fieldNameForKey(fieldKey) || item.field || fieldKey;
                        const fromValue =
                            item.fromString ||
                            (typeof item.from === 'string'
                                ? item.from
                                : item.from?.displayName || item.from?.name || null);
                        const toValue =
                            item.toString ||
                            (typeof item.to === 'string' ? item.to : item.to?.displayName || item.to?.name || null);
                        historyItems.push({
                            id: `${history.id}-${fieldKey}`,
                            timestamp: history.created,
                            author: {
                                displayName: history.author.displayName || history.author.name,
                                accountId: history.author.accountId,
                                avatarUrl: history.author.avatarUrls?.['48x48'] || history.author.avatarUrls?.['32x32'],
                            },
                            field: fieldKey,
                            fieldDisplayName: fieldDisplayName,
                            from: fromValue,
                            to: toValue,
                            fromString: item.fromString,
                            toString: item.toString,
                        });
                    });
                });
            }

            worklogs.forEach((worklog: any) => {
                if (worklog.started) {
                    historyItems.push({
                        id: `worklog-${worklog.id}`,
                        timestamp: worklog.started,
                        author: {
                            displayName: worklog.author?.displayName || worklog.author?.name || 'Unknown',
                            accountId: worklog.author?.accountId,
                            avatarUrl: worklog.author?.avatarUrls?.['48x48'] || worklog.author?.avatarUrls?.['32x32'],
                        },
                        field: 'worklog',
                        fieldDisplayName: 'Work Log',
                        from: null,
                        to: worklog.timeSpent,
                        fromString: undefined,
                        toString: worklog.comment || '',
                        worklogComment: worklog.comment,
                        worklogTimeSpent: worklog.timeSpent,
                    });
                }
            });

            historyItems.sort((a, b) => {
                if (a.id === '__CREATED__') {
                    return 1;
                }
                if (b.id === '__CREATED__') {
                    return -1;
                }
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            });

            this.postMessage({
                type: 'historyUpdate',
                history: historyItems,
            });
        } catch (e) {
            Logger.error(e, 'Error refreshing issue history');
            this.postMessage({
                type: 'historyUpdate',
                history: [],
            });
        }
    }

    private async recentPullRequests(): Promise<PullRequestData[]> {
        if (!Container.bitbucketContext) {
            return [];
        }

        const prs = await Container.bitbucketContext.recentPullrequestsForAllRepos();
        const relatedPrs = await Promise.all(
            prs.map(async (pr) => {
                const issueKeys = [...parseJiraIssueKeys(pr.data.title), ...parseJiraIssueKeys(pr.data.rawSummary)];
                return issueKeys.find((key) => key.toLowerCase() === this._issue.key.toLowerCase()) !== undefined
                    ? pr
                    : undefined;
            }),
        );

        return relatedPrs.filter((pr) => pr !== undefined).map((p) => p!.data);
    }

    public handleContextMenuCommand?({ data }: ContextMenuCommandData): void {
        this.postMessage({ type: 'copyImage', data });
    }
}
