import {
    rovoDevTimeToRespondEndEvent,
    rovoDevTimeToRespondStartEvent,
    rovoDevTimeToTechPlanReturnedEvent,
} from '../../src/analytics';
import { Container } from '../../src/container';
import { Logger } from '../../src/logger';
import Perf from '../util/perf';

export class PerformanceLogger {
    private currentSessionId: string = '';

    private timeToFirstMessage: number = -1;
    private timeToTechnicalPlan: number = -1;

    public sessionStarted(sessionId: string) {
        this.currentSessionId = sessionId;
    }

    public promptStarted(promptId: string) {
        Perf.mark(promptId);
    }

    public async promptFirstMessageReceived(promptId: string) {
        this.timeToFirstMessage = Perf.measure(promptId);

        const evt = await rovoDevTimeToRespondStartEvent(this.currentSessionId, promptId, this.timeToFirstMessage);

        Logger.debug(`Event fired: rovoDevTimeToRespondStartEvent ${this.timeToFirstMessage} ms`);
        await Container.analyticsClient.sendTrackEvent(evt);
    }

    public async promptTechnicalPlanReceived(promptId: string) {
        this.timeToTechnicalPlan = Perf.measure(promptId);

        const evt = await rovoDevTimeToTechPlanReturnedEvent(
            this.currentSessionId,
            promptId,
            this.timeToFirstMessage,
            this.timeToTechnicalPlan,
        );

        Logger.debug(
            `Event fired: rovoDevTimeToTechPlanReturnedEvent ${this.timeToFirstMessage} ms ${this.timeToTechnicalPlan} ms`,
        );
        await Container.analyticsClient.sendTrackEvent(evt);
    }

    public async promptLastMessageReceived(promptId: string) {
        const timeToLastMessage = Perf.measure(promptId);
        Perf.clear(promptId);

        const evt = await rovoDevTimeToRespondEndEvent(
            this.currentSessionId,
            promptId,
            this.timeToFirstMessage,
            this.timeToTechnicalPlan,
            timeToLastMessage,
        );

        Logger.debug(
            `Event fired: rovoDevTimeToRespondEndEvent ${this.timeToFirstMessage} ms ${this.timeToTechnicalPlan} ms ${timeToLastMessage} ms`,
        );
        await Container.analyticsClient.sendTrackEvent(evt);
    }
}
