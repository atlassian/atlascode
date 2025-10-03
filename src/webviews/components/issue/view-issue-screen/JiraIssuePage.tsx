import Page, { Grid, GridColumn } from '@atlaskit/page';
import Tooltip from '@atlaskit/tooltip';
import WidthDetector from '@atlaskit/width-detector';
import { CommentVisibility, IssueType, MinimalIssue, Transition } from '@atlassianlabs/jira-pi-common-models';
import { FieldUI, InputFieldUI, SelectFieldUI, UIType, ValueType } from '@atlassianlabs/jira-pi-meta-models';
import { Box } from '@mui/material';
import { formatDistanceToNow, parseISO } from 'date-fns';
import * as React from 'react';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { v4 } from 'uuid';

import { AnalyticsView } from '../../../../analyticsTypes';
import { EditIssueAction, IssueCommentAction } from '../../../../ipc/issueActions';
import { EditIssueData, emptyEditIssueData, isIssueCreated } from '../../../../ipc/issueMessaging';
import { LegacyPMFData } from '../../../../ipc/messaging';
import { AtlascodeErrorBoundary } from '../../../../react/atlascode/common/ErrorBoundary';
import { readFilesContentAsync } from '../../../../util/files';
import { ConnectionTimeout } from '../../../../util/time';
import { AtlLoader } from '../../AtlLoader';
import ErrorBanner from '../../ErrorBanner';
import Offline from '../../Offline';
import PMFBBanner from '../../pmfBanner';
import {
    AbstractIssueEditorPage,
    CommonEditorPageAccept,
    CommonEditorPageEmit,
    CommonEditorViewState,
    emptyCommonEditorState,
    MentionInfo,
} from '../AbstractIssueEditorPage';
import { AtlascodeMentionProvider } from '../common/AtlaskitEditor/AtlascodeMentionsProvider';
import NavItem from '../NavItem';
import PullRequests from '../PullRequests';
import { EditorStateProvider } from './EditorStateContext';
import { IssueCommentComponent } from './mainpanel/IssueCommentComponent';
import IssueMainPanel from './mainpanel/IssueMainPanel';
import { IssueSidebarButtonGroup } from './sidebar/IssueSidebarButtonGroup';
import { IssueSidebarCollapsible, SidebarItem } from './sidebar/IssueSidebarCollapsible';

type Emit = CommonEditorPageEmit | EditIssueAction | IssueCommentAction;
type Accept = CommonEditorPageAccept | EditIssueData;

export interface ViewState extends CommonEditorViewState, EditIssueData {
    showMore: boolean;
    currentInlineDialog: string;
    commentText: string;
    isEditingComment: boolean;
    hierarchyLoading: boolean;
    hierarchy: MinimalIssue<DetailedSiteInfo>[];
    containerWidth?: number;
}

const emptyState: ViewState = {
    ...emptyCommonEditorState,
    ...emptyEditIssueData,
    showMore: false,
    currentInlineDialog: '',
    commentText: '',
    isEditingComment: false,
    hierarchyLoading: false,
    hierarchy: [],
};

export default class JiraIssuePage extends AbstractIssueEditorPage<Emit, Accept, {}, ViewState> {
    private advancedSidebarFields: FieldUI[] = [];
    private advancedMainFields: FieldUI[] = [];
    private attachingInProgress = false;
    private mentionProvider: AtlascodeMentionProvider;

    constructor(props: any) {
        super(props);
        this.state = emptyState;
        this.mentionProvider = this.getMentionProvider();
    }

    // TODO: proper error handling in webviews :'(
    // This is a temporary workaround to hopefully troubleshoot
    // https://github.com/atlassian/atlascode/issues/46
    override getInputMarkup(field: FieldUI, editmode?: boolean, currentIssueType?: IssueType, context?: String) {
        if (!field) {
            console.warn(`Field error - no field when trying to render ${context}`);
            return null;
        }
        return super.getInputMarkup(field, editmode, currentIssueType);
    }

    getProjectKey = (): string => {
        return this.state.key.substring(0, this.state.key.indexOf('-'));
    };

    protected override getApiVersion(): string {
        return String(this.state.apiVersion);
    }

    override onMessageReceived(e: any): boolean {
        const handled = super.onMessageReceived(e);

        if (!handled) {
            switch (e.type) {
                case 'update': {
                    const issueData = e as EditIssueData;
                    this.updateInternals(issueData);
                    this.setState({
                        ...issueData,
                        ...{
                            isErrorBannerOpen: false,
                            errorDetails: undefined,
                            isSomethingLoading: false,
                            loadingField: '',
                        },
                    });
                    break;
                }

                case 'epicChildrenUpdate': {
                    this.setState({ isSomethingLoading: false, loadingField: '', epicChildren: e.epicChildren });
                    break;
                }
                case 'pullRequestUpdate': {
                    this.setState({ recentPullRequests: e.recentPullRequests });
                    break;
                }
                case 'currentUserUpdate': {
                    this.setState({ currentUser: e.currentUser });
                    break;
                }
                case 'issueCreated': {
                    if (isIssueCreated(e)) {
                        this.setState({ isSomethingLoading: false, loadingField: '' });
                    }
                    break;
                }
                case 'hierarchyUpdate': {
                    this.setState({ hierarchy: e.hierarchy, hierarchyLoading: false });
                    break;
                }
                case 'hierarchyLoading': {
                    this.setState({ hierarchy: e.hierarchy, hierarchyLoading: true });
                    break;
                }
            }
        }
        return handled;
    }

    updateInternals(data: EditIssueData) {
        const orderedValues: FieldUI[] = this.sortFieldValues(data.fields);
        this.advancedMainFields = [];
        this.advancedSidebarFields = [];

        orderedValues.forEach((field) => {
            if (field.advanced) {
                if (field.uiType === UIType.Input && (field as InputFieldUI).isMultiline) {
                    this.advancedMainFields.push(field);
                } else {
                    this.advancedSidebarFields.push(field);
                }
            }
        });
    }

    handleCopyIssueLink = () => {
        this.postMessage({
            action: 'copyJiraIssueLink',
        });
    };

    handleStartWorkOnIssue = () => {
        this.postMessage({
            action: 'openStartWorkPage',
            issue: { key: this.state.key, siteDetails: this.state.siteDetails },
        });
    };

    fetchAndTransformUsers = async (input: string, accountId?: string): Promise<MentionInfo[]> =>
        (await this.fetchUsers(input, accountId)).map((user) => {
            return {
                displayName: user.displayName,
                avatarUrl: user.avatarUrls?.['48x48'],
                mention: this.state.siteDetails.isCloud ? `[~accountid:${user.accountId}]` : `[~${user.name}]`,
                accountId: user.accountId,
            };
        });

    protected override handleInlineEdit = async (field: FieldUI, newValue: any) => {
        switch (field.uiType) {
            case UIType.Subtasks: {
                this.setState({ isSomethingLoading: true, loadingField: field.key });
                const payload: any = newValue;
                payload.project = { key: this.getProjectKey() };
                if (this.state.siteDetails.isCloud) {
                    payload.parent = { key: this.state.key }; // Cloud instances have parent-child relationships for epics and non-epics
                } else {
                    if (this.state.isEpic) {
                        payload[this.state.epicFieldInfo.epicLink.id] = this.state.key; // Epic children
                    } else {
                        payload.parent = { key: this.state.key }; // Regular subtasks
                    }
                }
                this.postMessage({
                    action: 'createIssue',
                    site: this.state.siteDetails,
                    issueData: { fields: payload },
                });

                break;
            }
            case UIType.IssueLinks: {
                this.setState({ isSomethingLoading: true, loadingField: 'issuelinks' });

                this.postMessage({
                    action: 'createIssueLink',
                    site: this.state.siteDetails,
                    issueLinkData: {
                        type: {
                            id: newValue.type.id,
                        },
                        inwardIssue:
                            newValue.type.type === 'inward' ? { key: newValue.issueKey } : { key: this.state.key },
                        outwardIssue:
                            newValue.type.type === 'outward' ? { key: newValue.issueKey } : { key: this.state.key },
                    },
                    issueLinkType: newValue.type,
                });
                break;
            }
            case UIType.Timetracking: {
                let newValObject = this.state.fieldValues[field.key];
                if (newValObject) {
                    newValObject.originalEstimate = newValue;
                } else {
                    newValObject = {
                        originalEstimate: newValue,
                    };
                }
                this.setState({
                    loadingField: field.key,
                    isSomethingLoading: true,
                    fieldValues: { ...this.state.fieldValues, ...{ [field.key]: newValObject } },
                });
                await this.handleEditIssue(`${field.key}`, { originalEstimate: newValue });
                break;
            }
            case UIType.Worklog: {
                this.setState({ isSomethingLoading: true, loadingField: field.key });
                this.postMessage({
                    action: 'createWorklog',
                    site: this.state.siteDetails,
                    worklogData: newValue,
                    issueKey: this.state.key,
                });
                break;
            }

            case UIType.IssueLink: {
                let newValueParent = newValue;
                let completeParentData = null;
                if (newValue && newValue.id) {
                    completeParentData = {
                        ...this.state.fieldValues.parent,
                        key: newValue.key,
                        summary: newValue.summaryText || newValue.summary,
                        issuetype: {
                            ...this.state.fieldValues.parent?.issuetype,
                            iconUrl: newValue.img,
                        },
                    };
                    newValueParent = {
                        ...newValue,
                        id: newValue.id.toString(),
                    };
                } else if (newValue === undefined) {
                    newValueParent = null;
                }
                await this.handleEditIssue(field.key, newValueParent);
                this.setState({
                    fieldValues: {
                        ...this.state.fieldValues,
                        parent: completeParentData,
                    },
                }); // Added this because iconUrl would reset for some reason but the rest of the data stayed like 'key'
                break;
            }

            default: {
                let typedVal = newValue;

                if (typedVal && field.valueType === ValueType.Number && typeof newValue !== 'number') {
                    typedVal = parseFloat(newValue);
                }
                //NOTE: we need to update the state here so if there's an error we will detect the change and re-render with the old value
                this.setState({
                    loadingField: field.key,
                    fieldValues: { ...this.state.fieldValues, ...{ [field.key]: typedVal } },
                });
                if (typedVal === undefined) {
                    typedVal = null;
                }
                await this.handleEditIssue(field.key, typedVal);
                break;
            }
        }
    };

    handleEditIssue = async (fieldKey: string, newValue: any) => {
        this.setState({ isSomethingLoading: true, loadingField: fieldKey });
        const nonce = v4();
        await this.postMessageWithEventPromise(
            {
                action: 'editIssue',
                fields: {
                    [fieldKey]: newValue,
                },
                nonce: nonce,
            },
            'editIssueDone',
            ConnectionTimeout,
            nonce,
        );
    };

    handleChildIssueUpdate = async (issueKey: string, fieldKey: string, newValue: any) => {
        const nonce = v4();

        const payload =
            fieldKey === 'status'
                ? {
                      action: 'transitionChildIssue' as const,
                      issueKey: issueKey,
                      statusName: newValue,
                      nonce: nonce,
                  }
                : {
                      action: 'editChildIssue' as const,
                      issueKey: issueKey,
                      fields: {
                          [fieldKey]: newValue,
                      },
                      nonce: nonce,
                  };

        await this.postMessageWithEventPromise(payload, 'editIssueDone', ConnectionTimeout, nonce);
    };

    protected override handleCreateComment = (commentBody: string, restriction?: CommentVisibility) => {
        this.setState({ isSomethingLoading: true, loadingField: 'comment', commentText: '', isEditingComment: false });
        const commentAction: IssueCommentAction = {
            action: 'comment',
            issue: { key: this.state.key, siteDetails: this.state.siteDetails },
            commentBody: commentBody,
            restriction: restriction,
        };

        this.postMessage(commentAction);
    };

    private handleCommentTextChange = (text: string) => {
        this.setState({ commentText: text });
    };

    private handleCommentEditingChange = (editing: boolean) => {
        this.setState({ isEditingComment: editing });
    };

    protected handleUpdateComment = (commentBody: string, commentId: string, restriction?: CommentVisibility) => {
        const commentAction: IssueCommentAction = {
            action: 'comment',
            issue: { key: this.state.key, siteDetails: this.state.siteDetails },
            commentBody: commentBody,
            commentId: commentId,
            restriction: restriction,
        };

        this.postMessage(commentAction);
    };

    handleDeleteComment = (commentId: string) => {
        this.postMessage({
            action: 'deleteComment',
            issue: { key: this.state.key, siteDetails: this.state.siteDetails },
            commentId: commentId,
        });
    };

    handleStatusChange = (transition: Transition) => {
        this.setState({ isSomethingLoading: true, loadingField: 'status' });
        this.postMessage({
            action: 'transitionIssue',
            transition: transition,
            issue: { key: this.state.key, siteDetails: this.state.siteDetails },
        });
    };

    handleOpenWorklogEditor = () => {
        // Note: we set isSomethingLoading: true to disable all fields while the form is open
        if (this.state.currentInlineDialog !== 'worklog') {
            this.setState({ currentInlineDialog: 'worklog', isSomethingLoading: true });
        } else {
            this.setState({ currentInlineDialog: '', isSomethingLoading: false });
        }
    };

    handleOpenWatchesEditor = () => {
        // Note: we set isSomethingLoading: true to disable all fields while the form is open
        if (this.state.currentInlineDialog !== 'watches') {
            this.setState({ currentInlineDialog: 'watches', isSomethingLoading: true });
        } else {
            this.setState({ currentInlineDialog: '', isSomethingLoading: false });
        }
    };

    handleOpenVotesEditor = () => {
        // Note: we set isSomethingLoading: true to disable all fields while the form is open
        if (this.state.currentInlineDialog !== 'votes') {
            this.setState({ currentInlineDialog: 'votes', isSomethingLoading: true });
        } else {
            this.setState({ currentInlineDialog: '', isSomethingLoading: false });
        }
    };

    handleOpenAttachmentEditor = () => {
        // Note: we set isSomethingLoading: true to disable all fields while the form is open
        if (this.state.currentInlineDialog !== 'attachment') {
            this.setState({ currentInlineDialog: 'attachment', isSomethingLoading: true });
        } else {
            this.setState({ currentInlineDialog: '', isSomethingLoading: false });
        }
    };

    handleInlineDialogClose = () => {
        this.setState({ currentInlineDialog: '', isSomethingLoading: false });
    };

    handleInlineDialogSave = (field: FieldUI, value: any) => {
        this.setState({ currentInlineDialog: '', isSomethingLoading: false });
        this.handleInlineEdit(field, value);
    };

    handleAddWatcher = (user: any) => {
        this.setState({ currentInlineDialog: '', isSomethingLoading: true, loadingField: 'watches' });
        this.postMessage({
            action: 'addWatcher',
            site: this.state.siteDetails,
            issueKey: this.state.key,
            watcher: user,
        });
    };

    handleRemoveWatcher = (user: any) => {
        this.setState({ currentInlineDialog: '', isSomethingLoading: true, loadingField: 'watches' });
        this.postMessage({
            action: 'removeWatcher',
            site: this.state.siteDetails,
            issueKey: this.state.key,
            watcher: user,
        });
    };

    handleAddVote = (user: any) => {
        this.setState({ currentInlineDialog: '', isSomethingLoading: true, loadingField: 'votes' });
        this.postMessage({ action: 'addVote', site: this.state.siteDetails, issueKey: this.state.key, voter: user });
    };

    handleRemoveVote = (user: any) => {
        this.setState({ currentInlineDialog: '', isSomethingLoading: true, loadingField: 'votes' });
        this.postMessage({ action: 'removeVote', site: this.state.siteDetails, issueKey: this.state.key, voter: user });
    };

    handleAddAttachments = (files: File[]) => {
        if (this.attachingInProgress) {
            return;
        }
        this.attachingInProgress = true;

        readFilesContentAsync(files)
            .then((filesWithContent) => {
                this.setState({ currentInlineDialog: '', isSomethingLoading: false, loadingField: 'attachment' });
                const serFiles = filesWithContent.map((file) => {
                    return {
                        lastModified: file.lastModified,
                        lastModifiedDate: (file as any).lastModifiedDate,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        path: (file as any).path,
                        fileContent: file.fileContent,
                    };
                });
                this.postMessage({
                    action: 'addAttachments',
                    site: this.state.siteDetails,
                    issueKey: this.state.key,
                    files: serFiles,
                });
            })
            .finally(() => (this.attachingInProgress = false));
    };

    handleDeleteAttachment = (file: any) => {
        this.setState({ isSomethingLoading: true, loadingField: 'attachment' });
        this.postMessage({ action: 'deleteAttachment', site: this.state.siteDetails, objectWithId: file });
    };

    handleRefresh = () => {
        this.postMessage({ action: 'refreshIssue' });
    };

    handleDeleteIssuelink = (issuelink: any) => {
        this.setState({ isSomethingLoading: true, loadingField: 'issuelinks' });
        this.postMessage({ action: 'deleteIssuelink', site: this.state.siteDetails, objectWithId: issuelink });
    };

    getMainPanelNavMarkup(): any {
        const itIconUrl = this.state.fieldValues['issuetype'] ? this.state.fieldValues['issuetype'].iconUrl : undefined;

        return (
            <div>
                {this.state.showPMF && (
                    <PMFBBanner
                        onPMFOpen={() => this.onPMFOpen()}
                        onPMFVisiblity={(visible: boolean) => this.setState({ showPMF: visible })}
                        onPMFLater={() => this.onPMFLater()}
                        onPMFNever={() => this.onPMFNever()}
                        onPMFSubmit={(data: LegacyPMFData) => this.onPMFSubmit(data)}
                    />
                )}
                <div className="ac-page-header">
                    <div className="ac-breadcrumbs">
                        {this.state.hierarchy && this.state.hierarchy.length > 0 && (
                            <>
                                {this.state.hierarchyLoading && this.state.hierarchy.length <= 1 && (
                                    <>
                                        <span className="ac-breadcrumb-loading">
                                            {[...Array(3)].map((_, idx) => (
                                                <span
                                                    key={idx}
                                                    className="animate-pulse"
                                                    style={{ animationDelay: `${idx * 0.2}s` }}
                                                >
                                                    .
                                                </span>
                                            ))}
                                        </span>
                                        <span className="ac-breadcrumb-divider">/</span>
                                    </>
                                )}
                                {this.state.hierarchy.map((issue, index) => {
                                    const isLastItem = index === this.state.hierarchy.length - 1;
                                    const shouldOpenInJira = issue.key === this.state.key;
                                    const handleItemClick = !shouldOpenInJira
                                        ? () =>
                                              this.handleOpenIssue({
                                                  siteDetails: this.state.siteDetails,
                                                  key: issue.key,
                                              })
                                        : undefined;

                                    return (
                                        <React.Fragment key={issue.key}>
                                            <NavItem
                                                text={issue.key}
                                                iconUrl={issue.issuetype?.iconUrl}
                                                href={
                                                    shouldOpenInJira
                                                        ? `${this.state.siteDetails.baseLinkUrl}/browse/${issue.key}`
                                                        : undefined
                                                }
                                                onItemClick={handleItemClick}
                                                onCopy={isLastItem ? this.handleCopyIssueLink : undefined}
                                            />
                                            {!isLastItem && <span className="ac-breadcrumb-divider">/</span>}
                                        </React.Fragment>
                                    );
                                })}
                            </>
                        )}
                        {!this.state.hierarchy ||
                            (this.state.hierarchy.length === 0 && (
                                <Tooltip
                                    content={`Created on ${
                                        this.state.fieldValues['created.rendered'] || this.state.fieldValues['created']
                                    }`}
                                >
                                    <NavItem
                                        text={`${this.state.key}`}
                                        href={`${this.state.siteDetails.baseLinkUrl}/browse/${this.state.key}`}
                                        iconUrl={itIconUrl}
                                        onCopy={this.handleCopyIssueLink}
                                    />
                                </Tooltip>
                            ))}
                    </div>
                </div>
                {this.state.isErrorBannerOpen && (
                    <ErrorBanner onDismissError={this.handleDismissError} errorDetails={this.state.errorDetails} />
                )}
            </div>
        );
    }

    getMainPanelBodyMarkup(): any {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
                <IssueMainPanel
                    fields={this.state.fields}
                    fieldValues={this.state.fieldValues}
                    handleAddAttachments={this.handleAddAttachments}
                    siteDetails={this.state.siteDetails}
                    onDeleteAttachment={this.handleDeleteAttachment}
                    loadingField={this.state.loadingField}
                    subtaskTypes={this.state.selectFieldOptions['subtasks']}
                    linkTypes={this.state.selectFieldOptions['issuelinks']}
                    isEpic={this.state.isEpic}
                    epicChildren={this.state.epicChildren}
                    epicChildrenTypes={
                        this.state.siteDetails.isCloud
                            ? this.state.selectFieldOptions['issuetype']
                            : this.state.selectFieldOptions['issuetype']?.filter((type) => {
                                  return type.name !== 'Epic'; // The array is size 4 by default so no perf problems, filter reduces to 3
                              })
                    }
                    handleInlineEdit={this.handleInlineEdit}
                    handleOpenIssue={this.handleOpenIssue}
                    onFetchIssues={async (input: string) =>
                        await this.loadIssueOptions(this.state.fields['issuelinks'] as SelectFieldUI, input)
                    }
                    onDelete={this.handleDeleteIssuelink}
                    fetchUsers={this.fetchAndTransformUsers}
                    fetchImage={(img) => this.fetchImage(img)}
                    isAtlaskitEditorEnabled={this.state.isAtlaskitEditorEnabled}
                    onIssueUpdate={this.handleChildIssueUpdate}
                    mentionProvider={this.mentionProvider}
                />
                {this.advancedMain()}
                {this.state.fields['comment'] && (
                    <div className="ac-vpadding">
                        <label className="ac-field-label">Comments</label>
                        <IssueCommentComponent
                            comments={this.state.fieldValues['comment'].comments}
                            currentUser={this.state.currentUser}
                            siteDetails={this.state.siteDetails}
                            onCreate={this.handleCreateComment}
                            onSave={this.handleUpdateComment}
                            fetchUsers={this.fetchAndTransformUsers}
                            fetchImage={(img) => this.fetchImage(img)}
                            onDelete={this.handleDeleteComment}
                            isServiceDeskProject={
                                this.state.fieldValues['project'] &&
                                this.state.fieldValues['project'].projectTypeKey === 'service_desk'
                            }
                            isAtlaskitEditorEnabled={this.state.isAtlaskitEditorEnabled}
                            commentText={this.state.commentText}
                            onCommentTextChange={this.handleCommentTextChange}
                            isEditingComment={this.state.isEditingComment}
                            onEditingCommentChange={this.handleCommentEditingChange}
                            mentionProvider={this.mentionProvider}
                        />
                    </div>
                )}
            </div>
        );
    }

    commonSidebar(): any {
        let commonItems: SidebarItem[];

        if (this.state.siteDetails.isCloud || this.state.fieldValues['issuetype'].subtask) {
            commonItems = ['assignee', 'reporter', 'labels', 'priority', 'components', 'fixVersions', 'parent']
                .filter((field) => !!this.state.fields[field])
                .map((field) => {
                    return {
                        itemLabel: this.state.fields[field].name,
                        itemComponent: this.getInputMarkup(
                            this.state.fields[field],
                            true,
                            this.state.fieldValues['issuetype'],
                            field,
                        ),
                    };
                });
        } else {
            // only child-parent relationship in DC is between subtasks and StandardIssueTypes
            // epic and standardIssue types do not hold this relationship nor is EpicLink passed in via the fields
            commonItems = ['assignee', 'reporter', 'labels', 'priority', 'components', 'fixVersions']
                .filter((field) => !!this.state.fields[field])
                .map((field) => {
                    return {
                        itemLabel: this.state.fields[field].name,
                        itemComponent: this.getInputMarkup(
                            this.state.fields[field],
                            true,
                            this.state.fieldValues['issuetype'],
                            field,
                        ),
                    };
                });
        }

        const advancedItems: SidebarItem[] = this.advancedSidebarFields
            .map((field) => {
                if (field.advanced && field.uiType !== UIType.NonEditable) {
                    if (field.uiType === UIType.Timetracking) {
                        field.name = 'Original estimate';
                    }
                    return {
                        itemLabel: field.name,
                        itemComponent: this.getInputMarkup(
                            field,
                            true,
                            this.state.fieldValues['issuetype'],
                            `Advanced sidebar`,
                        ),
                    };
                } else {
                    return undefined;
                }
            })
            .filter((item) => item !== undefined) as SidebarItem[];

        if (this.state.recentPullRequests && this.state.recentPullRequests.length > 0) {
            advancedItems.push({
                itemLabel: 'Recent pull requests',
                itemComponent: (
                    <PullRequests
                        pullRequests={this.state.recentPullRequests}
                        onClick={(pr: any) => this.postMessage({ action: 'openPullRequest', prHref: pr.url })}
                    />
                ),
            });
        }
        return (
            <Box style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '16px' }}>
                <IssueSidebarButtonGroup
                    handleAddVote={this.handleAddVote}
                    handleAddWatcher={this.handleAddWatcher}
                    handleInlineEdit={this.handleInlineEdit}
                    handleRefresh={this.handleRefresh}
                    handleRemoveVote={this.handleRemoveVote}
                    handleRemoveWatcher={this.handleRemoveWatcher}
                    currentUser={this.state.currentUser}
                    fields={this.state.fields}
                    fieldValues={this.state.fieldValues}
                    loadingField={this.state.loadingField}
                    fetchUsers={this.fetchUsers}
                    transitions={this.state.selectFieldOptions['transitions']}
                    handleStatusChange={this.handleStatusChange}
                    handleStartWork={this.handleStartWorkOnIssue}
                />
                <IssueSidebarCollapsible label="Details" items={commonItems} defaultOpen />
                <IssueSidebarCollapsible label="More fields" items={advancedItems} />
            </Box>
        );
    }

    advancedMain(): any {
        const markups: any[] = [];

        this.advancedMainFields.forEach((field) => {
            if (field.advanced && field.uiType !== UIType.NonEditable) {
                markups.push(
                    <div className="ac-vpadding">
                        <label className="ac-field-label">{field.name}</label>
                        {this.getInputMarkup(field, true, this.state.fieldValues['issuetype'], `Advanced main`)}
                    </div>,
                );
            }
        });

        return markups;
    }

    createdUpdatedDates(): any {
        let created, updated;
        try {
            created = `Created ${formatDistanceToNow(parseISO(this.state.fieldValues['created']))} ago`;
            updated = `Updated ${formatDistanceToNow(parseISO(this.state.fieldValues['updated']))} ago`;
        } catch {
            created = this.state.fieldValues['created.rendered'] || this.state.fieldValues['created'];
            updated = this.state.fieldValues['updated.rendered'] || this.state.fieldValues['updated'];
        }
        return (
            <div className="ac-issue-created-updated">
                {created && <div>{created}</div>}•{updated && <div>{updated}</div>}
            </div>
        );
    }

    override componentDidMount() {
        this.postMessage({ action: 'getFeatureFlags' });
    }

    public override render() {
        if (
            (Object.keys(this.state.fields).length < 1 || Object.keys(this.state.fieldValues).length < 1) &&
            !this.state.isErrorBannerOpen &&
            this.state.isOnline
        ) {
            this.postMessage({ action: 'refreshIssue' });
            return <AtlLoader />;
        }

        if (!this.state.isOnline) {
            return <Offline />;
        }

        return (
            <Page>
                <EditorStateProvider isAtlaskitEditorEnabled={this.state.isAtlaskitEditorEnabled}>
                    <AtlascodeErrorBoundary
                        context={{ view: AnalyticsView.JiraIssuePage }}
                        postMessageFunc={(e) => {
                            this.postMessage(e); /* just {this.postMessage} doesn't work */
                        }}
                    >
                        <WidthDetector>
                            {(width?: number) => {
                                if (width && width < 800) {
                                    return (
                                        <div style={{ margin: '20px 16px 0px 16px' }}>
                                            {this.getMainPanelNavMarkup()}
                                            <h1>
                                                {this.getInputMarkup(
                                                    this.state.fields['summary'],
                                                    true,
                                                    this.state.fieldValues['issuetype'],
                                                    'summary',
                                                )}
                                            </h1>
                                            {this.commonSidebar()}
                                            {this.getMainPanelBodyMarkup()}
                                            {this.createdUpdatedDates()}
                                        </div>
                                    );
                                }
                                return (
                                    <div style={{ maxWidth: '1200px', margin: '20px auto 0 auto' }}>
                                        <Grid layout="fluid">
                                            <GridColumn>
                                                {this.getMainPanelNavMarkup()}
                                                <div style={{ paddingTop: '8px' }}>
                                                    <Grid layout="fluid">
                                                        <GridColumn medium={8}>
                                                            <h1 data-testid="issue.title">
                                                                {this.getInputMarkup(
                                                                    this.state.fields['summary'],
                                                                    true,
                                                                    this.state.fieldValues['issuetype'],
                                                                    'summary',
                                                                )}
                                                            </h1>
                                                            {this.getMainPanelBodyMarkup()}
                                                        </GridColumn>
                                                        <GridColumn medium={4}>
                                                            {this.commonSidebar()}
                                                            {this.createdUpdatedDates()}
                                                        </GridColumn>
                                                    </Grid>
                                                </div>
                                            </GridColumn>
                                        </Grid>
                                    </div>
                                );
                            }}
                        </WidthDetector>
                    </AtlascodeErrorBoundary>
                </EditorStateProvider>
            </Page>
        );
    }
}
