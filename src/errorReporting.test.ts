import { expansionCastTo } from '../testsutil';
import { registerErrorReporting, unregisterErrorReporting, registerAnalyticsClient } from './errorReporting';
import { Logger } from './logger';
import { TrackEvent } from './analytics-node-client/src/types';
import { AnalyticsClient } from './analytics-node-client/src/client.min';
import * as analytics from './analytics';

const mockAnalyticsClient = expansionCastTo<AnalyticsClient>({
    sendTrackEvent: () => Promise.reject(),
});

const builtInErrorInOverriddenErrorPropertyKey = '__atlascode_originalError';

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

    describe('Error class', () => {
        it('The built-in Error class gets overridden and restored correctly', () => {
            const builtinError = Error;
            // verifying that the built-in Error is not overridden yet
            expect(builtinError.hasOwnProperty(builtInErrorInOverriddenErrorPropertyKey)).toBeFalsy();

            registerErrorReporting();

            expect(Error).not.toBe(builtinError);

            const newError = Error;
            expect(newError.hasOwnProperty('isError')).toEqual(builtinError.hasOwnProperty('isError'));
            expect(newError.hasOwnProperty('captureStackTrace')).toEqual(
                builtinError.hasOwnProperty('captureStackTrace'),
            );
            expect(newError.hasOwnProperty('stackTraceLimit')).toEqual(builtinError.hasOwnProperty('stackTraceLimit'));

            expect(newError.hasOwnProperty(builtInErrorInOverriddenErrorPropertyKey)).toBeTruthy();
            expect((newError as any)[builtInErrorInOverriddenErrorPropertyKey]).toBe(builtinError);

            // unregister restores the original built-in Error
            unregisterErrorReporting();

            expect(Error).toBe(builtinError);
            expect(Error.hasOwnProperty(builtInErrorInOverriddenErrorPropertyKey)).toBeFalsy();
        });

        it("Error constructor with 'new' works", () => {
            registerErrorReporting();

            const error = new Error('test');

            expect(error.message).toEqual('test');
            expect(error.stack).toBeDefined();
        });

        it("Error constructor without 'new' works", () => {
            registerErrorReporting();

            const error = Error('test');

            expect(error.message).toEqual('test');
            expect(error.stack).toBeDefined();
        });

        it('Error constructors with extra params work', () => {
            registerErrorReporting();

            const error1 = new Error('test1', { cause: 'cause1' }); // with new
            const error2 = Error('test2', { cause: 'cause2' }); // without new

            expect(error1.cause).toEqual('cause1');
            expect(error2.cause).toEqual('cause2');
        });

        it("The new Error's stacktrace is correct", () => {
            const builtinErrorClass = Error;
            registerErrorReporting();
            const newErrorClass = Error;

            expect(builtinErrorClass.hasOwnProperty(builtInErrorInOverriddenErrorPropertyKey)).toBeFalsy();
            expect(newErrorClass.hasOwnProperty(builtInErrorInOverriddenErrorPropertyKey)).toBeTruthy();

            const builtInError = new builtinErrorClass('built in error');
            const newError = new newErrorClass('new error');

            expect(builtInError.stack).toBeDefined();
            expect(newError.stack).toBeDefined();

            const builtInLines = builtInError.stack!.split('\n').map((line) => line.trim());
            const newErrorLines = newError.stack!.split('\n').map((line) => line.trim());

            // first line is "Error: error message"
            expect(builtInLines[0]).toEqual(`Error: ${builtInError.message}`);
            expect(newErrorLines[0]).toEqual(`Error: ${newError.message}`);

            // the new Error adds an extra call in the stack trace due to its own constructor
            expect(newErrorLines).toHaveLength(builtInLines.length + 1);
            expect(newErrorLines[1]).toMatch(/^at new Error \(/);

            // the following line has the cursor position different, since it's called in a different line of this test
            const line = builtInLines[1].replace(/\:[\d]+\:[\d]+\)$/, '');
            expect(newErrorLines[2].startsWith(line)).toBeTruthy();

            // the rest of the stack trace should be identical
            for (let i = 2; i < builtInLines.length; ++i) {
                expect(newErrorLines[i + 1]).toEqual(builtInLines[i]);
            }
        });
    });
});
