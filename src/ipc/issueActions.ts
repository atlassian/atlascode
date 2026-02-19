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
import { IssueSuggestionSettings, SimplifiedTodoIssueData } from 'src/config/model';

import { DetailedSiteInfo } from '../atlclients/authInfo';
import { Branch } from '../typings/git';
import { Action } from './messaging';

export interface RefreshIssueAction extends Action {
    action: 'refreshIssue';
}

export interface EditIssueAction extends Action {
    action: 'editIssue';
    fields: FieldValues;
    teamId?: string;
}

export interface EditChildIssueAction extends Action {
    action: 'editChildIssue';
    issueKey: string;
    fields: FieldValues;
}

export interface TransitionChildIssueAction extends Action {
    action: 'transitionChildIssue';
    issueKey: string;
    statusName: string;
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
    currentJQL?: string;
    fieldName?: string;
}

export interface ScreensForProjectsAction extends Action {
    project: Project;
    fieldValues: FieldValues;
}

export interface ScreensForSiteAction extends Action {
    site: DetailedSiteInfo;
}

export interface LoadMoreProjectsAction extends Action {
    action: 'loadMoreProjects';
    maxResults?: number;
    startAt?: number;
    query?: string;
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
    onCreateAction?: 'createAndView' | 'createAndStartWork' | 'createAndGenerateCode';
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
    pushBranchToRemote: boolean;
}

export interface OpenStartWorkPageAction extends Action {
    action: 'openStartWorkPage';
    issue: MinimalIssue<DetailedSiteInfo>;
}

export interface OpenRovoDevWithIssueAction extends Action {
    action: 'openRovoDevWithIssue';
    issue: MinimalIssue<DetailedSiteInfo>;
}

export interface CloneIssueAction extends Action {
    action: 'cloneIssue';
    site: DetailedSiteInfo;
    issueData: any;
}

export interface ShareIssueData {
    recipients: User[];
    message: string;
}

export interface ShareIssueAction extends Action {
    action: 'shareIssue';
    site: DetailedSiteInfo;
    issueKey: string;
    issueSummary: string;
    shareData: ShareIssueData;
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

export interface UpdateWorklogAction extends Action {
    action: 'updateWorklog';
    site: DetailedSiteInfo;
    issueKey: string;
    worklogId: string;
    worklogData: WorklogData;
}

export interface DeleteWorklogAction extends Action {
    action: 'deleteWorklog';
    site: DetailedSiteInfo;
    issueKey: string;
    worklogId: string;
    adjustEstimate?: string;
    newEstimate?: string;
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

export interface FetchIssueHistoryAction extends Action {
    action: 'fetchIssueHistory';
    issueKey: string;
}

export interface UpdateAiSettingsAction extends Action {
    action: 'updateAiSettings';
    newState: IssueSuggestionSettings;
}

export interface GenerateIssueSuggestionsAction extends Action {
    action: 'generateIssueSuggestions';
    todoData: SimplifiedTodoIssueData;
    suggestionSettings: IssueSuggestionSettings;
}

export interface AiSuggeestionFeedbackAction extends Action {
    action: 'aiSuggestionFeedback';
    isPositive: boolean;
    todoData: SimplifiedTodoIssueData;
    feedbackData?: {
        description: string;
        contactMe: boolean;
    };
}

export interface HandleEditorFocusAction extends Action {
    action: 'handleEditorFocus';
    isFocused: boolean;
}

export interface CheckRovoDevEntitlementAction extends Action {
    action: 'checkRovoDevEntitlement';
}

export interface OpenRovoDevWithPromoBannerAction extends Action {
    action: 'openRovoDevWithPromoBanner';
}

export interface DismissRovoDevPromoBannerAction extends Action {
    action: 'dismissRovoDevPromoBanner';
}

export interface MediaTokenFetchAction extends Action {
    action: 'fetchMediaToken';
}

export interface CreateIssueValidationFailedAction extends Action {
    action: 'createIssueValidationFailed';
    missingRequiredFields: string[];
    filledFields: string[];
}

export interface CreateIssueErrorDisplayedAction extends Action {
    action: 'createIssueErrorDisplayed';
    errorDetails: string | { message?: string; title?: string } | undefined;
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

export function isOpenJiraIssue(a: Action): a is OpenJiraIssueAction {
    return (<OpenJiraIssueAction>a).issueOrKey !== undefined;
}

export function isFetchQueryAndSite(a: Action): a is FetchQueryAction {
    return a && (<FetchQueryAction>a).query !== undefined && (<FetchQueryAction>a).site !== undefined;
}

export function isScreensForProjects(a: Action): a is ScreensForProjectsAction {
    return (<ScreensForProjectsAction>a).project !== undefined;
}

export function isScreensForSite(a: Action): a is ScreensForSiteAction {
    return (<ScreensForSiteAction>a).site !== undefined;
}

export function isLoadMoreProjects(a: Action): a is LoadMoreProjectsAction {
    return a && a.action === 'loadMoreProjects';
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

export function isUpdateWorklog(a: Action): a is UpdateWorklogAction {
    return (
        a &&
        (<UpdateWorklogAction>a).worklogData !== undefined &&
        (<UpdateWorklogAction>a).site !== undefined &&
        (<UpdateWorklogAction>a).issueKey !== undefined &&
        (<UpdateWorklogAction>a).worklogId !== undefined
    );
}

export function isDeleteWorklog(a: Action): a is DeleteWorklogAction {
    return (
        a &&
        (<DeleteWorklogAction>a).site !== undefined &&
        (<DeleteWorklogAction>a).issueKey !== undefined &&
        (<DeleteWorklogAction>a).worklogId !== undefined
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

export function isOpenRovoDevWithIssueAction(a: Action): a is OpenRovoDevWithIssueAction {
    return a && a.action === 'openRovoDevWithIssue' && (<OpenRovoDevWithIssueAction>a).issue !== undefined;
}

export function isCloneIssue(a: Action): a is CloneIssueAction {
    return a && a.action === 'cloneIssue';
}

export function isShareIssue(a: Action): a is ShareIssueAction {
    return (
        a &&
        a.action === 'shareIssue' &&
        (<ShareIssueAction>a).shareData !== undefined &&
        (<ShareIssueAction>a).site !== undefined &&
        (<ShareIssueAction>a).issueKey !== undefined
    );
}

export function isUpdateAiSettings(a: Action): a is UpdateAiSettingsAction {
    return a && a.action === 'updateAiSettings' && (<UpdateAiSettingsAction>a).newState !== undefined;
}

export function isGenerateIssueSuggestions(a: Action): a is GenerateIssueSuggestionsAction {
    return (
        a &&
        a.action === 'generateIssueSuggestions' &&
        (<GenerateIssueSuggestionsAction>a).suggestionSettings !== undefined &&
        (<GenerateIssueSuggestionsAction>a).todoData !== undefined
    );
}

export function isAiSuggestionFeedback(a: Action): a is AiSuggeestionFeedbackAction {
    return (
        a &&
        a.action === 'aiSuggestionFeedback' &&
        (<AiSuggeestionFeedbackAction>a).isPositive !== undefined &&
        (<AiSuggeestionFeedbackAction>a).todoData !== undefined
    );
}

export function isHandleEditorFocus(a: Action): a is HandleEditorFocusAction {
    return a && a.action === 'handleEditorFocus';
}

export function isCheckRovoDevEntitlement(a: Action): a is CheckRovoDevEntitlementAction {
    return a && a.action === 'checkRovoDevEntitlement';
}

export function isOpenRovoDevWithPromoBanner(a: Action): a is OpenRovoDevWithPromoBannerAction {
    return a && a.action === 'openRovoDevWithPromoBanner';
}

export function isDismissRovoDevPromoBanner(a: Action): a is DismissRovoDevPromoBannerAction {
    return a && a.action === 'dismissRovoDevPromoBanner';
}

export function isMediaTokenFetchAction(a: Action): a is MediaTokenFetchAction {
    return (<MediaTokenFetchAction>a).action === 'fetchMediaToken';
}

export function isCreateIssueValidationFailed(a: Action): a is CreateIssueValidationFailedAction {
    return (
        a &&
        a.action === 'createIssueValidationFailed' &&
        (<CreateIssueValidationFailedAction>a).missingRequiredFields !== undefined
    );
}

export function isCreateIssueErrorDisplayed(a: Action): a is CreateIssueErrorDisplayedAction {
    return (
        a && a.action === 'createIssueErrorDisplayed' && (<CreateIssueErrorDisplayedAction>a).errorDetails !== undefined
    );
}
