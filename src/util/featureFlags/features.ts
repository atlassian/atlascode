export const enum Features {
    EnableErrorTelemetry = 'atlascode-send-error-telemetry',
    JiraRichText = 'atlascode-jira-rte',
    AtlassianNotifications = 'atlascode-atlassian-notifications-v2',
    StartWorkV3 = 'atlascode-start-work-v3',
    RovoDevEnabled = 'rovo_dev_ff',
}

export const enum Experiments {
    AtlascodePerformanceExperiment = 'atlascode_performance_experiment',
}

export const ExperimentGates: Record<Experiments, ExperimentPayload> = {
    [Experiments.AtlascodePerformanceExperiment]: {
        parameter: 'enabled',
        defaultValue: true,
    },
};

type ExperimentPayload = { parameter: string; defaultValue: any };

export type FeatureGateValues = Record<Features, boolean>;
export type ExperimentGateValues = Record<Experiments, any>;
