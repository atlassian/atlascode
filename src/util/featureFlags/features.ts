export const enum Features {
    NoOpFeature = 'atlascode-noop',
    EnableErrorTelemetry = 'atlascode-send-error-telemetry',
    JiraRichText = 'atlascode-jira-rte',
    AtlassianNotifications = 'atlascode-atlassian-notifications-v2',
}

export const enum Experiments {
    AtlascodeAA = 'atlascode_aa_experiment',
    AtlascodeOnboardingExperiment = 'atlascode_quick_pick_onboarding_experiment',
}

export const ExperimentGates: Record<Experiments, ExperimentPayload> = {
    [Experiments.AtlascodeAA]: {
        parameter: 'isEnabled2',
        defaultValue: 'Default',
    },
    [Experiments.AtlascodeOnboardingExperiment]: {
        parameter: 'enableQuickPickOnboarding',
        defaultValue: false,
    },
};

type ExperimentPayload = { parameter: string; defaultValue: any };

export type FeatureGateValues = Record<Features, boolean>;
export type ExperimentGateValues = Record<Experiments, any>;
