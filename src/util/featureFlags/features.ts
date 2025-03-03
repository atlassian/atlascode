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
        parameter: 'isEnabled',
        defaultValue: false,
    },
    [Experiments.AtlascodeAA]: {
        parameter: 'isEnabled',
        defaultValue: false,
    },
};

type ExperimentPayload = { parameter: string; defaultValue: any };
type ExperimentGate = Record<Experiments, ExperimentPayload>;

export type FeatureGateValues = Record<Features, boolean>;

export type ExperimentGateValues = Record<Experiments, any>;
