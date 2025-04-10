import { Disposable } from 'vscode';

import { errorEvent } from './analytics';
import { AnalyticsClient } from './analytics-node-client/src/client.min';
import { TrackEvent } from './analytics-node-client/src/types';
import { Logger } from './logger';

const AtlascodeStackTraceHint = '/.vscode/extensions/atlassian.atlascode-';

let nodeJsErrorReportingRegistered = false;
let analyticsClientRegistered = false;

let _logger_onError_eventRegistration: Disposable | undefined = undefined;

let analyticsClient: AnalyticsClient | undefined;
let eventQueue: Promise<TrackEvent>[] | undefined = [];

function safeExecute(body: () => void, finallyBody?: () => void): void {
    try {
        body();
    } catch {
    } finally {
        try {
            if (finallyBody) {
                finallyBody();
            }
        } catch {}
    }
}

function errorHandlerWithFilter(error: Error): void {
    safeExecute(() => {
        if (error instanceof Error && error.stack && error.stack.includes(AtlascodeStackTraceHint)) {
            errorHandler(error);
        }
    });
}

function errorHandler(error: Error | string): void {
    safeExecute(() => {
        safeExecute(() => Logger.debug('[LOGGED ERROR]', error));

        const event = errorEvent(error);

        if (analyticsClient) {
            event.then((e) => analyticsClient!.sendTrackEvent(e));
        } else {
            eventQueue!.push(event);
        }
    });
}

export function registerErrorReporting(): void {
    if (nodeJsErrorReportingRegistered) {
        return;
    }
    nodeJsErrorReportingRegistered = true;

    safeExecute(() => {
        process.addListener('uncaughtException', errorHandlerWithFilter);
        process.addListener('uncaughtExceptionMonitor', errorHandlerWithFilter);
        process.addListener('unhandledRejection', errorHandlerWithFilter);

        _logger_onError_eventRegistration = Logger.onError((data) => errorHandler(data.error), undefined);
    });
}

export function unregisterErrorReporting(): void {
    safeExecute(
        () => {
            process.removeListener('uncaughtException', errorHandlerWithFilter);
            process.removeListener('uncaughtExceptionMonitor', errorHandlerWithFilter);
            process.removeListener('unhandledRejection', errorHandlerWithFilter);

            _logger_onError_eventRegistration?.dispose();
            _logger_onError_eventRegistration = undefined;
        },
        /* finally */ () => {
            nodeJsErrorReportingRegistered = false;
        },
    );
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
