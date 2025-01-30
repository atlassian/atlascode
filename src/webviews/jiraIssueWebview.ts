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
import FormData from 'form-data';
import * as fs from 'fs';
import { commands, env } from 'vscode';
import { issueCreatedEvent, issueUpdatedEvent, issueUrlCopiedEvent } from '../analytics';
import { DetailedSiteInfo, emptySiteInfo, Product, ProductJira } from '../atlclients/authInfo';
import { clientForSite } from '../bitbucket/bbUtils';
import { PullRequestData } from '../bitbucket/model';
import { Commands } from '../commands';
import { postComment } from '../commands/jira/postComment';
import { startWorkOnIssue } from '../commands/jira/startWorkOnIssue';
import { Container } from '../container';
import {
    EditIssueAction,
    isAddAttachmentsAction,
    isCreateIssue,
    isCreateIssueLink,
    isCreateWorklog,
    isDeleteByIDAction,
    isGetImage,
    isIssueComment,
    isIssueDeleteComment,
    isOpenStartWorkPageAction,
    isTransitionIssue,
    isUpdateVoteAction,
    isUpdateWatcherAction,
} from '../ipc/issueActions';
import { EditIssueData, emptyEditIssueData } from '../ipc/issueMessaging';
import { Action, onlineStatus } from '../ipc/messaging';
import { isOpenPullRequest } from '../ipc/prActions';
import { fetchEditIssueUI, fetchMinimalIssue } from '../jira/fetchIssue';
import { parseJiraIssueKeys } from '../jira/issueKeyParser';
import { transitionIssue } from '../jira/transitionIssue';
import { Logger } from '../logger';
import { iconSet, Resources } from '../resources';
import { AbstractIssueEditorWebview } from './abstractIssueEditorWebview';
import { InitializingWebview } from './abstractWebview';

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

    setIconPath() {
        this._panel!.iconPath = Resources.icons.get(iconSet.JIRAICON);
    }

    async initialize(issue: MinimalIssue<DetailedSiteInfo>) {
        this._issue = issue;

        if (!Container.onlineDetector.isOnline()) {
            this.postMessage(onlineStatus(false));
            return;
        }
        this.invalidate();
    }

    async invalidate() {
        if (Container.onlineDetector.isOnline()) {
            await this.forceUpdateIssue();
        } else {
            this.postMessage(onlineStatus(false));
        }

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

    private async forceUpdateIssue(refetchMinimalIssue: boolean = false) {
        if (this.isRefeshing) {
            return;
        }
        this.isRefeshing = true;
        try {
            if (refetchMinimalIssue) {
                this._issue = await fetchMinimalIssue(this._issue.key, this._issue.siteDetails);
            }
            const editUI: EditIssueUI<DetailedSiteInfo> = await fetchEditIssueUI(this._issue);

            if (this._panel) {
                this._panel.title = `${this._issue.key}`;
            }

            // const currentBranches = Container.bitbucketContext ?
            //     Container.bitbucketContext.getAllRepositores()
            //         .filter(repo => repo.state.HEAD && repo.state.HEAD.name)
            //         .map(repo => repo.state.HEAD!.name!)
            //     : [];

            this._editUIData = editUI as EditIssueData;

            // msg.workInProgress = this._issue.assignee.accountId === this._currentUserId &&
            //     issue.transitions.find(t => t.isInitial && t.to.id === issue.status.id) === undefined &&
            //     currentBranches.find(b => b.toLowerCase().indexOf(issue.key.toLowerCase()) !== -1) !== undefined;

            this._editUIData.recentPullRequests = [];
            this._editUIData.currentUser = emptyUser;

            let msg = this._editUIData;

            msg.type = 'update';

            this.postMessage(msg);

            // call async-able update functions here
            this.updateEpicChildren();
            this.updateCurrentUser();
            this.updateWatchers();
            this.updateVoters();
            this.updateRelatedPullRequests();
        } catch (e) {
            let err = new Error(`error updating issue: ${e}`);
            Logger.error(err);
            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
        } finally {
            this.isRefeshing = false;
        }
    }

    async updateEpicChildren() {
        if (this._issue.isEpic) {
            const site = this._issue.siteDetails;
            const client = await Container.clientManager.jiraClient(site);
            const fields = await Container.jiraSettingsManager.getMinimalIssueFieldIdsForSite(site);
            const epicInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(site);
            const res = await client.searchForIssuesUsingJqlGet(
                `${epicInfo.epicLink.id} = "${this._issue.key}" order by lastViewed DESC`,
                fields,
            );
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

        let optionMessage = {
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

    protected async onMessageReceived(msg: Action): Promise<boolean> {
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
                        await client.editIssue(this._issue!.key, newFieldValues);
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

                        commands.executeCommand(Commands.RefreshJiraExplorer);
                    } catch (e) {
                        Logger.error(new Error(`error updating issue: ${e}`));
                        this.postMessage({
                            type: 'error',
                            reason: this.formatErrorReason(e, 'Error updating issue'),
                            fieldValues: this.getFieldValuesForKeys(Object.keys(newFieldValues)),
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
                            Logger.error(new Error(`error posting comment: ${e}`));
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
                            Logger.error(new Error(`error deleting comment: ${e}`));
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
                            let client = await Container.clientManager.jiraClient(msg.site);
                            const resp = await client.createIssue(msg.issueData);

                            const createdIssue = await client.getIssue(resp.key, IssueLinkIssueKeys, '');
                            const picked = readIssueLinkIssue(createdIssue, msg.site);

                            if (!Array.isArray(this._editUIData.fieldValues['subtasks'])) {
                                this._editUIData.fieldValues['subtasks'] = [];
                            }

                            this._editUIData.fieldValues['subtasks'].push(picked);
                            this.postMessage({
                                type: 'fieldValueUpdate',
                                fieldValues: { subtasks: this._editUIData.fieldValues['subtasks'], nonce: msg.nonce },
                            });
                            issueCreatedEvent(msg.site, resp.key).then((e) => {
                                Container.analyticsClient.sendTrackEvent(e);
                            });
                            commands.executeCommand(Commands.RefreshJiraExplorer);
                        } catch (e) {
                            Logger.error(new Error(`error creating issue: ${e}`));
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
                            let client = await Container.clientManager.jiraClient(msg.site);
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
                            commands.executeCommand(Commands.RefreshJiraExplorer);
                        } catch (e) {
                            Logger.error(new Error(`error creating issue link: ${e}`));
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
                            let client = await Container.clientManager.jiraClient(msg.site);

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
                            commands.executeCommand(Commands.RefreshJiraExplorer);
                            issueUpdatedEvent(
                                this._issue.siteDetails,
                                this._issue.key,
                                'issuelinks',
                                this.fieldNameForKey('issuelinks'),
                            ).then((e) => {
                                Container.analyticsClient.sendTrackEvent(e);
                            });
                        } catch (e) {
                            Logger.error(new Error(`error deleting issuelink: ${e}`));
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
                            let client = await Container.clientManager.jiraClient(msg.site);
                            let queryParams: any = { adjustEstimate: msg.worklogData.adjustEstimate };
                            delete msg.worklogData.adjustEstimate;
                            if (queryParams.adjustEstimate === 'new') {
                                queryParams = { ...queryParams, newEstimate: msg.worklogData.newEstimate };
                                delete msg.worklogData.newEstimate;
                            }
                            const resp = await client.addWorklog(msg.issueKey, msg.worklogData, queryParams);

                            if (!Array.isArray(this._editUIData.fieldValues['worklog']?.worklogs)) {
                                this._editUIData.fieldValues['worklog'] = { worklogs: [] };
                            }

                            this._editUIData.fieldValues['worklog'].worklogs.push(resp);
                            this.postMessage({
                                type: 'fieldValueUpdate',
                                fieldValues: { worklog: this._editUIData.fieldValues['worklog'], nonce: msg.nonce },
                            });
                            issueUpdatedEvent(
                                this._issue.siteDetails,
                                this._issue.key,
                                'worklog',
                                this.fieldNameForKey('worklog'),
                            ).then((e) => {
                                Container.analyticsClient.sendTrackEvent(e);
                            });
                        } catch (e) {
                            Logger.error(new Error(`error creating worklog: ${e}`));
                            this.postMessage({
                                type: 'error',
                                reason: this.formatErrorReason(e, 'Error creating worklog'),
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
                            let client = await Container.clientManager.jiraClient(msg.site);
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
                            Logger.error(new Error(`error adding watcher: ${e}`));
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
                            let client = await Container.clientManager.jiraClient(msg.site);
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
                            Logger.error(new Error(`error removing watcher: ${e}`));
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
                            let client = await Container.clientManager.jiraClient(msg.site);
                            await client.addVote(msg.issueKey);

                            if (
                                !this._editUIData.fieldValues['votes'] ||
                                !this._editUIData.fieldValues['votes'].voters ||
                                !Array.isArray(this._editUIData.fieldValues['votes'].voters)
                            ) {
                                this._editUIData.fieldValues['votes'].voters = [];
                            }

                            this._editUIData.fieldValues['votes'].voters.push(msg.voter);
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
                            Logger.error(new Error(`error adding vote: ${e}`));
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
                            let client = await Container.clientManager.jiraClient(msg.site);
                            await client.removeVote(msg.issueKey);
                            if (
                                !this._editUIData.fieldValues['votes'] ||
                                !this._editUIData.fieldValues['votes'].voters ||
                                !Array.isArray(this._editUIData.fieldValues['votes'].voters)
                            ) {
                                this._editUIData.fieldValues['votes'].voters = [];
                            }
                            const foundIndex: number = this._editUIData.fieldValues['votes'].voters.findIndex(
                                (user: User) => user.accountId === msg.voter.accountId,
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
                            Logger.error(new Error(`error removing vote: ${e}`));
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
                            let client = await Container.clientManager.jiraClient(msg.site);

                            let formData = new FormData();
                            msg.files.forEach((file: any) => {
                                formData.append('file', fs.createReadStream(file.path), {
                                    filename: file.name,
                                    contentType: file.type,
                                });
                            });

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
                            Logger.error(new Error(`error adding attachments: ${e}`));
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
                            let client = await Container.clientManager.jiraClient(msg.site);
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
                            Logger.error(new Error(`error deleting attachments: ${e}`));
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
                            await transitionIssue(msg.issue, msg.transition);

                            this._editUIData.fieldValues['status'] = msg.transition.to;
                            // we need to force an update in case any new tranisitions are available
                            await this.forceUpdateIssue(true);
                        } catch (e) {
                            Logger.error(new Error(`error transitioning issue: ${e}`));
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
                        Logger.error(new Error(`error refreshing issue: ${e}`));
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
                            Logger.error(new Error(`error opening pullrequest: ${msg.prHref}`));
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
                            const href = msg.url.startsWith('/secure/attachment')
                                ? new URL(baseApiUrl + msg.url)
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
                            Logger.error(new Error(`error fetching image: ${msg.url}`));
                            this.postMessage({
                                type: 'getImageDone',
                                imgData: '',
                                nonce: msg.nonce,
                            });
                        }
                    }
                    break;
                }
            }
        }

        return handled;
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
}
