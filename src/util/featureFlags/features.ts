export const enum Features {
    EnableNewUriHandler = 'atlascode-enable-new-uri-handler',
    NewSidebarTreeView = 'atlascode-new-sidebar-treeview',
}

export const enum Experiments {
    NewAuthUI = 'atlascode_new_auth_ui',
    AtlascodeAA = 'atlascode_aa_experiment',
}

export const ExperimentGates: Record<Experiments, ExperimentPayload> = {
    [Experiments.NewAuthUI]: {
        parameter: 'onboardingFlow',
        defaultValue: 'control',
    },
    [Experiments.AtlascodeAA]: {
        parameter: 'isEnabled',
        defaultValue: false,
    },
};

type ExperimentPayload = { parameter: string; defaultValue: any };

export type FeatureGateValues = Record<Features, boolean>;
export type ExperimentGateValues = Record<Experiments, any>;
