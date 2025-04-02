import { expansionCastTo } from '../testsutil';
import { registerErrorReporting, unregisterErrorReporting, registerAnalyticsClient } from './errorReporting';
import { Logger } from './logger';
import { TrackEvent } from './analytics-node-client/src/types';
import { AnalyticsClient } from './analytics-node-client/src/client.min';
import { Disposable } from 'vscode';
import * as analytics from './analytics';

const mockAnalyticsClient = expansionCastTo<AnalyticsClient>({
    sendTrackEvent: () => Promise.reject(),
});

jest.mock('./analytics', () => ({
    errorEvent: () => Promise.resolve({ userId: 'id', anonymousId: 'anonId' }),
}));

describe('errorReporting', () => {
    beforeEach(() => {
        jest.spyOn(Logger, 'onError').mockImplementation(jest.fn());
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
            expect(process.addListener).toHaveBeenCalledWith('uncaughtExceptionMonitor', expect.any(Function));
            expect(process.addListener).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
            expect(Logger.onError).toHaveBeenCalled();
        });

        it('should not register error handlers more than once', () => {
            registerErrorReporting();
            registerErrorReporting();

            expect(process.addListener).toHaveBeenCalledTimes(3);
            expect(Logger.onError).toHaveBeenCalledTimes(1);
        });

        it('should unregister error handlers and restore the Error object', () => {
            const eventRegistrationObj: Disposable = { dispose: () => {} };
            (Logger.onError as jest.Mock).mockReturnValue(eventRegistrationObj);

            jest.spyOn(eventRegistrationObj, 'dispose');

            registerErrorReporting();
            unregisterErrorReporting();

            expect(process.removeListener).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
            expect(process.removeListener).toHaveBeenCalledWith('uncaughtExceptionMonitor', expect.any(Function));
            expect(process.removeListener).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
            expect(eventRegistrationObj.dispose).toHaveBeenCalled();
        });
    });

    describe('registerAnalyticsClient', () => {
        it('should register the analytics client and process queued events', async () => {
            const mockEvent = expansionCastTo<TrackEvent>({ userId: 'id', anonymousId: 'anonId' });

            let errorlistener: Function;

            jest.spyOn(analytics, 'errorEvent').mockResolvedValue(mockEvent);
            jest.spyOn(mockAnalyticsClient, 'sendTrackEvent').mockImplementation(jest.fn());

            (Logger.onError as jest.Mock).mockImplementation((listener) => {
                errorlistener = listener;
            });

            registerErrorReporting();

            expect(errorlistener!).toBeDefined();
            errorlistener!({ error: expansionCastTo<Error>({ message: 'Error1', stack: '@' }) });

            expect(analytics.errorEvent).toHaveBeenCalled();
            expect(mockAnalyticsClient.sendTrackEvent).not.toHaveBeenCalled();

            await registerAnalyticsClient(mockAnalyticsClient);

            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledWith(mockEvent);
        });
    });
});
