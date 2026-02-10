import { Logger, retrieveCallerName } from 'src/logger';

import { Track, TrackEvent } from './analytics/events';
import { ExtensionApi, RovoDevEnv } from './api/extensionApi';
import { PerformanceLogger } from './performanceLogger';

// Common attributes that appear in most events
export type RovoDevCommonSessionAttributes = {
    rovoDevEnv: RovoDevEnv;
    appInstanceId: string;
    sessionId: string;
};

export type PartialEvent<T extends { action: string; subject: string; attributes: object }> = Pick<
    T,
    'action' | 'subject'
> & { attributes: Omit<T['attributes'], keyof RovoDevCommonSessionAttributes> };

// Events supported by RovoDevTelemetryProvider
// (these have common attributes: rovoDevEnv, appInstanceId, sessionId)
export type TelemetryEvent =
    | PartialEvent<Track.NewSessionAction>
    | PartialEvent<Track.PromptSent>
    | PartialEvent<Track.TechnicalPlanningShown>
    | PartialEvent<Track.FilesSummaryShown>
    | PartialEvent<Track.FileChangedAction>
    | PartialEvent<Track.StopAction>
    | PartialEvent<Track.GitPushAction>
    | PartialEvent<Track.DetailsExpanded>
    | PartialEvent<Track.CreatePrButtonClicked>
    | PartialEvent<Track.AiResultViewed>
    | PartialEvent<Track.RestartProcessAction>
    | PartialEvent<Track.RestoreSessionClicked>
    | PartialEvent<Track.ForkSessionClicked>
    | PartialEvent<Track.DeleteSessionClicked>
    | PartialEvent<Track.ReplayCompleted>;

export type TelemetryScreenEvent = 'rovoDevSessionHistoryPicker';

export class RovoDevTelemetryProvider {
    private static Instance: RovoDevTelemetryProvider | undefined = undefined;

    public static logError(ex: Error, errorMessage?: string, ...params: string[]): void {
        if (this.Instance) {
            // `retrieveCallerName` must be called from the VERY FIRST entrypoint for error logging.
            // If not, the function will return the name of a method inside Logger.
            const callerName = retrieveCallerName();
            this.Instance.logErrorInternal(ex, callerName, errorMessage, ...params);
        }
    }

    //-------------

    private _chatPromptId: string = '';
    private _chatSessionId: string = '';

    private _firedTelemetryForCurrentPrompt: Record<string, boolean> = {};
    private _extensionApi: ExtensionApi = new ExtensionApi();

    private readonly _perfLogger: PerformanceLogger;
    public get perfLogger() {
        return this._perfLogger;
    }

    /**
     * Gets the current RovoDev session ID for tracking purposes
     */
    public get sessionId(): string {
        return this._chatSessionId;
    }

    constructor(
        private readonly rovoDevEnv: RovoDevEnv,
        private readonly appInstanceId: string,
    ) {
        RovoDevTelemetryProvider.Instance = this;

        this._perfLogger = new PerformanceLogger(this.rovoDevEnv, this.appInstanceId);
    }

    public startNewSession(chatSessionId: string, source: 'init' | 'manuallyCreated' | 'restored'): Promise<void> {
        this._chatPromptId = '';
        this._chatSessionId = chatSessionId;
        this._firedTelemetryForCurrentPrompt = {};

        const telemetryPromise = this.fireTelemetryEvent({
            action: 'rovoDevNewSessionAction',
            subject: 'atlascode',
            attributes: { source },
        });

        this.perfLogger.sessionStarted(this._chatSessionId);

        return telemetryPromise;
    }

    public startNewPrompt(promptId: string) {
        this._chatPromptId = promptId;
        this._firedTelemetryForCurrentPrompt = {};
    }

    public shutdown() {
        this._chatPromptId = '';
        this._chatSessionId = '';
        this._firedTelemetryForCurrentPrompt = {};
    }

    private hasValidMetadata(event: TelemetryEvent, metadata: RovoDevCommonSessionAttributes): boolean {
        if (!metadata.sessionId) {
            this.logError(new Error('Unable to send Rovo Dev telemetry: ChatSessionId not initialized'));
            return false;
        }

        // skip promptId validation for the following events
        if (
            event.action === 'rovoDevNewSessionAction' ||
            event.action === 'rovoDevReplayCompleted' ||
            event.subject === 'rovoDevRestoreSession' ||
            event.subject === 'rovoDevForkSession' ||
            event.subject === 'rovoDevDeleteSession' ||
            event.action === 'rovoDevRestartProcessAction' ||
            !!event.attributes.promptId
        ) {
            return true;
        }

        this.logError(new Error('Unable to send Rovo Dev telemetry: PromptId not initialized'));
        return false;
    }

    private canFire(eventId: string): boolean {
        return (
            // Allow multiple firings for these events
            eventId === 'atlascode_rovoDevFileChangedAction' ||
            eventId === 'rovoDevCreatePrButton_clicked' ||
            eventId === 'atlascode_rovoDevRestartProcessAction' || // We want to log every restart attempt
            // Otherwise, only allow if not fired yet
            !this._firedTelemetryForCurrentPrompt[eventId]
        );
    }

    // This function ensures that the same telemetry event is not sent twice for the same prompt
    public async fireTelemetryEvent(event: TelemetryEvent): Promise<void> {
        const eventId = `${event.subject}_${event.action}`;

        if (!this.hasValidMetadata(event, this.metadata) || !this.canFire(eventId)) {
            return;
        }

        this._firedTelemetryForCurrentPrompt[eventId] = true;
        await this._extensionApi.analytics.sendTrackEvent({
            action: event.action,
            subject: event.subject,
            attributes: {
                ...this.metadata,
                ...event.attributes,
            },
        } as TrackEvent);

        Logger.debug(`Event fired: ${event.subject} ${event.action} (${JSON.stringify(event.attributes)})`);
    }

    public async fireScreenTelemetryEvent(screenName: TelemetryScreenEvent): Promise<void> {
        await this._extensionApi.analytics.sendScreenEvent(screenName);
    }

    public logError(ex: Error, errorMessage?: string, ...params: string[]): void {
        // `retrieveCallerName` must be called from the VERY FIRST entrypoint for error logging.
        // If not, the function will return the name of a method inside Logger.
        const callerName = retrieveCallerName();
        this.logErrorInternal(ex, callerName, errorMessage, ...params);
    }

    private logErrorInternal(
        ex: Error,
        callerName: string | undefined,
        errorMessage?: string,
        ...params: string[]
    ): void {
        Logger.rovoDevErrorInternal(ex, callerName, errorMessage, this.metadata, this._chatPromptId, ...params);
    }

    private get metadata(): RovoDevCommonSessionAttributes {
        return {
            rovoDevEnv: this.rovoDevEnv,
            appInstanceId: this.appInstanceId,
            sessionId: this._chatSessionId,
        };
    }
}
