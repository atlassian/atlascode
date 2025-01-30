import {
    CommentVisibility,
    isIssueType,
    IssueKeyAndSite,
    IssueType,
    MinimalIssue,
    MinimalIssueOrKeyAndSite,
    Project,
    Transition,
    User,
} from '@atlassianlabs/jira-pi-common-models';
import { FieldValues, IssueLinkTypeSelectOption, ValueType } from '@atlassianlabs/jira-pi-meta-models';
import { DetailedSiteInfo } from '../atlclients/authInfo';
import { Branch } from '../typings/git';
import { Action } from './messaging';

export interface RefreshIssueAction extends Action {
    action: 'refreshIssue';
}

export interface EditIssueAction extends Action {
    action: 'editIssue';
    fields: FieldValues;
}

export interface TransitionIssueAction extends Action {
    action: 'transitionIssue';
    issue: MinimalIssueOrKeyAndSite<DetailedSiteInfo>;
    transition: Transition;
}

export interface IssueCommentAction extends Action {
    action: 'comment';
    issue: IssueKeyAndSite<DetailedSiteInfo>;
    commentBody: string;
    commentId?: string;
    restriction?: CommentVisibility;
}

export interface IssueDeleteCommentAction extends Action {
    action: 'deleteComment';
    issue: IssueKeyAndSite<DetailedSiteInfo>;
    commentId: string;
}

export interface IssueAssignAction extends Action {
    action: 'assign';
    issue: MinimalIssue<DetailedSiteInfo>;
    userId?: string;
}

export interface SetIssueTypeAction extends Action {
    action: 'setIssueType';
    issueType: IssueType;
    fieldValues: FieldValues;
}

export interface OpenJiraIssueAction extends Action {
    action: 'openJiraIssue';
    issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>;
}

export interface CopyJiraIssueLinkAction extends Action {
    action: 'copyJiraIssueLink';
}

export interface FetchQueryAction extends Action {
    query: string;
    site: DetailedSiteInfo;
    autocompleteUrl?: string;
    valueType: ValueType;
}

export interface FetchByProjectQueryAction extends Action {
    query: string;
    project: string;
}

export interface FetchIssueFieldOptionsByJQLAction extends Action {
    jql: string;
    fieldId: string;
}

export interface ScreensForProjectsAction extends Action {
    project: Project;
    fieldValues: FieldValues;
}

export interface ScreensForSiteAction extends Action {
    site: DetailedSiteInfo;
}

export interface CreateSelectOptionAction extends Action {
    fieldKey: string;
    siteDetails: DetailedSiteInfo;
    createUrl: string;
    createData: {
        name: string;
        project: string;
    };
}

export interface CreateIssueAction extends Action {
    site: DetailedSiteInfo;
    issueData: any;
}

export interface CreateIssueLinkAction extends Action {
    site: DetailedSiteInfo;
    issueLinkData: any;
    issueLinkType: IssueLinkTypeSelectOption;
}

export interface StartWorkAction extends Action {
    action: 'startWork';
    transition: Transition;
    repoUri: string;
    sourceBranch: Branch;
    targetBranchName: string;
    remoteName: string;
    setupJira: boolean;
    setupBitbucket: boolean;
}

export interface OpenStartWorkPageAction extends Action {
    action: 'openStartWorkPage';
    issue: MinimalIssue<DetailedSiteInfo>;
}

export interface WorklogData {
    comment: string;
    started: string;
    timeSpent: string;
    newEstimate?: string;
    adjustEstimate?: string;
}

export interface CreateWorklogAction extends Action {
    site: DetailedSiteInfo;
    issueKey: string;
    worklogData: WorklogData;
}

export interface UpdateWatcherAction extends Action {
    site: DetailedSiteInfo;
    issueKey: string;
    watcher: User;
}

export interface UpdateVoteAction extends Action {
    site: DetailedSiteInfo;
    issueKey: string;
    voter: User;
}

export interface AddAttachmentsAction extends Action {
    site: DetailedSiteInfo;
    issueKey: string;
    files: any[];
}

export interface DeleteByIDAction extends Action {
    site: DetailedSiteInfo;
    objectWithId: any;
}

export interface GetImageAction extends Action {
    action: 'getImage';
    url: string;
}

export function isGetImage(a: Action): a is GetImageAction {
    return (<GetImageAction>a).action === 'getImage';
}

export function isTransitionIssue(a: Action): a is TransitionIssueAction {
    return (<TransitionIssueAction>a).transition !== undefined && (<TransitionIssueAction>a).issue !== undefined;
}

export function isSetIssueType(a: Action): a is SetIssueTypeAction {
    return a && (<SetIssueTypeAction>a).issueType !== undefined && isIssueType((<SetIssueTypeAction>a).issueType);
}

export function isIssueComment(a: Action): a is IssueCommentAction {
    return (<IssueCommentAction>a).commentBody !== undefined && (<IssueCommentAction>a).issue !== undefined;
}

export function isIssueDeleteComment(a: Action): a is IssueDeleteCommentAction {
    return (<IssueDeleteCommentAction>a).commentId !== undefined && (<IssueDeleteCommentAction>a).issue !== undefined;
}

export function isIssueAssign(a: Action): a is IssueAssignAction {
    return (<IssueAssignAction>a).issue !== undefined;
}
export function isOpenJiraIssue(a: Action): a is OpenJiraIssueAction {
    return (<OpenJiraIssueAction>a).issueOrKey !== undefined;
}

export function isFetchQueryAndSite(a: Action): a is FetchQueryAction {
    return a && (<FetchQueryAction>a).query !== undefined && (<FetchQueryAction>a).site !== undefined;
}

export function isFetchQuery(a: Action): a is FetchQueryAction {
    return a && (<FetchQueryAction>a).query !== undefined;
}

export function isFetchByProjectQuery(a: Action): a is FetchByProjectQueryAction {
    return (<FetchByProjectQueryAction>a).query !== undefined && (<FetchByProjectQueryAction>a).project !== undefined;
}

export function isFetchOptionsJQL(a: Action): a is FetchIssueFieldOptionsByJQLAction {
    return (
        (<FetchIssueFieldOptionsByJQLAction>a).jql !== undefined &&
        (<FetchIssueFieldOptionsByJQLAction>a).fieldId !== undefined
    );
}

export function isScreensForProjects(a: Action): a is ScreensForProjectsAction {
    return (<ScreensForProjectsAction>a).project !== undefined;
}

export function isScreensForSite(a: Action): a is ScreensForSiteAction {
    return (<ScreensForSiteAction>a).site !== undefined;
}

export function isCreateSelectOption(a: Action): a is CreateSelectOptionAction {
    return a && (<CreateSelectOptionAction>a).createData !== undefined;
}

export function isCreateIssue(a: Action): a is CreateIssueAction {
    return a && (<CreateIssueAction>a).issueData !== undefined && (<CreateIssueAction>a).site !== undefined;
}

export function isCreateWorklog(a: Action): a is CreateWorklogAction {
    return (
        a &&
        (<CreateWorklogAction>a).worklogData !== undefined &&
        (<CreateWorklogAction>a).site !== undefined &&
        (<CreateWorklogAction>a).issueKey !== undefined
    );
}

export function isUpdateWatcherAction(a: Action): a is UpdateWatcherAction {
    return (
        a &&
        (<UpdateWatcherAction>a).watcher !== undefined &&
        (<UpdateWatcherAction>a).site !== undefined &&
        (<UpdateWatcherAction>a).issueKey !== undefined
    );
}

export function isUpdateVoteAction(a: Action): a is UpdateVoteAction {
    return (
        a &&
        (<UpdateVoteAction>a).voter !== undefined &&
        (<UpdateVoteAction>a).site !== undefined &&
        (<UpdateVoteAction>a).issueKey !== undefined
    );
}

export function isAddAttachmentsAction(a: Action): a is AddAttachmentsAction {
    return (
        a &&
        (<AddAttachmentsAction>a).files !== undefined &&
        (<AddAttachmentsAction>a).site !== undefined &&
        (<AddAttachmentsAction>a).issueKey !== undefined
    );
}

export function isDeleteByIDAction(a: Action): a is DeleteByIDAction {
    return (
        a &&
        (<DeleteByIDAction>a).objectWithId !== undefined &&
        (<DeleteByIDAction>a).objectWithId.id !== undefined &&
        (<DeleteByIDAction>a).site !== undefined
    );
}

export function isCreateIssueLink(a: Action): a is CreateIssueLinkAction {
    return (
        a &&
        (<CreateIssueLinkAction>a).issueLinkData !== undefined &&
        (<CreateIssueLinkAction>a).site !== undefined &&
        (<CreateIssueLinkAction>a).issueLinkType !== undefined
    );
}

export function isStartWork(a: Action): a is StartWorkAction {
    return (<StartWorkAction>a).transition !== undefined;
}

export function isOpenStartWorkPageAction(a: Action): a is OpenStartWorkPageAction {
    return (<OpenStartWorkPageAction>a).issue !== undefined;
}
