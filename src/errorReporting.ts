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
let eventQueue: Promise<TrackEvent>[] = [];

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

function errorHandlerWithFilter(error: Error | string, capturedBy: string): void {
    safeExecute(() => {
        if (error instanceof Error && error.stack && error.stack.includes(AtlascodeStackTraceHint)) {
            errorHandler(error, undefined, capturedBy);
        }
    });
}

function errorHandler(error: Error | string, errorMessage?: string, capturedBy?: string): void {
    safeExecute(() => {
        safeExecute(() => Logger.debug('[LOGGED ERROR]', errorMessage, error, capturedBy));

        let event: Promise<TrackEvent>;
        if (typeof error === 'string') {
            errorMessage = errorMessage ? `${errorMessage}: ${error}` : error;
            event = errorEvent(errorMessage);
        } else {
            errorMessage = errorMessage || error.message;
            event = errorEvent(errorMessage, error, capturedBy);
        }

        if (analyticsClient) {
            event.then((e) => analyticsClient!.sendTrackEvent(e));
        } else {
            eventQueue.push(event);
        }
    });
}

export function registerErrorReporting(): void {
    if (nodeJsErrorReportingRegistered) {
        return;
    }
    nodeJsErrorReportingRegistered = true;

    safeExecute(() => {
        process.addListener('uncaughtException', (e) => errorHandlerWithFilter(e, 'NodeJS.uncaughtException'));
        process.addListener('uncaughtExceptionMonitor', (e) =>
            errorHandlerWithFilter(e, 'NodeJS.uncaughtExceptionMonitor'),
        );
        process.addListener('unhandledRejection', (e) => errorHandlerWithFilter(e as any, 'NodeJS.unhandledRejection'));

        _logger_onError_eventRegistration = Logger.onError(
            (data) => errorHandler(data.error, data.errorMessage, data.capturedBy),
            undefined,
        );
    });
}

export function unregisterErrorReporting(): void {
    safeExecute(
        () => {
            // TODO - FIX THIS
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

        try {
            await Promise.all(eventQueue.map((event) => event.then((e) => client.sendTrackEvent(e))));
        } catch {
        } finally {
            eventQueue = [];
        }
    }
}
