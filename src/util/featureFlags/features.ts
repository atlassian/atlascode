export const enum Features {
    EnableNewUriHandler = 'atlascode-enable-new-uri-handler',
    NoOpFeature = 'atlascode-noop',
    EnableErrorTelemetry = 'atlascode-send-error-telemetry',
}

export const enum Experiments {
    AtlascodeAA = 'atlascode_aa_experiment',
}

export const ExperimentGates: Record<Experiments, ExperimentPayload> = {
    [Experiments.AtlascodeAA]: {
        parameter: 'isEnabled2',
        defaultValue: 'Default',
    },
};

type ExperimentPayload = { parameter: string; defaultValue: any };

export type FeatureGateValues = Record<Features, boolean>;
export type ExperimentGateValues = Record<Experiments, any>;
