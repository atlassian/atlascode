export enum Features {
    EnableNewUriHandler = 'atlascode-enable-new-uri-handler',
    EnableAuthUI = 'atlascode-enable-auth-ui',
}

export enum Experiments {
    NewAuthUI = 'atlascode_new_auth_ui',
}

export const ExperimentGates: ExperimentGate = {
    [Experiments.NewAuthUI]: {
        gate: 'atlascode_new_auth_ui',
        parameter: 'isEnabled',
        defaultValue: false,
    },
};

type ExperimentGate = { [key: string]: { gate: string; parameter: string; defaultValue: any } };

export type FeatureGates = { [key: string]: boolean };

export type ExperimentGateValues = { [key: string]: any };
