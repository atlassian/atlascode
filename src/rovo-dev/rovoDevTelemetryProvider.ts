import { Track, TrackEvent } from './analytics/events';
import { ExtensionApi, RovoDevEnv } from './api/extensionApi';
import { PerformanceLogger } from './performanceLogger';
import { RovoDevLogger } from './util/rovoDevLogger';

// Common attributes that appear in most events
export type CommonSessionAttributes = {
    rovoDevEnv: RovoDevEnv;
    appInstanceId: string;
    sessionId: string;
};

export type PartialEvent<T extends { action: string; subject: string; attributes: object }> = Pick<
    T,
    'action' | 'subject'
> & { attributes: Omit<T['attributes'], keyof CommonSessionAttributes> };

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
    | PartialEvent<Track.RestoreSessionClicked>
    | PartialEvent<Track.ForkSessionClicked>
    | PartialEvent<Track.DeleteSessionClicked>
    | PartialEvent<Track.AiResultViewed>;

export type TelemetryScreenEvent = 'rovoDevSessionHistoryPicker';

export class RovoDevTelemetryProvider {
    private _chatSessionId: string = '';

    private _firedTelemetryForCurrentPrompt: Record<string, boolean> = {};
    private _extensionApi: ExtensionApi = new ExtensionApi();

    private readonly _perfLogger: PerformanceLogger;
    public get perfLogger() {
        return this._perfLogger;
    }

    constructor(
        private readonly rovoDevEnv: RovoDevEnv,
        private readonly appInstanceId: string,
        private readonly onError: (error: Error) => void,
    ) {
        this._perfLogger = new PerformanceLogger(this.rovoDevEnv, this.appInstanceId);
    }

    public startNewSession(chatSessionId: string, manuallyCreated: boolean): Promise<void> {
        this._chatSessionId = chatSessionId;
        this._firedTelemetryForCurrentPrompt = {};

        const telemetryPromise = this.fireTelemetryEvent({
            action: 'rovoDevNewSessionAction',
            subject: 'atlascode',
            attributes: { isManuallyCreated: manuallyCreated },
        });

        this.perfLogger.sessionStarted(this._chatSessionId);

        return telemetryPromise;
    }

    public startNewPrompt(promptId: string) {
        this._firedTelemetryForCurrentPrompt = {};
    }

    public shutdown() {
        this._chatSessionId = '';
        this._firedTelemetryForCurrentPrompt = {};
    }

    private hasValidMetadata(event: TelemetryEvent, metadata: CommonSessionAttributes): boolean {
        if (!metadata.sessionId) {
            this.onError(new Error('Unable to send Rovo Dev telemetry: ChatSessionId not initialized'));
            return false;
        }

        // skip promptId validation for the following events
        if (
            event.action === 'rovoDevNewSessionAction' ||
            event.subject === 'rovoDevRestoreSession' ||
            event.subject === 'rovoDevForkSession' ||
            event.subject === 'rovoDevDeleteSession' ||
            !!event.attributes.promptId
        ) {
            return true;
        }

        this.onError(new Error('Unable to send Rovo Dev telemetry: PromptId not initialized'));
        return false;
    }

    private canFire(eventId: string): boolean {
        return (
            // Allow multiple firings for these events
            eventId === 'atlascode_rovoDevFileChangedAction' ||
            eventId === 'rovoDevCreatePrButton_clicked' ||
            // Otherwise, only allow if not fired yet
            !this._firedTelemetryForCurrentPrompt[eventId]
        );
    }

    // This function ensures that the same telemetry event is not sent twice for the same prompt
    async fireTelemetryEvent(event: TelemetryEvent): Promise<void> {
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

        RovoDevLogger.debug(`Event fired: ${event.subject} ${event.action} (${JSON.stringify(event.attributes)})`);
    }

    async fireScreenTelemetryEvent(screenName: TelemetryScreenEvent): Promise<void> {
        await this._extensionApi.analytics.sendScreenEvent(screenName);
    }

    private get metadata(): CommonSessionAttributes {
        return {
            rovoDevEnv: this.rovoDevEnv,
            appInstanceId: this.appInstanceId,
            sessionId: this._chatSessionId,
        };
    }
}
