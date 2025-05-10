import { ConfigurationChangeEvent, Event, ExtensionContext, OutputChannel, window } from 'vscode';
import { EventEmitter } from 'vscode';

import { configuration, OutputLevel } from './config/configuration';
import { extensionOutputChannelName } from './constants';
import { Container } from './container';

const ConsolePrefix = `[${extensionOutputChannelName}]`;

export type ErrorEvent = {
    error: Error;
    errorMessage?: string;
    capturedBy?: string;
    params?: string[];
};

/** This function must be called from the VERY FIRST FUNCTION that the called invoked from Logger.
 * If not, the function will return the name of a method inside Logger.
 */
function retrieveCallerName(): string | undefined {
    try {
        const stack = new Error().stack;
        if (!stack) {
            return undefined;
        }

        // first line is the error message
        // second line is the latest function in the stack, which is this one
        // third line is the second-last function in the stack, which is the Logger.error entrypoint
        // fourth line is the called we are looking for
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
    private constructor() {}

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
        if (initializing && Container.isDebugging) {
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

        if (Container.isDebugging) {
            console.log(this.timestamp, ConsolePrefix, message, ...params);
        }

        if (this.output !== undefined) {
            this.output.appendLine([this.timestamp, message, ...params].join(' '));
        }
    }

    public static error(ex: Error, errorMessage?: string, ...params: string[]): void {
        const callerName = retrieveCallerName();
        this.Instance.errorInternal(ex, callerName, errorMessage, ...params);
    }

    public error(ex: Error, errorMessage?: string, ...params: string[]): void {
        const callerName = retrieveCallerName();
        this.errorInternal(ex, callerName, errorMessage, ...params);
    }

    private errorInternal(ex: Error, capturedBy?: string, errorMessage?: string, ...params: string[]): void {
        Logger._onError.fire({ error: ex, errorMessage, capturedBy, params });

        if (this.level === OutputLevel.Silent) {
            return;
        }

        if (Container.isDebugging) {
            console.error(this.timestamp, ConsolePrefix, errorMessage, ...params, ex);
        }

        if (this.output !== undefined) {
            this.output.appendLine([this.timestamp, errorMessage, ex, ...params].join(' '));
        }
    }

    public static warn(message?: any, ...params: any[]): void {
        this.Instance.debug(message, params);
    }

    public warn(message?: any, ...params: any[]): void {
        if (this.level !== OutputLevel.Debug) {
            return;
        }

        if (Container.isDebugging) {
            console.warn(this.timestamp, ConsolePrefix, message, ...params);
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

    private get timestamp(): string {
        const now = new Date();
        const time = now.toISOString().replace(/T/, ' ').replace(/\..+/, '');
        return `[${time}:${('00' + now.getUTCMilliseconds()).slice(-3)}]`;
    }
}
