import { ConfigurationChangeEvent, ExtensionContext, OutputChannel, window } from 'vscode';
import { configuration, OutputLevel } from './config/configuration';
import { extensionOutputChannelName } from './constants';
import { Container } from './container';

const ConsolePrefix = `[${extensionOutputChannelName}]`;

export class Logger {
    private static _instance: Logger;
    private level: OutputLevel = OutputLevel.Info;
    private output: OutputChannel | undefined;

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

    public static error(ex: Error, classOrMethod?: string, ...params: any[]): void {
        this.Instance.error(ex, classOrMethod, params);
    }

    public error(ex: Error, classOrMethod?: string, ...params: any[]): void {
        if (this.level === OutputLevel.Silent) {
            return;
        }

        if (Container.isDebugging) {
            console.error(this.timestamp, ConsolePrefix, classOrMethod, ...params, ex);
        }

        if (this.output !== undefined) {
            this.output.appendLine([this.timestamp, classOrMethod, ...params, ex].join(' '));
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
