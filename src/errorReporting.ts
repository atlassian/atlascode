import { Disposable } from 'vscode';

import { errorEvent } from './analytics';
import { AnalyticsClient } from './analytics-node-client/src/client.min';
import { TrackEvent } from './analytics-node-client/src/types';
import { Logger } from './logger';

let nodeJsErrorReportingRegistered = false;
let analyticsClientRegistered = false;

let _logger_onError_eventRegistration: Disposable | undefined = undefined;

let analyticsClient: AnalyticsClient | undefined;
let eventQueue: Promise<TrackEvent>[] | undefined = [];

function errorHandler(error: Error | string): void {
    try {
        Logger.debug('[LOGGED ERROR]', error);

        const event = errorEvent(error);

        if (analyticsClient) {
            event.then((e) => analyticsClient!.sendTrackEvent(e));
        } else {
            eventQueue!.push(event);
        }
    } catch {}
}

export function registerErrorReporting(): void {
    if (nodeJsErrorReportingRegistered) {
        return;
    }
    nodeJsErrorReportingRegistered = true;

    try {
        process.addListener('uncaughtException', errorHandler);
        process.addListener('uncaughtExceptionMonitor', errorHandler);
        process.addListener('unhandledRejection', errorHandler);

        _logger_onError_eventRegistration = Logger.onError((data) => errorHandler(data.error), undefined);
    } catch {}
}

export function unregisterErrorReporting(): void {
    try {
        process.removeListener('uncaughtException', errorHandler);
        process.removeListener('uncaughtExceptionMonitor', errorHandler);
        process.removeListener('unhandledRejection', errorHandler);

        _logger_onError_eventRegistration?.dispose();
        _logger_onError_eventRegistration = undefined;
    } catch {
    } finally {
        nodeJsErrorReportingRegistered = false;
    }
}

export async function registerAnalyticsClient(client: AnalyticsClient): Promise<void> {
    if (!analyticsClientRegistered) {
        analyticsClientRegistered = true;

        analyticsClient = client;
        const queue = eventQueue!;
        eventQueue = undefined;

        try {
            await Promise.all(queue.map((event) => event.then((e) => client.sendTrackEvent(e))));
        } catch {}
    }
}
