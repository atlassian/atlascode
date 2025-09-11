import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { Transition } from '@atlassianlabs/jira-pi-common-models';

import { WorkspaceRepo } from '../../../bitbucket/model';
import { Branch } from '../../../typings/git';
import { ConfigSection, ConfigSubSection } from '../models/config';
import { CommonAction } from './common';

export enum StartWorkActionType {
    ClosePage = 'closePage',
    StartRequest = 'startRequest',
    OpenSettings = 'openSettings',
    GetImage = 'getImage',
    RefreshTreeViews = 'refreshTreeViews',
    GetRovoDevPreference = 'getRovoDevPreference',
    UpdateRovoDevPreference = 'updateRovoDevPreference',
    OpenRovoDev = 'openRovoDev',
}

export type StartWorkAction =
    | ReducerAction<StartWorkActionType.ClosePage, {}>
    | ReducerAction<StartWorkActionType.StartRequest, StartRequestAction>
    | ReducerAction<StartWorkActionType.OpenSettings, OpenSettingsAction>
    | ReducerAction<StartWorkActionType.GetImage, GetImageAction>
    | ReducerAction<StartWorkActionType.RefreshTreeViews, {}>
    | ReducerAction<StartWorkActionType.GetRovoDevPreference, {}>
    | ReducerAction<StartWorkActionType.UpdateRovoDevPreference, { enabled: boolean }>
    | ReducerAction<StartWorkActionType.OpenRovoDev, {}>
    | CommonAction;

export interface StartRequestAction {
    transitionIssueEnabled: boolean;
    transition: Transition;
    branchSetupEnabled: boolean;
    wsRepo: WorkspaceRepo;
    sourceBranch: Branch;
    targetBranch: string;
    upstream: string;
    pushBranchToRemote: boolean;
}

export interface OpenSettingsAction {
    section?: ConfigSection;
    subsection?: ConfigSubSection;
}

export interface GetImageAction {
    nonce: string;
    url: string;
    siteDetailsStringified: string;
}
