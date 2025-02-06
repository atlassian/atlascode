import axios, { AxiosInstance } from 'axios';
import pAny from 'p-any';
import pRetry from 'p-retry';
import { ConfigurationChangeEvent, Disposable, Event, EventEmitter } from 'vscode';
import { addCurlLogging } from '../atlclients/interceptors';
import { configuration } from '../config/configuration';
import { AxiosUserAgent } from '../constants';
import { Container } from '../container';
import { getAgent } from '../jira/jira-client/providers';
import { Logger } from '../logger';
import { ConnectionTimeout, Time } from './time';
import { l10n } from 'vscode';

export type OnlineInfoEvent = {
    isOnline: boolean;
};

const offlinePolling: number = 5 * Time.SECONDS;

export class OnlineDetector extends Disposable {
    private _disposable: Disposable;
    private _isOnline: boolean;
    private _isOfflineMode: boolean;
    private _onlineTimer: any | undefined;
    private _offlineTimer: any | undefined;
    private _transport: AxiosInstance;
    private _checksInFlight: boolean = false;

    private _onDidOnlineChange = new EventEmitter<OnlineInfoEvent>();
    public get onDidOnlineChange(): Event<OnlineInfoEvent> {
        return this._onDidOnlineChange.event;
    }

    constructor() {
        super(() => this.dispose());

        this._disposable = Disposable.from(configuration.onDidChange(this.onConfigurationChanged, this));

        this._transport = axios.create({
            timeout: ConnectionTimeout,
            headers: {
                'User-Agent': AxiosUserAgent,
            },
        });

        if (Container.config.enableCurlLogging) {
            addCurlLogging(this._transport);
        }

        void this.onConfigurationChanged(configuration.initializingChangeEvent);
    }

    dispose() {
        clearInterval(this._onlineTimer);
        clearInterval(this._offlineTimer);
        this._disposable.dispose();
        this._onDidOnlineChange.dispose();
    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, 'offlineMode')) {
            this._isOfflineMode = Container.config.offlineMode;

            if (this._isOnline !== !this._isOfflineMode) {
                this._onDidOnlineChange.fire({ isOnline: !this._isOfflineMode });
            }
        }
    }

    public isOnline(): boolean {
        if (this._isOfflineMode) {
            return false;
        }

        return true;
    }

    private async runOnlineChecks(): Promise<boolean> {
        const urlList = Container.config.onlineCheckerUrls.slice();
        const promise = async () =>
            await pAny(
                urlList.map((url) => {
                    return (async () => {
                        Logger.debug(`Online check attempting to connect to ${url}`);
                        await this._transport(url, { method: 'HEAD', ...getAgent() });
                        Logger.debug(`Online check connected to ${url}`);
                        return true;
                    })();
                }),
            );

        return await pRetry<boolean>(promise, {
            retries: 4,
            onFailedAttempt: (error) => {
                Logger.debug(
                    `Online check attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`,
                );
            },
        } as pRetry.Options).catch(() => false);
    }

    private async checkOnlineStatus() {
        if (!this._checksInFlight) {
            this._checksInFlight = true;

            let newIsOnline = await this.runOnlineChecks();

            this._checksInFlight = false;

            if (newIsOnline !== this._isOnline) {
                this._isOnline = newIsOnline;

                if (!this._isOnline) {
                    if (!this._offlineTimer) {
                        this._offlineTimer = setInterval(async () => {
                            await this.checkOnlineStatus();
                        }, offlinePolling);
                    }
                } else {
                    if (this._offlineTimer) {
                        clearInterval(this._offlineTimer);
                        this._offlineTimer = undefined;
                    }
                }

                if (!this._isOfflineMode) {
                    Logger.debug(newIsOnline ? l10n.t('You have gone online!') : l10n.t('You have gone offline :('));
                    this._onDidOnlineChange.fire({ isOnline: newIsOnline });
                }
            }
        }
    }
}
