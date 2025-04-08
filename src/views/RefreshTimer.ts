import { ConfigurationChangeEvent, Disposable } from 'vscode';

import { configuration } from '../config/configuration';
import { Container } from '../container';
import { Time } from '../util/time';

const defaultRefreshInterval = 5 * Time.MINUTES;

export class RefreshTimer implements Disposable {
    private _timer: any | undefined;
    private _refreshInterval = defaultRefreshInterval;
    private _active: boolean = true;

    constructor(
        private _enabledConfigPath: string | undefined,
        private _intervalConfigPath: string,
        private _refresh: () => void,
    ) {
        Container.context.subscriptions.push(configuration.onDidChange(this.onConfigurationChanged, this));
        this.reloadConfiguration();
    }

    setActive(active: boolean) {
        this._active = active;
        this.reloadConfiguration();
    }

    isEnabled(): boolean {
        return (
            this._active &&
            (this._enabledConfigPath === undefined || configuration.get<boolean>(this._enabledConfigPath)) &&
            this._refreshInterval > 0
        );
    }

    dispose() {
        this.stopTimer();
    }

    private reloadConfiguration() {
        this._refreshInterval = configuration.get<number>(this._intervalConfigPath) * Time.MINUTES;
        this.stopTimer();
        if (this.isEnabled()) {
            this.startTimer();
        }
    }

    private onConfigurationChanged(e: ConfigurationChangeEvent) {
        if (
            configuration.changed(e, this._intervalConfigPath) ||
            (this._enabledConfigPath !== undefined && configuration.changed(e, this._enabledConfigPath))
        ) {
            this.reloadConfiguration();
        }
    }

    private startTimer() {
        if (this._refreshInterval > 0 && !this._timer) {
            this._timer = setInterval(() => {
                this._refresh();
            }, this._refreshInterval);
        }
    }

    private stopTimer() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = undefined;
        }
    }
}
