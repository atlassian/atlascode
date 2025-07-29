export const enum Features {
    EnableErrorTelemetry = 'atlascode-send-error-telemetry',
    JiraRichText = 'atlascode-jira-rte',
    AtlassianNotifications = 'atlascode-atlassian-notifications-v2',
    StartWorkV3 = 'atlascode-start-work-v3',
}

export const enum Experiments {
    AtlascodeOnboardingExperiment = 'atlascode_quick_pick_onboarding_experiment',
}

export const ExperimentGates: Record<Experiments, ExperimentPayload> = {
    [Experiments.AtlascodeOnboardingExperiment]: {
        parameter: 'enableQuickPickOnboarding',
        defaultValue: false,
    },
};

type ExperimentPayload = { parameter: string; defaultValue: any };

export type FeatureGateValues = Record<Features, boolean>;
export type ExperimentGateValues = Record<Experiments, any>;
