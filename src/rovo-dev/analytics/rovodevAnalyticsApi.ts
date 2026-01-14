import { trackEvent, viewScreenEvent } from 'src/analytics';
import { ProductRovoDev } from 'src/atlclients/authInfo';
import { Container } from 'src/container';

import { TrackEvent } from './events';

export class RovodevAnalyticsApi {
    sendTrackEvent = async (event: TrackEvent) => {
        const finalizedEvent = await trackEvent(event.action, event.subject, { attributes: event.attributes });
        await Container.analyticsClient.sendTrackEvent(finalizedEvent);
    };

    sendScreenEvent = async (screenName: string) => {
        const finalizedEvent = await viewScreenEvent(screenName, undefined, ProductRovoDev);
        await Container.analyticsClient.sendScreenEvent(finalizedEvent);
        await Container.analyticsClient.sendScreenEvent(finalizedEevent);
    };
}
