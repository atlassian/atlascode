import { ConfigurationChangeEvent, Event, ExtensionContext, OutputChannel, window } from 'vscode';
import { EventEmitter } from 'vscode';

import { ErrorProductArea } from './analyticsTypes';
import { configuration, OutputLevel } from './config/configuration';
import { extensionOutputChannelName } from './constants';
import { RovoDevCommonSessionAttributes } from './rovo-dev/rovoDevTelemetryProvider';
import { SentryService } from './sentry';
import { isDebugging } from './util/isDebugging';

function getConsolePrefix(productArea?: string) {
    return productArea ? `[${extensionOutputChannelName} ${productArea}]` : `[${extensionOutputChannelName}]`;
}

export type RovoDevTelemetryParams = RovoDevCommonSessionAttributes & { promptId?: string };

export type ErrorEvent = {
    error: Error;
    errorMessage?: string;
    capturedBy?: string;
    params?: string[];
    productArea?: ErrorProductArea;
    rovoDevParams?: RovoDevTelemetryParams;
};

/** This function must be called from the VERY FIRST FUNCTION that the called invoked from Logger.
 * If not, the function will return the name of a method inside Logger.
 */
export function retrieveCallerName(): string | undefined {
    try {
        const stack = new Error().stack;
        if (!stack) {
            return undefined;
        }

        // first line is the error message
        // second line is the latest function in the stack, which is this one
        // third line is the second-last function in the stack, which is the Logger.error / logError entrypoint
        // fourth line is the called function we are looking for
        const line = stack.split('\n')[3];

        return line.trim().split(' ')[1];
    } catch {
        return undefined;
    }
}

export class Logger {
    private static _instance: Logger;
    private level: OutputLevel = OutputLevel.Info;
    private output: OutputChannel | undefined;

    private static _onError = new EventEmitter<ErrorEvent>();
    public static get onError(): Event<ErrorEvent> {
        return Logger._onError.event;
    }

    // constructor is private to ensure only a single instance is created
    protected constructor() {}

    public static get Instance(): Logger {
        return this._instance || (this._instance = new this());
    }

    static configure(context: ExtensionContext) {
        context.subscriptions.push(configuration.onDidChange(this.Instance.onConfigurationChanged, this.Instance));
        this.Instance.onConfigurationChanged(configuration.initializingChangeEvent);
    }

    private onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        const section = 'outputLevel';
        if (initializing && isDebugging()) {
            this.level = OutputLevel.Debug;
        } else if (initializing || configuration.changed(e, section)) {
            this.level = configuration.get<OutputLevel>(section);
        }

        if (this.level === OutputLevel.Silent) {
            if (this.output !== undefined) {
                this.output.dispose();
                this.output = undefined;
            }
        } else {
            this.output = this.output || window.createOutputChannel(extensionOutputChannelName);
        }
    }

    public static info(message?: any, ...params: any[]): void {
        this.Instance.info(message, params);
    }

    public info(message?: any, ...params: any[]): void {
        if (this.level !== OutputLevel.Info && this.level !== OutputLevel.Debug) {
            return;
        }

        if (this.output !== undefined) {
            this.output.appendLine([this.timestamp, message, ...params].join(' '));
        }
    }

    public static debug(message?: any, ...params: any[]): void {
        this.Instance.debug(message, params);
    }

    public debug(message?: any, ...params: any[]): void {
        if (this.level !== OutputLevel.Debug) {
            return;
        }

        if (isDebugging()) {
            console.log(this.timestamp, getConsolePrefix(), message, ...params);
        }

        if (this.output !== undefined) {
            this.output.appendLine([this.timestamp, message, ...params].join(' '));
        }
    }

    public static error(ex: Error, errorMessage?: string, ...params: string[]): void {
        // `retrieveCallerName` must be called from the VERY FIRST FUNCTION that the called invoked from Logger.
        // If not, the function will return the name of a method inside Logger.
        const callerName = retrieveCallerName();
        this.Instance.errorInternal(undefined, ex, callerName, errorMessage, undefined, ...params);
        this.Instance.logSentry(undefined, ex, callerName, errorMessage, {}, { params });
    }

    public error(ex: Error, errorMessage?: string, ...params: string[]): void {
        // `retrieveCallerName` must be called from the VERY FIRST FUNCTION that the called invoked from Logger.
        // If not, the function will return the name of a method inside Logger.
        const callerName = retrieveCallerName();
        this.errorInternal(undefined, ex, callerName, errorMessage, undefined, ...params);
        this.logSentry(undefined, ex, callerName, errorMessage, {}, { params });
    }

    private errorInternal(
        productArea: ErrorProductArea,
        ex: Error,
        capturedBy?: string,
        errorMessage?: string,
        rovoDevParams?: RovoDevTelemetryParams,
        ...params: string[]
    ): void {
        Logger._onError.fire({ error: ex, errorMessage, capturedBy, params, rovoDevParams, productArea });

        if (this.level === OutputLevel.Silent) {
            return;
        }

        if (isDebugging()) {
            console.error(this.timestamp, getConsolePrefix(productArea), errorMessage, ...params, ex);
        }

        if (this.output !== undefined) {
            this.output.appendLine([this.timestamp, errorMessage, ex, ...params].join(' '));
        }
    }

    /** DO NOT CALL this function directly. It's meant to be called only by `RovoDevTelemetryProvider.logError`. */
    public static rovoDevErrorInternal(
        ex: Error,
        capturedBy: string | undefined,
        errorMessage: string | undefined,
        metadata: RovoDevCommonSessionAttributes,
        promptId: string | undefined,
        ...params: string[]
    ): void {
        const rovoDevParams: RovoDevTelemetryParams = {
            rovoDevEnv: metadata.rovoDevEnv,
            appInstanceId: metadata.appInstanceId,
            sessionId: metadata.sessionId,
            promptId: promptId,
        };

        this.Instance.errorInternal('RovoDev', ex, capturedBy, errorMessage, rovoDevParams, ...params);
        this.Instance.logSentry('RovoDev', ex, capturedBy, errorMessage, metadata, { promptId, params });
    }

    /** DO NOT CALL this function directly. It's meant to be called only by `BitbucketLogger`. */
    public static bitBucketErrorInternal(
        ex: Error,
        capturedBy: string | undefined,
        errorMessage: string | undefined,
        ...params: string[]
    ): void {
        this.Instance.errorInternal('Bitbucket', ex, capturedBy, errorMessage, undefined, ...params);
        this.Instance.logSentry('Bitbucket', ex, capturedBy, errorMessage, {}, { params });
    }

    public static warn(message?: any, ...params: any[]): void {
        this.Instance.warn(message, params);
    }

    public warn(message?: any, ...params: any[]): void {
        if (this.level !== OutputLevel.Debug) {
            return;
        }

        if (isDebugging()) {
            console.warn(this.timestamp, getConsolePrefix(), message, ...params);
        }

        if (this.output !== undefined) {
            this.output.appendLine([this.timestamp, message, ...params].join(' '));
        }
    }

    static show(): void {
        if (this.Instance.output !== undefined) {
            this.Instance.output.show();
        }
    }

    private logSentry(
        productArea: ErrorProductArea,
        ex: Error,
        capturedBy?: string,
        errorMessage?: string,
        extraTags: Record<string, string> = {},
        extraExtra: Record<string, any> = {},
    ) {
        if (SentryService.getInstance().isInitialized()) {
            try {
                SentryService.getInstance().captureException(ex, {
                    tags: {
                        productArea: productArea || 'unknown',
                        capturedBy: capturedBy || 'unknown',
                        ...extraTags,
                    },
                    extra: {
                        errorMessage,
                        ...extraExtra,
                    },
                });
                Logger.debug('Error reported to Sentry successfully', ex);
            } catch (err) {
                console.error('Error reporting to Sentry:', err);
            }
        }
    }

    private get timestamp(): string {
        const now = new Date();
        const time = now.toISOString().replace(/T/, ' ').replace(/\..+/, '');
        return `[${time}:${('00' + now.getUTCMilliseconds()).slice(-3)}]`;
    }
}
