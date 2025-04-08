import { ConfigurationChangeEvent, Disposable, languages } from 'vscode';

import { ProductJira } from '../../atlclients/authInfo';
import { configuration } from '../../config/configuration';
import { JiraHoverProviderConfigurationKey } from '../../constants';
import { Container } from '../../container';
import { SitesAvailableUpdateEvent } from '../../siteManager';
import { IssueHoverProvider } from './issueHoverProvider';

export class IssueHoverProviderManager implements Disposable {
    private _disposable: Disposable;
    private _hoverProviderDisposable: Disposable | undefined = undefined;

    constructor() {
        this._disposable = Disposable.from(
            Container.siteManager.onDidSitesAvailableChange(this.onSitesDidChange, this),
            configuration.onDidChange(this.onConfigurationChanged, this),
        );
        void this.onConfigurationChanged(configuration.initializingChangeEvent);
    }

    private async onSitesDidChange(e: SitesAvailableUpdateEvent) {
        if (e.product.key === ProductJira.key) {
            if (e.sites.length > 0) {
                this.updateHover();
            } else {
                this.disposeHoverProvider();
            }
        }
    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);
        if (initializing || configuration.changed(e, JiraHoverProviderConfigurationKey)) {
            await this.updateHover();
        }
    }

    private async updateHover() {
        if (Container.config.jira.hover.enabled) {
            if (!this._hoverProviderDisposable) {
                this._hoverProviderDisposable = languages.registerHoverProvider(
                    { scheme: 'file' },
                    new IssueHoverProvider(),
                );
            }
        } else {
            if (this._hoverProviderDisposable) {
                this.disposeHoverProvider();
            }
        }
    }

    private disposeHoverProvider() {
        if (this._hoverProviderDisposable) {
            this._hoverProviderDisposable.dispose();
        }
        this._hoverProviderDisposable = undefined;
    }

    dispose() {
        this.disposeHoverProvider();
        this._disposable.dispose();
    }
}
