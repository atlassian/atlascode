import { expansionCastTo } from '../testsutil';
import { registerErrorReporting, unregisterErrorReporting, registerAnalyticsClient } from './errorReporting';
import { Logger } from './logger';
import { TrackEvent } from './analytics-node-client/src/types';
import { AnalyticsClient } from './analytics-node-client/src/client.min';
import * as analytics from './analytics';

const mockAnalyticsClient = expansionCastTo<AnalyticsClient>({
    sendTrackEvent: () => Promise.reject(),
});

jest.mock('./analytics', () => ({
    errorEvent: () => Promise.resolve({ userId: 'id', anonymousId: 'anonId' }),
}));

describe('errorReporting', () => {
    beforeEach(() => {
        jest.spyOn(Logger, 'addListener').mockImplementation(jest.fn());
        jest.spyOn(Logger, 'removeListener').mockImplementation(jest.fn());
        jest.spyOn(process, 'addListener').mockImplementation(jest.fn());
        jest.spyOn(process, 'removeListener').mockImplementation(jest.fn());
    });

    afterEach(() => {
        unregisterErrorReporting();
        jest.restoreAllMocks();
    });

    describe('registerErrorReporting', () => {
        it('should register error handlers and replace the Error object', () => {
            registerErrorReporting();

            expect(process.addListener).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
            expect(Logger.addListener).toHaveBeenCalledWith('error', expect.any(Function));
        });

        it('should not register error handlers more than once', () => {
            registerErrorReporting();
            registerErrorReporting();

            expect(process.addListener).toHaveBeenCalledTimes(1);
            expect(Logger.addListener).toHaveBeenCalledTimes(1);
        });

        it('should unregister error handlers and restore the Error object', () => {
            registerErrorReporting();
            unregisterErrorReporting();

            expect(process.removeListener).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
            expect(Logger.removeListener).toHaveBeenCalledWith('error', expect.any(Function));
        });
    });

    describe('registerAnalyticsClient', () => {
        it('should register the analytics client and process queued events', async () => {
            const mockEvent = expansionCastTo<TrackEvent>({ userId: 'id', anonymousId: 'anonId' });

            let errorlistener: Function;

            jest.spyOn(analytics, 'errorEvent').mockResolvedValue(mockEvent);
            jest.spyOn(mockAnalyticsClient, 'sendTrackEvent').mockImplementation(jest.fn());

            (Logger.addListener as jest.Mock).mockImplementation((event, listener) => {
                errorlistener = listener;
            });

            registerErrorReporting();

            expect(errorlistener!).toBeDefined();
            errorlistener!(expansionCastTo<Error>({ message: 'Error1', stack: '@' }));

            expect(analytics.errorEvent).toHaveBeenCalled();
            expect(mockAnalyticsClient.sendTrackEvent).not.toHaveBeenCalled();

            await registerAnalyticsClient(mockAnalyticsClient);

            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledWith(mockEvent);
        });
    });
});
