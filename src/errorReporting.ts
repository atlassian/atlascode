import { Disposable } from 'vscode';

import { errorEvent } from './analytics';
import { AnalyticsClient } from './analytics-node-client/src/client.min';
import { TrackEvent } from './analytics-node-client/src/types';
import { ErrorProductArea } from './analyticsTypes';
import { ExtensionId } from './constants';
import { Logger, RovoDevTelemetryParams } from './logger';

const AtlascodeStackTraceHint = `/.vscode/extensions/${ExtensionId}-`;

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

// we need a dedicated listener to be able to remove it during the unregister
function uncaughtExceptionHandler(error: Error | string): void {
    errorHandlerWithFilter(undefined, error, 'NodeJS.uncaughtException');
}

// we need a dedicated listener to be able to remove it during the unregister
function uncaughtExceptionMonitorHandler(error: Error | string): void {
    errorHandlerWithFilter(undefined, error, 'NodeJS.uncaughtExceptionMonitor');
}

// we need a dedicated listener to be able to remove it during the unregister
function unhandledRejectionHandler(error: Error | string): void {
    errorHandlerWithFilter(undefined, error, 'NodeJS.unhandledRejection');
}

function errorHandlerWithFilter(productArea: ErrorProductArea, error: Error | string, capturedBy: string): void {
    safeExecute(() => {
        // Don't send uncaughtException or unhandledRejection errors to Amplitude
        // These are handled by extension.ts and logged via Logger.error
        const filteredExceptions = ['uncaughtexception', 'unhandledrejection'];
        const capturedByLower = capturedBy.toLowerCase();
        const isNodeJsGlobalError = filteredExceptions.some((exception) => capturedByLower.includes(exception));

        if (isNodeJsGlobalError) {
            return;
        }

        if (error instanceof Error && error.stack && error.stack.includes(AtlascodeStackTraceHint)) {
            errorHandler(productArea, error, undefined, undefined, undefined, capturedBy);
        }
    });
}

function errorHandler(
    productArea: ErrorProductArea,
    error: Error | string,
    errorMessage?: string,
    params?: string[],
    rovoDevParams?: RovoDevTelemetryParams,
    capturedBy?: string,
): void {
    safeExecute(() => {
        const formattedParams =
            !params || params.length === 0 ? undefined : params.length === 1 ? params[0] : JSON.stringify(params);

        safeExecute(() => Logger.debug('[LOGGED ERROR]', capturedBy, errorMessage, formattedParams, error));

        let event: Promise<TrackEvent>;
        if (typeof error === 'string') {
            errorMessage = errorMessage ? `${errorMessage}: ${error}` : error;
            event = errorEvent(productArea, errorMessage, undefined, capturedBy, formattedParams, rovoDevParams);
        } else {
            errorMessage = errorMessage || error.message;
            event = errorEvent(productArea, errorMessage, error, capturedBy, formattedParams, rovoDevParams);
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
        process.addListener('uncaughtException', uncaughtExceptionHandler);
        process.addListener('uncaughtExceptionMonitor', uncaughtExceptionMonitorHandler);
        process.addListener('unhandledRejection', unhandledRejectionHandler);

        _logger_onError_eventRegistration = Logger.onError(
            (data) =>
                errorHandler(
                    data.productArea,
                    data.error,
                    data.errorMessage,
                    data.params,
                    data.rovoDevParams,
                    data.capturedBy,
                ),
            undefined,
        );
    });
}

export function unregisterErrorReporting(): void {
    safeExecute(
        () => {
            process.removeListener('uncaughtException', uncaughtExceptionHandler);
            process.removeListener('uncaughtExceptionMonitor', uncaughtExceptionMonitorHandler);
            process.removeListener('unhandledRejection', unhandledRejectionHandler);

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
