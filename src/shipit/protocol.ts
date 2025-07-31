// Back of the napkin typing protocol I've wanted to try implementing for a _really_ long time
// feel free to use `any` if this is garbage :D

export type FromUI = {
    isLifeOk: {};
    pingAgg: {};
    runProcess: {
        echoText: string;
    };
    someOtherMessage: {
        data: string;
    };
};

export type ToUI = {
    isLifeOkResponse: {
        status: string;
    };
    someOtherMessage: {
        data: string;
    };
    initialize: {
        status: string;
        authenticationType: 'none' | 'api token' | 'other';
    };
    pingAggResponse: {
        status: 'ok' | 'error';
        error?: string;
        response?: any;
    };
};

//--------------
// Helper types

export type MessageFromUI = {
    [K in keyof FromUI]: { type: K } & FromUI[K];
}[keyof FromUI];

export type MessageToUI = {
    [K in keyof ToUI]: { type: K } & ToUI[K];
}[keyof ToUI];

export type FromUIHandler = Partial<{
    [K in keyof FromUI]: (message: { type: K } & FromUI[K]) => void;
}>;

export type ToUIHandler = Partial<{
    [K in keyof ToUI]: (message: { type: K } & ToUI[K]) => void;
}>;
