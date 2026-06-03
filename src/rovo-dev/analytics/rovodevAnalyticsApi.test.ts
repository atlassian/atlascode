import { commands } from 'vscode';

import { RovodevAnalyticsApi } from './rovodevAnalyticsApi';

jest.mock('src/container', () => ({
    Container: {
        analyticsClient: {
            sendTrackEvent: jest.fn(),
            sendScreenEvent: jest.fn(),
        },
        isBoysenberryMode: false,
    },
}));
jest.mock('src/analytics', () => ({
    trackEvent: jest.fn((action, subject, attributes) => ({
        action,
        subject,
        ...attributes,
    })),
    viewScreenEvent: jest.fn((screenName) => ({
        screenName,
    })),
}));

import { Container } from 'src/container';

describe('Rovodev Analytics API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (Container as any).isBoysenberryMode = false;
    });

    it('should send track event through Container', async () => {
        const analyticsApi = new RovodevAnalyticsApi();
        const mockEvent = { action: 'action', subject: 'subject', attributes: { abc: '123' } };
        await analyticsApi.sendTrackEvent(mockEvent as any);

        expect(Container.analyticsClient.sendTrackEvent).toHaveBeenCalledWith(mockEvent);
    });

    it('should NOT forward track event to VSCode bridge when not in Boysenberry mode', async () => {
        (Container as any).isBoysenberryMode = false;

        const analyticsApi = new RovodevAnalyticsApi();
        const mockEvent = { action: 'action', subject: 'subject', attributes: { abc: '123' } };
        await analyticsApi.sendTrackEvent(mockEvent as any);

        expect(commands.executeCommand).not.toHaveBeenCalledWith(
            'workbench.action.sendAnalyticsEvent',
            expect.anything(),
        );
    });

    it('should forward track event to VSCode bridge when in Boysenberry mode', async () => {
        (Container as any).isBoysenberryMode = true;

        const analyticsApi = new RovodevAnalyticsApi();
        const mockEvent = { action: 'action', subject: 'subject', attributes: { abc: '123' } };
        await analyticsApi.sendTrackEvent(mockEvent as any);

        expect(Container.analyticsClient.sendTrackEvent).toHaveBeenCalledWith(mockEvent);
        expect(commands.executeCommand).toHaveBeenCalledWith('workbench.action.sendAnalyticsEvent', {
            eventType: 'track',
            event: {
                action: 'action',
                subject: 'subject',
                attributes: { abc: '123' },
            },
        });
    });

    it('should forward screen event to VSCode bridge when in Boysenberry mode', async () => {
        (Container as any).isBoysenberryMode = true;

        const analyticsApi = new RovodevAnalyticsApi();
        await analyticsApi.sendScreenEvent('myScreen');

        expect(Container.analyticsClient.sendScreenEvent).toHaveBeenCalled();
        expect(commands.executeCommand).toHaveBeenCalledWith('workbench.action.sendAnalyticsEvent', {
            eventType: 'screen',
            event: {
                action: 'viewed',
                subject: 'myScreen',
            },
        });
    });

    it('should not throw when the VSCode bridge command fails', async () => {
        (Container as any).isBoysenberryMode = true;
        (commands.executeCommand as jest.Mock).mockRejectedValueOnce(new Error('bridge unavailable'));

        const analyticsApi = new RovodevAnalyticsApi();
        const mockEvent = { action: 'action', subject: 'subject', attributes: { abc: '123' } };

        await expect(analyticsApi.sendTrackEvent(mockEvent as any)).resolves.not.toThrow();
        expect(Container.analyticsClient.sendTrackEvent).toHaveBeenCalledWith(mockEvent);
    });
});
