import { TrackEvent } from './analytics-node-client/src/types';
import { errorEvent } from './analytics';
import { Logger } from './logger';
import { AnalyticsClient } from './analytics-node-client/src/client.min';

let nodeJsErrorReportingRegistered = false;
let analyticsClientRegistered = false;

let analyticsClient: AnalyticsClient | undefined;
let eventQueue: Promise<TrackEvent>[] | undefined = [];

function errorHandler(error: Error): void {
    try {
        if (error.hasOwnProperty('__atlascode_logged')) {
            return;
        }
        (error as any).__atlascode_logged = true;

        Logger.debug('[ERROR]', error);

        const event = errorEvent(error);

        if (analyticsClient) {
            event.then((e) => analyticsClient!.sendTrackEvent(e));
        } else {
            eventQueue!.push(event);
        }
    } catch {}
}

const builtInErrorInOverriddenErrorPropertyKey = '__atlascode_originalError';

function replaceJavascriptErrorObject() {
    // if we are calling this twice, probably it's because the extension got upgraded and it's re-initializing.
    // we need to retrieve the original Error and re-create another override
    const originalError = Error.hasOwnProperty(builtInErrorInOverriddenErrorPropertyKey)
        ? ((Error as any)[builtInErrorInOverriddenErrorPropertyKey] as ErrorConstructor)
        : Error;

    const tmp = class Error extends originalError {
        constructor(message?: string, ...args: any[]) {
            super(message, ...args);

            // for Errors created in the wild, we filter for the string `atlascode` to avoid noise
            if (message && message.includes('atlascode')) {
                errorHandler(this as any);
            }
        }
    };

    // this because Error can be invoked with or without 'new' to create a new instance of it
    // ref: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Error
    Error = function (...args) {
        return new tmp(...args);
    } as ErrorConstructor;

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/captureStackTrace
    if (originalError.hasOwnProperty('captureStackTrace')) {
        Error.captureStackTrace = originalError.captureStackTrace;
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/isError
    if (originalError.hasOwnProperty('isError')) {
        (Error as any).isError = (originalError as any).isError;
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/stackTraceLimit
    if (originalError.hasOwnProperty('stackTraceLimit')) {
        Object.defineProperty(Error, 'stackTraceLimit', {
            get: () => originalError.stackTraceLimit,
            set: (value: number) => (originalError.stackTraceLimit = value),
            enumerable: false,
            configurable: true,
        });
    }

    (Error as any)[builtInErrorInOverriddenErrorPropertyKey] = originalError;
}

function restoreJavascriptErrorObject() {
    if (Error.hasOwnProperty(builtInErrorInOverriddenErrorPropertyKey)) {
        Error = (Error as any)[builtInErrorInOverriddenErrorPropertyKey] as ErrorConstructor;
    }
}

export function registerErrorReporting(): void {
    if (!nodeJsErrorReportingRegistered) {
        nodeJsErrorReportingRegistered = true;

        try {
            process.addListener('uncaughtException', errorHandler);
            Logger.addListener('error', errorHandler);
            replaceJavascriptErrorObject();
        } catch {}
    }
}

export function unregisterErrorReporting(): void {
    try {
        process.removeListener('uncaughtException', errorHandler);
        Logger.removeListener('error', errorHandler);
        restoreJavascriptErrorObject();
        nodeJsErrorReportingRegistered = false;
    } catch {}
}

export async function registerAnalyticsClient(client: AnalyticsClient): Promise<void> {
    if (!analyticsClientRegistered) {
        analyticsClientRegistered = true;

        analyticsClient = client;

        try {
            const queue = eventQueue!;
            eventQueue = undefined;
            await Promise.all(queue.map((event) => event.then((e) => client.sendTrackEvent(e))));
        } catch {
        } finally {
            eventQueue = undefined;
        }
    }
}
