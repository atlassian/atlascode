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

    /**
     * Closed enum for `PromptCompleted.attributes.result`.
     *
     * Values outside this set will be dropped by the Boysenberry → Jira analytics
     * bridge, so this MUST be kept aligned with the bridge spec. Add new values
     * via a coordinated change on both sides.
     */
    export type PromptCompletedResult = 'success' | 'error' | 'cancelled' | 'timeout' | 'parse_error';

    /**
     * Closed enum for `PromptCompleted.attributes.errorReason`.
     *
     * Only present when `result !== 'success'`. Values outside this set will be
     * dropped by the bridge. Add new values via a coordinated change.
     */
    export type PromptCompletedErrorReason =
        | 'stream_exception' // event_kind: 'exception' arrived in the response stream
        | 'parsing_error' // event_kind: '_parsing_error'
        | 'network_error' // fetch / reader threw
        | 'http_4xx' // local-server returned 4xx (excluding 401/403 which short-circuit to login)
        | 'http_5xx' // local-server returned 5xx
        | 'aborted' // user pressed stop, OR new prompt aborted in-flight
        | 'no_response' // stream ended without any user-visible message parts
        | 'unknown'; // catch-all when the cause cannot be classified

    /**
     * Emitted exactly once per user-submitted prompt as the terminal outcome of
     * the chat-streaming flow. Used to drive the chat-response SLO downstream
     * (success rate = count(result='success') / count(all results)).
     *
     * Invariants:
     *   - Exactly-once per `promptId`.
     *   - `result: 'success'` implies at least one user-visible message part was rendered.
     *   - Never emitted for the `replay` streaming path.
     */
    export type PromptCompleted = {
        action: 'rovoDevPromptCompleted';
        subject: 'atlascode';
        attributes: {
            rovoDevEnv: RovoDevEnv;
            appInstanceId: string;
            sessionId: string;
            promptId: string;
            result: PromptCompletedResult;
            /** Only present when `result !== 'success'`. */
            errorReason?: PromptCompletedErrorReason;
            /** Optional: HTTP status when the error was an HTTP-layer failure. */
            httpStatus?: number;
            /** Optional: number of user-visible message parts processed in the stream. */
            messagePartsCount?: number;
        };
    };

    // TODO: rovodev metadata fields here are different from other events, reconcile later?
    /**
     * Closed enum for `PromptWarning.attributes.reason`.
     *
     * Values outside this set will be dropped by the Boysenberry → Jira
     * analytics bridge. Add new values via a coordinated change on both sides.
     */
    export type PromptWarningReason = 'rate_limit';

    /**
     * Emitted when a non-terminal `warning` event is surfaced to the user during
     * the chat-streaming flow. Unlike `PromptCompleted`, this is NOT a terminal
     * outcome — the agent continues (and typically auto-retries) afterwards, so
     * it can fire multiple times for the same `promptId`.
     *
     * Currently only emitted for rate-limit warnings (`reason: 'rate_limit'`),
     * which surface as "Rate limit exceeded / We'll try again in N seconds".
     * Used downstream to measure how often users are rate-limited mid-prompt.
     *
     * Boysenberry-only: there is no consumer for this event in the standard IDE.
     */
    export type PromptWarning = {
        action: 'rovoDevPromptWarning';
        subject: 'atlascode';
        attributes: {
            rovoDevEnv: RovoDevEnv;
            appInstanceId: string;
            sessionId: string;
            promptId: string;
            reason: PromptWarningReason;
            /** Optional: the warning title shown to the user, e.g. "Rate limit exceeded". */
            title?: string;
        };
    };

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
    | Track.RestartProcessAction
    | Track.ReplayCompleted
    | Track.PerformanceEvent
    | Track.LocalServerPromptReceived
    | Track.PromptCompleted
    | Track.PromptWarning;
