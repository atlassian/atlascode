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

function replaceJavascriptErrorObject() {
    // if we are calling this twice, probably it's because the extension got upgraded and it's re-initializing.
    // we need to retrieve the original Error and re-create another override
    const originalError = Error.hasOwnProperty('__atlascode_originalError')
        ? ((Error as any).__atlascode_originalError as ErrorConstructor)
        : Error;

    Error = class Error extends originalError {
        constructor(message?: string) {
            super(message);

            // for Errors created in the wild, we filter for the string `atlascode` to avoid noise
            if (message && message.includes('atlascode')) {
                errorHandler(this);
            }
        }
    } as ErrorConstructor;

    (Error as any).__atlascode_originalError = originalError;
}

function restoreJavascriptErrorObject() {
    if (Error.hasOwnProperty('__atlascode_originalError')) {
        Error = (Error as any).__atlascode_originalError as ErrorConstructor;
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
