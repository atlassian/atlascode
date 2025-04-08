import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { MinimalIssueOrKeyAndSite } from '@atlassianlabs/jira-pi-common-models';

import { UIErrorInfo } from '../../../analyticsTypes';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { FeedbackData, PMFData } from '../models/common';

export enum CommonActionType {
    SubmitPMF = 'pmfSubmit',
    OpenPMFSurvey = 'pmfOpen',
    DismissPMFLater = 'pmfLater',
    DismissPMFNever = 'pmfNever',
    Refresh = 'refresh',
    SubmitFeedback = 'submitFeedback',
    ExternalLink = 'externalLink',
    CopyLink = 'copyLink',
    OpenJiraIssue = 'openJiraIssue',
    Cancel = 'cancelInFlight',
    SendAnalytics = 'sendAnalytics',
}

export type CommonAction =
    | ReducerAction<CommonActionType.SendAnalytics, SendAnalyticsAction>
    | ReducerAction<CommonActionType.SubmitPMF, PMFSubmitAction>
    | ReducerAction<CommonActionType.OpenPMFSurvey>
    | ReducerAction<CommonActionType.DismissPMFLater>
    | ReducerAction<CommonActionType.DismissPMFNever>
    | ReducerAction<CommonActionType.Refresh>
    | ReducerAction<CommonActionType.SubmitFeedback, SubmitFeedbackAction>
    | ReducerAction<CommonActionType.ExternalLink, ExternalLinkAction>
    | ReducerAction<CommonActionType.CopyLink, CopyLinkAction>
    | ReducerAction<CommonActionType.OpenJiraIssue, OpenJiraIssueAction>
    | ReducerAction<CommonActionType.Cancel, CancelAction>;

export interface SendAnalyticsAction {
    errorInfo: UIErrorInfo;
}
export interface PMFSubmitAction {
    pmfData: PMFData;
}

export interface SubmitFeedbackAction {
    feedback: FeedbackData;
}

export interface ExternalLinkAction {
    source: string;
    linkId: string;
    url?: string;
}

export interface CopyLinkAction {
    linkType: 'jiraIssue' | 'pullRequest' | 'bbIssue';
    url: string;
}

export interface OpenJiraIssueAction {
    issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>;
}

export interface CancelAction {
    abortKey: string;
    reason: string;
}
