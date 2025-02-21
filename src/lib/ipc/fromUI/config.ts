import { AuthInfo, DetailedSiteInfo, SiteInfo } from '../../../atlclients/authInfo';

import { CommonAction } from './common';
import { ConfigTarget } from '../models/config';
import { ReducerAction } from '@atlassianlabs/guipi-core-controller';

export enum ConfigActionType {
    Login = 'login',
    RemoteLogin = 'remoteLogin',
    Logout = 'logout',
    SaveSettings = 'saveSettings',
    OpenJSON = 'openJson',
    JQLOptionsRequest = 'jqlOptionsRequest',
    JQLSuggestionsRequest = 'JQLSuggestionsRequest',
    FilterSearchRequest = 'filterSearchRequest',
    ValidateJqlRequest = 'validateJqlRequest',
    SetTarget = 'setTarget',
    CreateJiraIssue = 'createJiraIssue',
    ViewJiraIssue = 'viewJiraIssue',
    CreatePullRequest = 'createPullRequest',
    ViewPullRequest = 'viewPullRequest',
}

export type ConfigAction =
    | ReducerAction<ConfigActionType.Login, LoginAuthAction>
    | ReducerAction<ConfigActionType.RemoteLogin>
    | ReducerAction<ConfigActionType.Logout, LogoutAuthAction>
    | ReducerAction<ConfigActionType.SaveSettings, SaveSettingsAction>
    | ReducerAction<ConfigActionType.OpenJSON, OpenJsonAction>
    | ReducerAction<ConfigActionType.JQLOptionsRequest, JQLOptionsRequestAction>
    | ReducerAction<ConfigActionType.JQLSuggestionsRequest, JQLSuggestionsRequestAction>
    | ReducerAction<ConfigActionType.FilterSearchRequest, FilterSearchRequestAction>
    | ReducerAction<ConfigActionType.ValidateJqlRequest, ValidateJqlRequestAction>
    | ReducerAction<ConfigActionType.SetTarget, TargetUpdateAction>
    | ReducerAction<ConfigActionType.CreateJiraIssue>
    | ReducerAction<ConfigActionType.ViewJiraIssue>
    | ReducerAction<ConfigActionType.CreatePullRequest>
    | ReducerAction<ConfigActionType.ViewPullRequest>
    | CommonAction;

export interface AuthAction {
    siteInfo: SiteInfo;
}

export interface LoginAuthAction extends AuthAction {
    authInfo: AuthInfo;
}

export interface LogoutAuthAction extends AuthAction {
    siteInfo: DetailedSiteInfo;
}

export interface SaveCodeAction {
    code: string;
}

export interface SaveSettingsAction {
    target: ConfigTarget;
    changes: {
        [key: string]: any;
    };
    removes?: string[];
}

export interface OpenJsonAction {
    target: ConfigTarget;
}

export interface TargetUpdateAction {
    target: ConfigTarget;
}

export interface JQLOptionsRequestAction {
    site: DetailedSiteInfo;
}

export interface FilterSearchRequestAction {
    site: DetailedSiteInfo;
    query: string;
    maxResults?: number;
    startAt?: number;
    abortKey?: string;
}

export interface JQLSuggestionsRequestAction {
    site: DetailedSiteInfo;
    fieldName: string;
    userInput: string;
    predicateName?: string;
    abortKey?: string;
}

export interface ValidateJqlRequestAction {
    site: DetailedSiteInfo;
    jql: string;
    abortKey?: string;
}
