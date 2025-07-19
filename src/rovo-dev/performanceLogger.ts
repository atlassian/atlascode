import {
    rovoDevTimeToRespondEndEvent,
    rovoDevTimeToRespondStartEvent,
    rovoDevTimeToTechPlanReturnedEvent,
} from '../../src/analytics';
import { Container } from '../../src/container';

export class PerformanceLogger {
    private currentSessionId: string = '';

    private timeToFirstMessage: number = -1;
    private timeToTechnicalPlan: number = -1;

    public sessionStarted(sessionId: string) {
        this.currentSessionId = sessionId;
    }

    public promptStarted(promptId: string) {
        performance.mark(promptId);
    }

    public async promptFirstMessageReceived(promptId: string) {
        this.timeToFirstMessage = performance.measure(promptId).duration;

        const evt = await rovoDevTimeToRespondStartEvent(this.currentSessionId, promptId, this.timeToFirstMessage);
        await Container.analyticsClient.sendTrackEvent(evt);
    }

    public async promptTechnicalPlanReceived(promptId: string) {
        this.timeToTechnicalPlan = performance.measure(promptId).duration;

        const evt = await rovoDevTimeToTechPlanReturnedEvent(
            this.currentSessionId,
            promptId,
            this.timeToFirstMessage,
            this.timeToTechnicalPlan,
        );
        await Container.analyticsClient.sendTrackEvent(evt);
    }

    public async promptLastMessageReceived(promptId: string) {
        const timeToLastMessage = performance.measure(promptId).duration;

        const evt = await rovoDevTimeToRespondEndEvent(
            this.currentSessionId,
            promptId,
            this.timeToFirstMessage,
            this.timeToTechnicalPlan,
            timeToLastMessage,
        );
        await Container.analyticsClient.sendTrackEvent(evt);
    }
}
