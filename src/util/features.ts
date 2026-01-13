export enum Features {
    EnableErrorTelemetry = 'atlascode-send-error-telemetry',
    AtlassianNotifications = 'atlascode-atlassian-notifications-v2',
    RovoDevEnabled = 'rovo_dev_ff',
    UseNewAuthFlow = 'atlascode-use-new-auth-flow',
    EnableAiSuggestions = 'atlascode-enable-ai-suggestions-new',
    AtlaskitEditor = 'atlascode-use-new-atlaskit-editor',
    CreateWorkItemWebviewV2 = 'atlascode-create-work-item-webview-test',
    RovoDevEntitlementNotification = 'atlascode-rovodev-entitlement-notification',
    RovoDevLspEnabled = 'atlascode-enable-rovodev-lsp',
    SentryLogging = 'atlascode-sentry-logging',
    DedicatedRovoDevAuth = 'atlascode-use-dedicated-rovodev-auth',
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
