import { expansionCastTo } from 'testsutil';
import { Disposable } from 'vscode';

import * as analytics from './analytics';
import { AnalyticsClient } from './analytics-node-client/src/client.min';
import { TrackEvent } from './analytics-node-client/src/types';
import { registerAnalyticsClient, registerErrorReporting, unregisterErrorReporting } from './errorReporting';
import { ErrorEvent, Logger } from './logger';

const mockAnalyticsClient = expansionCastTo<AnalyticsClient>({
    sendTrackEvent: () => Promise.reject(),
});

const createError = (message: string, stack?: string) => {
    const error = new Error();
    error.message = message;
    error.stack = stack || '@';
    return error;
};

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
        jest.clearAllMocks();
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

            jest.spyOn(analytics, 'errorEvent').mockResolvedValue(mockEvent);
            jest.spyOn(mockAnalyticsClient, 'sendTrackEvent').mockImplementation(jest.fn());

            let errorlistener: (data: ErrorEvent) => void;
            (Logger.onError as jest.Mock).mockImplementation((listener) => {
                errorlistener = listener;
            });

            registerErrorReporting();

            expect(errorlistener!).toBeDefined();
            errorlistener!({ error: createError('Error1') });

            expect(analytics.errorEvent).toHaveBeenCalled();
            expect(mockAnalyticsClient.sendTrackEvent).not.toHaveBeenCalled();

            await registerAnalyticsClient(mockAnalyticsClient);

            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledWith(mockEvent);
        });
    });

    describe('errorEvent arguments', () => {
        let errorlistener: (data: ErrorEvent) => void;
        let uncaughtExceptionListener: Function;
        let uncaughtExceptionMonitorListener: Function;
        let unhandledRejectionListener: Function;

        beforeEach(() => {
            const mockEvent = expansionCastTo<TrackEvent>({ userId: 'id', anonymousId: 'anonId' });

            jest.spyOn(analytics, 'errorEvent').mockResolvedValue(mockEvent);
            jest.spyOn(mockAnalyticsClient, 'sendTrackEvent').mockImplementation(jest.fn());

            (Logger.onError as jest.Mock).mockImplementation((listener) => {
                errorlistener = listener;
            });

            (process.addListener as jest.Mock).mockImplementation((name, listener) => {
                switch (name) {
                    case 'uncaughtException':
                        uncaughtExceptionListener = listener;
                        break;
                    case 'uncaughtExceptionMonitor':
                        uncaughtExceptionMonitorListener = listener;
                        break;
                    case 'unhandledRejection':
                        unhandledRejectionListener = listener;
                        break;
                }
            });

            registerErrorReporting();
        });

        describe('when error is of type Error', () => {
            it('no extra params', () => {
                const error = createError('Error1');
                errorlistener!({ error });

                expect(analytics.errorEvent).toHaveBeenCalledWith(
                    undefined,
                    error.message,
                    error,
                    undefined,
                    undefined,
                );
            });

            it('with capturedBy', () => {
                const error = createError('Error1');
                errorlistener!({ error, capturedBy: 'foo' });

                expect(analytics.errorEvent).toHaveBeenCalledWith(undefined, error.message, error, 'foo', undefined);
            });

            it('with productArea', () => {
                const error = createError('Error1');
                errorlistener!({ error, productArea: 'RovoDev' });

                expect(analytics.errorEvent).toHaveBeenCalledWith(
                    'RovoDev',
                    error.message,
                    error,
                    undefined,
                    undefined,
                );
            });

            it('with a custom message', () => {
                const error = createError('Error1');
                errorlistener!({ error, errorMessage: "what's this" });

                expect(analytics.errorEvent).toHaveBeenCalledWith(
                    undefined,
                    "what's this",
                    error,
                    undefined,
                    undefined,
                );
            });

            it('with a custom message and capturedBy', () => {
                const error = createError('Error1');
                errorlistener!({ error, errorMessage: "what's this", capturedBy: 'fii' });

                expect(analytics.errorEvent).toHaveBeenCalledWith(undefined, "what's this", error, 'fii', undefined);
            });

            it('with productArea, custom message, and capturedBy', () => {
                const error = createError('Error1');
                errorlistener!({ error, errorMessage: "what's this", capturedBy: 'fii', productArea: 'RovoDev' });

                expect(analytics.errorEvent).toHaveBeenCalledWith('RovoDev', "what's this", error, 'fii', undefined);
            });

            it('with a single param', () => {
                const error = createError('Error1');
                const params = ['single param'];
                errorlistener!({ error, params });

                expect(analytics.errorEvent).toHaveBeenCalledWith(
                    undefined,
                    error.message,
                    error,
                    undefined,
                    'single param',
                );
            });

            it('with multiple params', () => {
                const error = createError('Error1');
                const params = ['param one', 'param two'];
                errorlistener!({ error, params });

                expect(analytics.errorEvent).toHaveBeenCalledWith(
                    undefined,
                    error.message,
                    error,
                    undefined,
                    JSON.stringify(params),
                );
            });

            it('with empty params', () => {
                const error = createError('Error1');
                const params = [] as string[];
                errorlistener!({ error, params });

                expect(analytics.errorEvent).toHaveBeenCalledWith(
                    undefined,
                    error.message,
                    error,
                    undefined,
                    undefined,
                );
            });

            it('captured by uncaughtException', () => {
                const error = createError('Error1', '/.vscode/extensions/atlassian.atlascode-');
                uncaughtExceptionListener(error);

                expect(analytics.errorEvent).toHaveBeenCalledWith(
                    undefined,
                    error.message,
                    error,
                    'NodeJS.uncaughtException',
                    undefined,
                );
            });

            it('captured by uncaughtExceptionMonitor', () => {
                const error = createError('Error1', '/.vscode/extensions/atlassian.atlascode-');
                uncaughtExceptionMonitorListener(error);

                expect(analytics.errorEvent).toHaveBeenCalledWith(
                    undefined,
                    error.message,
                    error,
                    'NodeJS.uncaughtExceptionMonitor',
                    undefined,
                );
            });

            it('captured by unhandledRejection', () => {
                const error = createError('Error1', '/.vscode/extensions/atlassian.atlascode-');
                unhandledRejectionListener(error);

                expect(analytics.errorEvent).toHaveBeenCalledWith(
                    undefined,
                    error.message,
                    error,
                    'NodeJS.unhandledRejection',
                    undefined,
                );
            });
        });

        describe('when error is of string type', () => {
            it('no extra params', () => {
                errorlistener!({ error: 'Error1' as any });

                expect(analytics.errorEvent).toHaveBeenCalledWith(undefined, 'Error1', undefined, undefined, undefined);
            });

            it('with capturedBy', () => {
                errorlistener!({ error: 'Error1' as any, capturedBy: 'foo' });

                expect(analytics.errorEvent).toHaveBeenCalledWith(undefined, 'Error1', undefined, 'foo', undefined);
            });

            it('with a custom message', () => {
                errorlistener!({ error: 'Seg fault' as any, errorMessage: 'Error reading stream buffer' });

                expect(analytics.errorEvent).toHaveBeenCalledWith(
                    undefined,
                    'Error reading stream buffer: Seg fault',
                    undefined,
                    undefined,
                    undefined,
                );
            });
        });
    });
});
