import { ReducerAction } from '@atlassianlabs/guipi-core-controller';

export enum CommonMessageType {
    Error = 'error',
    PMFStatus = 'pmfStatus',
    UpdateFeatureFlags = 'updateFeatureFlags',
    UpdateExperimentValues = 'updateExperimentValues',
    AdditionalSettings = 'additionalSettings',
}

export type CommonMessage =
    | ReducerAction<CommonMessageType.Error, HostErrorMessage>
    | ReducerAction<CommonMessageType.PMFStatus, PMFMessage>
    | ReducerAction<CommonMessageType.UpdateFeatureFlags, UpdateFeatureFlagsMessage>
    | ReducerAction<CommonMessageType.UpdateExperimentValues, UpdateExperimentValuesMessage>
    | ReducerAction<CommonMessageType.AdditionalSettings, AdditionalSettings>;

export interface HostErrorMessage {
    reason: string;
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

export interface AdditionalSettings {
    rovoDevEnabled: boolean;
}
