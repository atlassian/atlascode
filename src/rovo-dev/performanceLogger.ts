import { Logger } from 'src/logger';

import Perf from '../util/perf';
import { RovoDevEnv, RovodevPerformanceTag } from './analytics/events';
import { ExtensionApi } from './api/extensionApi';

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

    private async fireEvent(tag: RovodevPerformanceTag, measure: number, promptId: string): Promise<void> {
        await this.extensionApi.analytics.sendTrackEvent({
            action: 'performanceEvent',
            subject: 'atlascode',
            attributes: {
                tag,
                measure,
                rovoDevEnv: this.rovoDevEnv,
                appInstanceId: this.appInstanceId,
                rovoDevSessionId: this.currentSessionId,
                rovoDevPromptId: promptId,
            },
        });
        Logger.debug(`Event fired: ${tag} ${measure} ms`);
    }

    public async promptFirstByteReceived(promptId: string) {
        const measure = Perf.measure(promptId);
        await this.fireEvent('api.rovodev.chat.response.timeToFirstByte', measure, promptId);
    }

    public async promptFirstMessageReceived(promptId: string) {
        const measure = Perf.measure(promptId);
        await this.fireEvent('api.rovodev.chat.response.timeToFirstMessage', measure, promptId);
    }

    public async promptTechnicalPlanReceived(promptId: string) {
        const measure = Perf.measure(promptId);
        await this.fireEvent('api.rovodev.chat.response.timeToTechPlan', measure, promptId);
    }

    public async promptLastMessageReceived(promptId: string) {
        const measure = Perf.measure(promptId);
        Perf.clear(promptId);
        await this.fireEvent('api.rovodev.chat.response.timeToLastMessage', measure, promptId);
    }

    public async promptLastMessageRendered(promptId: string, renderTime: number) {
        await this.fireEvent('ui.rovodev.chat.response.timeToRender', renderTime, promptId);
    }
}
