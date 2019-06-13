import { Disposable, ConfigurationChangeEvent, languages } from 'vscode';
import { Container } from "../../container";
import { configuration } from "../../config/configuration";
import { AuthInfoEvent } from "../../atlclients/authStore";
import { JiraHoverProviderConfigurationKey } from "../../constants";
import { OAuthProvider } from "../../atlclients/authInfo";
import { IssueHoverProvider } from "./issueHoverProvider";

export class IssueHoverProviderManager implements Disposable {

    private _disposable: Disposable;
    private _hoverProviderDisposable: Disposable | undefined = undefined;

    constructor() {
        this._disposable = Disposable.from(
            Container.authManager.onDidAuthChange(this.onDidAuthChange, this),
            configuration.onDidChange(this.onConfigurationChanged, this)
        );
        void this.onConfigurationChanged(configuration.initializingChangeEvent);
    }

    private async onDidAuthChange(e: AuthInfoEvent) {
        if (e.provider === OAuthProvider.JiraCloud && await Container.authManager.isProductAuthenticatedticated(OAuthProvider.JiraCloud)) {
            this.updateHover();
        } else {
            this.disposeHoverProvider();
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
                this._hoverProviderDisposable = languages.registerHoverProvider({ scheme: 'file' }, new IssueHoverProvider());
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
