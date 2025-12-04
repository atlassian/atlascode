import { RovodevAnalyticsApi } from './rovodevAnalyticsApi';

jest.mock('src/container', () => ({
    Container: {
        analyticsClient: {
            sendTrackEvent: jest.fn(),
        },
    },
}));
jest.mock('src/analytics', () => ({
    trackEvent: jest.fn((action, subject, attributes) => ({
        action,
        subject,
        ...attributes,
    })),
}));

import { Container } from 'src/container';

describe('Rovodev Analytics API', () => {
    it('should send track event through Container', async () => {
        const analyticsApi = new RovodevAnalyticsApi();
        const mockEvent = { action: 'action', subject: 'subject', attributes: { abc: '123' } };
        await analyticsApi.sendTrackEvent(mockEvent as any);

        expect(Container.analyticsClient.sendTrackEvent).toHaveBeenCalledWith(mockEvent);
    });
});
