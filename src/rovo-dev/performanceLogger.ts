import Perf from '../util/perf';
import { RovoDevEnv } from './analytics/rovodevAnalyticsTypes';
import { ExtensionApi } from './api/extensionApi';
import { RovoDevLogger } from './util/rovoDevLogger';

export class PerformanceLogger {
    private currentSessionId: string = '';
    private extensionApi = new ExtensionApi();

    constructor(
        private readonly rovoDevEnv: RovoDevEnv,
        private readonly appInstanceId: string,
    ) {}

    public sessionStarted(sessionId: string) {
        this.currentSessionId = sessionId;
    }

    public promptStarted(promptId: string) {
        if (!this.currentSessionId) {
            throw new Error('Session not started');
        }

        Perf.mark(promptId);
    }

    public async promptFirstByteReceived(promptId: string) {
        const measure = Perf.measure(promptId);
        const evt = await this.extensionApi.analytics.performanceEvent(
            'api.rovodev.chat.response.timeToFirstByte',
            measure,
            {
                rovoDevEnv: this.rovoDevEnv,
                appInstanceId: this.appInstanceId,
                rovoDevSessionId: this.currentSessionId,
                rovoDevPromptId: promptId,
            },
        );

        RovoDevLogger.debug(`Event fired: rovodev.response.timeToFirstByte ${measure} ms`);
        await this.extensionApi.analytics.sendTrackEvent(evt);
    }

    public async promptFirstMessageReceived(promptId: string) {
        const measure = Perf.measure(promptId);
        const evt = await this.extensionApi.analytics.performanceEvent(
            'api.rovodev.chat.response.timeToFirstMessage',
            measure,
            {
                rovoDevEnv: this.rovoDevEnv,
                appInstanceId: this.appInstanceId,
                rovoDevSessionId: this.currentSessionId,
                rovoDevPromptId: promptId,
            },
        );

        RovoDevLogger.debug(`Event fired: rovodev.response.timeToFirstMessage ${measure} ms`);
        await this.extensionApi.analytics.sendTrackEvent(evt);
    }

    public async promptTechnicalPlanReceived(promptId: string) {
        const measure = Perf.measure(promptId);
        const evt = await this.extensionApi.analytics.performanceEvent(
            'api.rovodev.chat.response.timeToTechPlan',
            measure,
            {
                rovoDevEnv: this.rovoDevEnv,
                appInstanceId: this.appInstanceId,
                rovoDevSessionId: this.currentSessionId,
                rovoDevPromptId: promptId,
            },
        );

        RovoDevLogger.debug(`Event fired: rovodev.response.timeToTechPlan ${measure} ms`);
        await this.extensionApi.analytics.sendTrackEvent(evt);
    }

    public async promptLastMessageReceived(promptId: string) {
        const measure = Perf.measure(promptId);
        const evt = await this.extensionApi.analytics.performanceEvent(
            'api.rovodev.chat.response.timeToLastMessage',
            measure,
            {
                rovoDevEnv: this.rovoDevEnv,
                appInstanceId: this.appInstanceId,
                rovoDevSessionId: this.currentSessionId,
                rovoDevPromptId: promptId,
            },
        );

        Perf.clear(promptId);

        RovoDevLogger.debug(`Event fired: rovodev.response.timeToLastMessage ${measure} ms`);
        await this.extensionApi.analytics.sendTrackEvent(evt);
    }
}
