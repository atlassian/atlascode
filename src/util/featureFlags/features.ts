export enum Features {
    EnableNewUriHandler = 'atlascode-enable-new-uri-handler',
    EnableAuthUI = 'atlascode-enable-auth-ui',
}

export enum Experiments {
    NewAuthUI = 'atlascode_new_auth_ui',
    AtlascodeAA = 'atlascode_aa_experiment',
}

export const ExperimentGates: ExperimentGate = {
    [Experiments.NewAuthUI]: {
        gate: 'atlascode_new_auth_ui',
        parameter: 'isEnabled',
        defaultValue: false,
    },
    [Experiments.AtlascodeAA]: {
        gate: 'atlascode_aa_experiment',
        parameter: 'isEnabled',
        defaultValue: false,
    },
};

type ExperimentPayload = { gate: string; parameter: string; defaultValue: any };
type ExperimentGate = Record<string, ExperimentPayload>;

export type FeatureGateValues = Record<string, boolean>;

export type ExperimentGateValues = Record<string, any>;
