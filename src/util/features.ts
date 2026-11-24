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
    RequireDedicatedRovoDevAuth = 'atlascode-require-dedicated-rovodev-auth',
}

/**
 * Default values for feature gates when remote config is unavailable.
 * This might happen during initialization or if there are network issues.
 */
export const defaultFeatureGateValues: Partial<FeatureGateValues> = {
    [Features.RequireDedicatedRovoDevAuth]: false,
};

// No experiments are currently defined. When adding one, replace this type with a string enum, e.g.
// export const enum Experiments { MyExperiment = 'my_experiment_name' }
export type Experiments = string & { readonly __experimentBrand: unique symbol };

export const ExperimentGates: Record<Experiments, ExperimentPayload> = {};

type ExperimentPayload = { parameter: string; defaultValue: any };

export type FeatureGateValues = Record<Features, boolean>;
export type ExperimentGateValues = Record<Experiments, any>;
