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

export function registerErrorReporting(): void {
    if (!nodeJsErrorReportingRegistered) {
        nodeJsErrorReportingRegistered = true;

        try {
            process.addListener('uncaughtException', errorHandler);
            process.addListener('uncaughtExceptionMonitor', errorHandler);
            process.addListener('unhandledRejection', errorHandler);
            Logger.addListener('error', errorHandler);
        } catch {}
    }
}

export function unregisterErrorReporting(): void {
    try {
        process.removeListener('uncaughtException', errorHandler);
        process.removeListener('uncaughtExceptionMonitor', errorHandler);
        process.removeListener('unhandledRejection', errorHandler);
        Logger.removeListener('error', errorHandler);
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
