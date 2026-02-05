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
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should send track event through Container', async () => {
        const analyticsApi = new RovodevAnalyticsApi();
        const mockEvent = { action: 'action', subject: 'subject', attributes: { abc: '123' } };
        await analyticsApi.sendTrackEvent(mockEvent as any);

        expect(Container.analyticsClient.sendTrackEvent).toHaveBeenCalledWith(mockEvent);
    });

    it('should send error event through Container', async () => {
        const analyticsApi = new RovodevAnalyticsApi();
        const mockErrorEvent = {
            action: 'rovoDevError' as const,
            subject: 'atlascode' as const,
            attributes: {
                rovoDevEnv: 'Boysenberry' as const,
                appInstanceId: 'test-instance',
                sessionId: 'test-session',
                promptId: 'test-prompt',
                errorType: 'TestError',
                errorMessage: 'Test error message',
                errorContext: 'chatProvider',
                isRetriable: true,
                isProcessTerminated: false,
            },
        };
        await analyticsApi.sendErrorEvent(mockErrorEvent);

        expect(Container.analyticsClient.sendTrackEvent).toHaveBeenCalledWith({
            action: 'rovoDevError',
            subject: 'atlascode',
            attributes: mockErrorEvent.attributes,
        });
    });
});
