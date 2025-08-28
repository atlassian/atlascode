export const enum Features {
    EnableErrorTelemetry = 'atlascode-send-error-telemetry',
    JiraRichText = 'atlascode-jira-rte',
    AtlassianNotifications = 'atlascode-atlassian-notifications-v2',
    StartWorkV3 = 'atlascode-start-work-v3',
    RovoDevEnabled = 'rovo_dev_ff',
    UseNewAuthFlow = 'atlascode-use-new-auth-flow',
}

export const enum Experiments {
    AtlascodeNewSettingsExperiment = 'atlascode_new_settings_experiment',
}

export const ExperimentGates: Record<Experiments, ExperimentPayload> = {
    [Experiments.AtlascodeNewSettingsExperiment]: {
        parameter: 'enabled2',
        defaultValue: false,
    },
};

type ExperimentPayload = { parameter: string; defaultValue: any };

export type FeatureGateValues = Record<Features, boolean>;
export type ExperimentGateValues = Record<Experiments, any>;
