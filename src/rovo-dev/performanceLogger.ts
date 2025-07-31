import { performanceEvent } from '../../src/analytics';
import { Container } from '../../src/container';
import { Logger } from '../../src/logger';
import Perf from '../util/perf';

export class PerformanceLogger {
    private currentSessionId: string = '';

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
        const evt = await performanceEvent('rovodev.response.timeToFirstByte', measure, {
            rovoDevSessionId: this.currentSessionId,
            rovoDevPromptId: promptId,
        });

        Logger.debug(`Event fired: rovodev.response.timeToFirstByte ${measure} ms`);
        await Container.analyticsClient.sendTrackEvent(evt);
    }

    public async promptFirstMessageReceived(promptId: string) {
        const measure = Perf.measure(promptId);
        const evt = await performanceEvent('rovodev.response.timeToFirstMessage', measure, {
            rovoDevSessionId: this.currentSessionId,
            rovoDevPromptId: promptId,
        });

        Logger.debug(`Event fired: rovodev.response.timeToFirstMessage ${measure} ms`);
        await Container.analyticsClient.sendTrackEvent(evt);
    }

    public async promptTechnicalPlanReceived(promptId: string) {
        const measure = Perf.measure(promptId);
        const evt = await performanceEvent('rovodev.response.timeToTechPlan', measure, {
            rovoDevSessionId: this.currentSessionId,
            rovoDevPromptId: promptId,
        });

        Logger.debug(`Event fired: rovodev.response.timeToTechPlan ${measure} ms`);
        await Container.analyticsClient.sendTrackEvent(evt);
    }

    public async promptLastMessageReceived(promptId: string) {
        const measure = Perf.measure(promptId);
        const evt = await performanceEvent('rovodev.response.timeToLastMessage', measure, {
            rovoDevSessionId: this.currentSessionId,
            rovoDevPromptId: promptId,
        });

        Perf.clear(promptId);

        Logger.debug(`Event fired: rovodev.response.timeToLastMessage ${measure} ms`);
        await Container.analyticsClient.sendTrackEvent(evt);
    }
}
