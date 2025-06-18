export const enum Features {
    EnableErrorTelemetry = 'atlascode-send-error-telemetry',
    JiraRichText = 'atlascode-jira-rte',
    AtlassianNotifications = 'atlascode-atlassian-notifications-v2',
}

export const enum Experiments {
    Dummy = 'dummy',
}

export const ExperimentGates: Record<Experiments, ExperimentPayload> = {
    [Experiments.Dummy]: {
        parameter: 'enableQuickPickOnboarding',
        defaultValue: false,
    },
};

type ExperimentPayload = { parameter: string; defaultValue: any };

export type FeatureGateValues = Record<Features, boolean>;
export type ExperimentGateValues = Record<Experiments, any>;
