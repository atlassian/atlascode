// All Rovo Dev analytics events and types
// TODO: generate these automatically based on external spec, ideally with descriptions as docs

export type RovoDevEnv = 'IDE' | 'Boysenberry';

export const RovodevPerformanceTags = {
    timeToFirstByte: 'api.rovodev.chat.response.timeToFirstByte',
    timeToFirstMessage: 'api.rovodev.chat.response.timeToFirstMessage',
    timeToTechPlan: 'api.rovodev.chat.response.timeToTechPlan',
    timeToLastMessage: 'api.rovodev.chat.response.timeToLastMessage',
    timeToRender: 'ui.rovodev.chat.response.timeToRender',
} as const;

export type RovodevPerformanceTag = (typeof RovodevPerformanceTags)[keyof typeof RovodevPerformanceTags];

export type RovoDevCommonParams = {
    rovoDevEnv: RovoDevEnv;
    appInstanceId: string;
    rovoDevSessionId: string;
    rovoDevPromptId: string;
};

export namespace Track {
    export type NewSessionAction = {
        action: 'rovoDevNewSessionAction';
        subject: 'atlascode';
        attributes: {
            rovoDevEnv: RovoDevEnv;
            appInstanceId: string;
            sessionId: string;
            isManuallyCreated: boolean;
        };
    };

    export type PromptSent = {
        action: 'rovoDevPromptSent';
        subject: 'atlascode';
        attributes: {
            rovoDevEnv: RovoDevEnv;
            appInstanceId: string;
            sessionId: string;
            promptId: string;
            deepPlanEnabled: boolean;
        };
    };

    export type TechnicalPlanningShown = {
        action: 'rovoDevTechnicalPlanningShown';
        subject: 'atlascode';
        attributes: {
            rovoDevEnv: RovoDevEnv;
            appInstanceId: string;
            sessionId: string;
            promptId: string;
            stepsCount: number;
            filesCount: number;
            questionsCount: number;
        };
    };

    export type FilesSummaryShown = {
        action: 'rovoDevFilesSummaryShown';
        subject: 'atlascode';
        attributes: {
            rovoDevEnv: RovoDevEnv;
            appInstanceId: string;
            sessionId: string;
            promptId: string;
            filesCount: number;
        };
    };

    export type FileChangedAction = {
        action: 'rovoDevFileChangedAction';
        subject: 'atlascode';
        attributes: {
            rovoDevEnv: RovoDevEnv;
            appInstanceId: string;
            sessionId: string;
            promptId: string;
            action: 'undo' | 'keep';
            filesCount: number;
        };
    };

    export type StopAction = {
        action: 'rovoDevStopAction';
        subject: 'atlascode';
        attributes: {
            rovoDevEnv: RovoDevEnv;
            appInstanceId: string;
            sessionId: string;
            promptId: string;
            failed?: boolean;
        };
    };

    export type GitPushAction = {
        action: 'rovoDevGitPushAction';
        subject: 'atlascode';
        attributes: {
            rovoDevEnv: RovoDevEnv;
            appInstanceId: string;
            sessionId: string;
            promptId: string;
            prCreated: boolean;
        };
    };

    export type DetailsExpanded = {
        action: 'rovoDevDetailsExpanded';
        subject: 'atlascode';
        attributes: {
            rovoDevEnv: RovoDevEnv;
            appInstanceId: string;
            sessionId: string;
            promptId: string;
        };
    };

    export type CreatePrButtonClicked = {
        action: 'clicked';
        subject: 'rovoDevCreatePrButton';
        attributes: {
            rovoDevEnv: RovoDevEnv;
            appInstanceId: string;
            sessionId: string;
            promptId: string;
        };
    };

    export type RestoreSessionClicked = {
        action: 'clicked';
        subject: 'rovoDevRestoreSession';
        attributes: {
            rovoDevEnv: RovoDevEnv;
            appInstanceId: string;
            failed?: boolean;
        };
    };

    export type ForkSessionClicked = {
        action: 'clicked';
        subject: 'rovoDevForkSession';
        attributes: {
            rovoDevEnv: RovoDevEnv;
            appInstanceId: string;
            failed?: boolean;
        };
    };

    export type DeleteSessionClicked = {
        action: 'clicked';
        subject: 'rovoDevDeleteSession';
        attributes: {
            rovoDevEnv: RovoDevEnv;
            appInstanceId: string;
            failed?: boolean;
        };
    };

    export type AiResultViewed = {
        action: 'viewed';
        subject: 'aiResult';
        attributes: {
            rovoDevEnv: RovoDevEnv;
            appInstanceId: string;
            sessionId: string;
            promptId: string;
            dwellMs: number;
            xid: string;
            singleInstrumentationID: string;
            aiFeatureName: string;
            proactiveGeneratedAI: number;
            userGeneratedAI: number;
            isAIFeature: number;
        };
    };

    // TODO: rovodev metadata fields here are different from other events, reconcile later?
    export type PerformanceEvent = {
        action: 'performanceEvent';
        subject: 'atlascode';
        attributes: {
            tag: RovodevPerformanceTag;
            measure: number;
            rovoDevEnv: RovoDevEnv;
            appInstanceId: string;
            rovoDevSessionId: string;
            rovoDevPromptId: string;
        };
    };
}

export type TrackEvent =
    | Track.NewSessionAction
    | Track.PromptSent
    | Track.TechnicalPlanningShown
    | Track.FilesSummaryShown
    | Track.FileChangedAction
    | Track.StopAction
    | Track.GitPushAction
    | Track.DetailsExpanded
    | Track.CreatePrButtonClicked
    | Track.AiResultViewed
    | Track.PerformanceEvent;
