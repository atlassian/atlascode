// All Rovo Dev analytics events and types
// TODO: generate these automatically based on external spec, ideally with descriptions as docs

export type RovoDevEnv = 'IDE' | 'Boysenberry';

export const RovodevPerformanceTags = {
    timeToFirstByte: 'api.rovodev.chat.response.timeToFirstByte',
    timeToFirstMessage: 'api.rovodev.chat.response.timeToFirstMessage',
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
            source: 'init' | 'manuallyCreated' | 'restored';
        };
    };

    export type RestartProcessAction = {
        action: 'rovoDevRestartProcessAction';
        subject: 'atlascode';
        attributes: {
            rovoDevEnv: RovoDevEnv;
            appInstanceId: string;
            sessionId: string;
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

    export type CreateLivePreviewButtonClicked = {
        action: 'rovoDevCreateLivePreviewButtonClicked';
        subject: 'atlascode';
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

    export type ReplayCompleted = {
        action: 'rovoDevReplayCompleted';
        subject: 'atlascode';
        attributes: {
            rovoDevEnv: RovoDevEnv;
            appInstanceId: string;
            sessionId: string;
            messagePartsCount: number;
        };
    };

    export type LocalServerPromptReceived = {
        action: 'rovoDevLocalServerPromptReceived';
        subject: 'atlascode';
        attributes: {
            rovoDevEnv: RovoDevEnv;
            appInstanceId: string;
            result: 'triggered' | 'agent_busy' | 'provider_not_ready' | 'error' | 'invalid_request';
        };
    };

    // --- Unified AI Analytics Events (Coding Sessions) ---
    // These events follow the unified AI event standard defined in:
    // https://hello.atlassian.net/wiki/spaces/swcde/pages/7020390994/Coding+Sessions+-+Event+Instrumentation

    /** Common attributes shared by all AI analytics events */
    export type AiCommonAttributes = {
        rovoDevEnv: RovoDevEnv;
        appInstanceId: string;
        sessionId: string;
        promptId: string;
        singleInstrumentationID: string;
        aiFeatureName: 'codingSessionsAgent';
        proactiveGeneratedAI: 0 | 1;
        userGeneratedAI: 0 | 1;
        isAIFeature: 1;
        usecaseID: 'dev-ai';
        experienceID: 'coding-sessions';
        source: 'userTriggered' | 'automationPlatform';
        interactionMode: 'standard';
    };

    /** Attributes for jiraSessionAttrs within AI events */
    export type JiraSessionAttrs = {
        automationRuleID?: string;
        sessionID: string;
        actionType?: string;
        pullRequestID?: string;
        jiraWorkItemID?: string;
        chatID?: string;
    };

    /**
     * Fired when a user initiates an AI interaction (e.g. submits a prompt or joins a session).
     * A new singleInstrumentationID should be configured for every new user request.
     */
    export type AiInteractionInitiated = {
        action: 'initiated';
        subject: 'aiInteraction';
        attributes: Omit<AiCommonAttributes, 'sessionId'> & {
            actionSubjectId: 'client' | 'server';
            jiraSessionAttrs?: JiraSessionAttrs;
        };
    };

    /**
     * Fired when the user is presented with a successful result from the AI feature.
     * Updated to align with the unified AI event standard.
     */
    export type AiResultViewed = {
        action: 'viewed';
        subject: 'aiResult';
        attributes: Omit<AiCommonAttributes, 'sessionId'> & {
            actionSubjectId: 'client' | 'server';
            dwellMs?: number;
            xid?: string;
            doesNotMeetMAUCriteria?: boolean;
            aiDwellTimeMilliSeconds?: number;
            jiraSessionAttrs?: JiraSessionAttrs;
        };
    };

    /**
     * Fired when an error occurs instead of displaying results.
     */
    export type AiResultError = {
        action: 'error';
        subject: 'aiResult';
        attributes: Omit<AiCommonAttributes, 'sessionId'> & {
            actionSubjectId: 'client' | 'server';
            aiErrorMessage: string;
            aiErrorCode: string;
            jiraSessionAttrs?: JiraSessionAttrs;
        };
    };

    /**
     * Fired when a user starts an interaction but drops off before any result is shown
     * (e.g. closes the session or navigates away).
     */
    export type AiInteractionDismissed = {
        action: 'dismissed';
        subject: 'aiInteraction';
        attributes: Omit<AiCommonAttributes, 'sessionId'> & {
            actionSubjectId: 'client';
            jiraSessionAttrs?: JiraSessionAttrs;
        };
    };

    /**
     * Fired when a user performs an action on the displayed AI result
     * (e.g. clicks commit changes, view PR, publish branch, copy code, submit follow-up).
     */
    export type AiResultActioned = {
        action: 'actioned';
        subject: 'aiResult';
        attributes: Omit<AiCommonAttributes, 'sessionId'> & {
            actionSubjectId: 'client';
            aiResultAction: string;
            jiraSessionAttrs?: JiraSessionAttrs;
        };
    };

    /**
     * Fired when a work item (PR, Jira issue, etc.) is successfully created or modified by AI.
     * This is a follow-up to the actioned event.
     */
    export type AiResultAdopted = {
        action: 'adopted';
        subject: 'aiResult';
        attributes: Omit<AiCommonAttributes, 'sessionId'> & {
            actionSubjectId: 'client';
            jiraSessionAttrs?: JiraSessionAttrs;
        };
    };

    /**
     * Fired when a user provides thumbs up/down feedback on the displayed AI results.
     */
    export type AiFeedbackSubmitted = {
        action: 'submitted';
        subject: 'aiFeedback';
        attributes: Omit<AiCommonAttributes, 'sessionId'> & {
            actionSubjectId: 'client';
            aiFeedbackResult: 'up' | 'down';
            jiraSessionAttrs?: JiraSessionAttrs;
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
    | Track.FilesSummaryShown
    | Track.FileChangedAction
    | Track.StopAction
    | Track.GitPushAction
    | Track.DetailsExpanded
    | Track.CreatePrButtonClicked
    | Track.AiResultViewed
    | Track.AiInteractionInitiated
    | Track.AiResultError
    | Track.AiInteractionDismissed
    | Track.AiResultActioned
    | Track.AiResultAdopted
    | Track.AiFeedbackSubmitted
    | Track.RestartProcessAction
    | Track.ReplayCompleted
    | Track.PerformanceEvent
    | Track.LocalServerPromptReceived;
