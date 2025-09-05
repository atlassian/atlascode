import { Container } from 'src/container';
import { Logger } from 'src/logger';

import {
    rovoDevDetailsExpandedEvent,
    RovoDevEnv,
    rovoDevFileChangedActionEvent,
    rovoDevFilesSummaryShownEvent,
    rovoDevGitPushActionEvent,
    rovoDevNewSessionActionEvent,
    rovoDevPromptSentEvent,
    rovoDevStopActionEvent,
    rovoDevTechnicalPlanningShownEvent,
} from '../../src/analytics';
import { PerformanceLogger } from './performanceLogger';

const rovoDevTelemetryEvents = {
    rovoDevFileChangedActionEvent,
    rovoDevFilesSummaryShownEvent,
    rovoDevGitPushActionEvent,
    rovoDevNewSessionActionEvent,
    rovoDevPromptSentEvent,
    rovoDevStopActionEvent,
    rovoDevTechnicalPlanningShownEvent,
    rovoDevDetailsExpandedEvent,
};

type ParametersSkip3<T extends (...args: any) => any> =
    // eslint-disable-next-line no-unused-vars
    Parameters<T> extends [infer _1, infer _2, infer _3, ...infer Rest] ? Rest : never;

type TelemetryFunction = keyof typeof rovoDevTelemetryEvents;

type TelemetryRecord<T> = {
    [x in TelemetryFunction]?: T;
};

export class RovoDevTelemetryProvider {
    private readonly isDebugging = Container.isDebugging;

    private _chatSessionId: string = '';
    private _currentPromptId: string = '';

    private _firedTelemetryForCurrentPrompt: TelemetryRecord<boolean> = {};

    private readonly _perfLogger: PerformanceLogger;
    public get perfLogger() {
        return this._perfLogger;
    }

    constructor(
        private readonly rovoDevEnv: RovoDevEnv,
        private readonly appInstanceId: string,
    ) {
        this._perfLogger = new PerformanceLogger(this.appInstanceId);
    }

    public startNewSession(chatSessionId: string, manuallyCreated: boolean) {
        this._chatSessionId = chatSessionId;
        this._currentPromptId = '';
        this._firedTelemetryForCurrentPrompt = {};

        this.fireTelemetryEvent('rovoDevNewSessionActionEvent', manuallyCreated);

        this.perfLogger.sessionStarted(this._chatSessionId);
    }

    public startNewPrompt(promptId: string) {
        this._currentPromptId = promptId;
        this._firedTelemetryForCurrentPrompt = {};
    }

    public shutdown() {
        this._chatSessionId = '';
        this._currentPromptId = '';
        this._firedTelemetryForCurrentPrompt = {};
    }

    // This function esures that the same telemetry event is not sent twice for the same prompt
    public fireTelemetryEvent<T extends TelemetryFunction>(
        funcName: T,
        ...params: ParametersSkip3<(typeof rovoDevTelemetryEvents)[T]>
    ): void {
        if (!this._chatSessionId) {
            const error = new Error('Unable to send Rovo Dev telemetry: ChatSessionId not initialized');
            if (this.isDebugging) {
                throw error;
            } else {
                Logger.error(error);
                return;
            }
        }
        // rovoDevNewSessionActionEvent is the only event that doesn't need the promptId
        if (funcName !== 'rovoDevNewSessionActionEvent' && !this._currentPromptId) {
            const error = new Error('Unable to send Rovo Dev telemetry: PromptId not initialized');
            if (this.isDebugging) {
                throw error;
            } else {
                Logger.error(error);
                return;
            }
        }

        // the following events can be fired multiple times during the same prompt
        delete this._firedTelemetryForCurrentPrompt['rovoDevFileChangedActionEvent'];

        if (!this._firedTelemetryForCurrentPrompt[funcName]) {
            this._firedTelemetryForCurrentPrompt[funcName] = true;

            // add `rovoDevEnv` and `sessionId` as the first two arguments
            params.unshift(this.rovoDevEnv, this.appInstanceId, this._chatSessionId);

            const ret: ReturnType<(typeof rovoDevTelemetryEvents)[T]> = rovoDevTelemetryEvents[funcName].apply(
                undefined,
                params,
            );
            ret.then((evt) => Container.analyticsClient.sendTrackEvent(evt));

            Logger.debug(`Event fired: ${funcName}(${params})`);
        }
    }
}
