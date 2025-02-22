export enum Features {
    EnableNewUriHandler = 'atlascode-enable-new-uri-handler',
    EnableAuthUI = 'atlascode-enable-auth-ui',
}

export enum Experiments {
    NewAuthUI = 'atlascode_new_auth_ui',
    NewAuthUIAA = 'atlascode_new_auth_ui_aa',
}

export const ExperimentGates: ExperimentGate = {
    [Experiments.NewAuthUI]: {
        gate: 'atlascode_new_auth_ui',
        parameter: 'isEnabled',
        defaultValue: false,
    },
    [Experiments.NewAuthUIAA]: {
        gate: 'atlascode_new_auth_ui_aa',
        parameter: 'isEnabled',
        defaultValue: false,
    },
};

type ExperimentGate = { [key: string]: { gate: string; parameter: string; defaultValue: any } };
