import { ReducerAction } from '@atlassianlabs/guipi-core-controller';

export enum CommonMessageType {
    Error = 'error',
    OnlineStatus = 'onlineStatus',
    PMFStatus = 'pmfStatus',
    UpdateFeatureFlags = 'updateFeatureFlags',
    UpdateExperimentValues = 'updateExperimentValues',
}

export type CommonMessage =
    | ReducerAction<CommonMessageType.Error, HostErrorMessage>
    | ReducerAction<CommonMessageType.OnlineStatus, OnlineStatusMessage>
    | ReducerAction<CommonMessageType.PMFStatus, PMFMessage>
    | ReducerAction<CommonMessageType.UpdateFeatureFlags, UpdateFeatureFlagsMessage>
    | ReducerAction<CommonMessageType.UpdateExperimentValues, UpdateExperimentValuesMessage>;

export interface HostErrorMessage {
    reason: string;
}

export interface OnlineStatusMessage {
    isOnline: boolean;
}

export interface PMFMessage {
    showPMF: boolean;
}

export interface UpdateFeatureFlagsMessage {
    featureFlags: { [key: string]: boolean };
}

export interface UpdateExperimentValuesMessage {
    experimentValues: { [key: string]: any };
}
