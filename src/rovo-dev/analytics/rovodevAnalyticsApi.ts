import { trackEvent } from 'src/analytics';
import { Container } from 'src/container';

import { TrackEvent } from './events';

export class RovodevAnalyticsApi {
    sendTrackEvent = async (event: TrackEvent) => {
        const finalizedEvent = await trackEvent(event.action, event.subject, { attributes: event.attributes });
        await Container.analyticsClient.sendTrackEvent(finalizedEvent);
    };
}
