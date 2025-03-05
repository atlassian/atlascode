export enum Features {
    EnableNewUriHandler = 'atlascode-enable-new-uri-handler',
    EnableAuthUI = 'atlascode-enable-auth-ui',
    NewSidebarTreeView = 'atlascode-new-sidebar-treeview',
}

export enum Experiments {
    NewAuthUI = 'atlascode_new_auth_ui',
    AtlascodeAA = 'atlascode_aa_experiment',
}

export const ExperimentGates: Record<Experiments, ExperimentPayload> = {
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

export type FeatureGateValues = Record<Features, boolean>;
export type ExperimentGateValues = Record<Experiments, any>;
