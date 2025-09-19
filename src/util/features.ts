export enum Features {
    EnableErrorTelemetry = 'atlascode-send-error-telemetry',
    AtlassianNotifications = 'atlascode-atlassian-notifications-v2',
    StartWorkV3 = 'atlascode-start-work-v3',
    RovoDevEnabled = 'rovo_dev_ff',
    UseNewAuthFlow = 'atlascode-use-new-auth-flow',
    EnableAiSuggestions = 'atlascode-enable-ai-suggestions',
    AtlaskitEditor = 'atlascode-use-new-atlaskit-editor',
}

export const enum Experiments {
    AtlascodeNewSettingsExperiment = 'atlascode_new_settings_experiment',
}

export const ExperimentGates: Record<Experiments, ExperimentPayload> = {
    [Experiments.AtlascodeNewSettingsExperiment]: {
        parameter: 'enabledSettings',
        defaultValue: false,
    },
};

type ExperimentPayload = { parameter: string; defaultValue: any };

export type FeatureGateValues = Record<Features, boolean>;
export type ExperimentGateValues = Record<Experiments, any>;
