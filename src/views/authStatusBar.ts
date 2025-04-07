import Mustache from 'mustache';
import { SitesAvailableUpdateEvent } from 'src/siteManager';
import { ConfigurationChangeEvent, Disposable, StatusBarAlignment, StatusBarItem, window } from 'vscode';

import {
    AuthInfo,
    DetailedSiteInfo,
    isEmptySiteInfo,
    Product,
    ProductBitbucket,
    ProductJira,
} from '../atlclients/authInfo';
import { Commands } from '../commands';
import { configuration } from '../config/configuration';
import { BitbucketEnabledKey, JiraEnabledKey } from '../constants';
import { Container } from '../container';
import { Resources } from '../resources';

export class AuthStatusBar extends Disposable {
    public static JiraStausBarItemPriority = 100;
    public static BitbucketStausBarItemPriority = 90;

    private _authenticationStatusBarItems: Map<string, StatusBarItem> = new Map<string, StatusBarItem>();

    private _disposable: Disposable;

    constructor() {
        super(() => this.dispose());
        this._disposable = Disposable.from(
            Container.siteManager.onDidSitesAvailableChange(this.onDidSitesChange, this),
            configuration.onDidChange(this.onConfigurationChanged, this),
        );

        void this.onConfigurationChanged(configuration.initializingChangeEvent);
    }

    onDidSitesChange(e: SitesAvailableUpdateEvent) {
        this.generateStatusbarItem(e.product);
    }

    async generateStatusbarItem(product: Product): Promise<void> {
        const site: DetailedSiteInfo | undefined = Container.siteManager.getFirstSite(product.key);
        let authInfo: AuthInfo | undefined = undefined;

        if (!isEmptySiteInfo(site)) {
            authInfo = await Container.credentialManager.getAuthInfo(site);
        }

        await this.updateAuthenticationStatusBar(product, authInfo);
    }

    protected async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);
        if (initializing || configuration.changed(e, 'jira.statusbar') || configuration.changed(e, JiraEnabledKey)) {
            await this.generateStatusbarItem(ProductJira);
        }

        if (
            initializing ||
            configuration.changed(e, 'bitbucket.statusbar') ||
            configuration.changed(e, BitbucketEnabledKey)
        ) {
            await this.generateStatusbarItem(ProductBitbucket);
        }
    }
    dispose() {
        this._authenticationStatusBarItems.forEach((item) => {
            item.dispose();
        });
        this._authenticationStatusBarItems.clear();

        this._disposable.dispose();
    }

    private ensureStatusItem(product: Product): StatusBarItem {
        let statusBarItem = this._authenticationStatusBarItems.get(product.key);
        if (!statusBarItem) {
            statusBarItem = window.createStatusBarItem(
                StatusBarAlignment.Left,
                product.name === 'Jira'
                    ? AuthStatusBar.JiraStausBarItemPriority
                    : AuthStatusBar.BitbucketStausBarItemPriority,
            );
            this._authenticationStatusBarItems.set(product.key, statusBarItem);
        }
        return statusBarItem;
    }

    private async updateAuthenticationStatusBar(product: Product, authInfo?: AuthInfo): Promise<void> {
        const statusBarItem = this.ensureStatusItem(product);
        if (
            (product.name === 'Jira' && Container.config.jira.enabled && Container.config.jira.statusbar.enabled) ||
            (product.name === 'Bitbucket' &&
                Container.config.bitbucket.enabled &&
                Container.config.bitbucket.statusbar.enabled)
        ) {
            const statusBarItem = this.ensureStatusItem(product);
            await this.updateStatusBarItem(statusBarItem, product, authInfo);
        } else {
            statusBarItem.hide();
        }
    }

    private async updateStatusBarItem(
        statusBarItem: StatusBarItem,
        product: Product,
        authInfo?: AuthInfo,
    ): Promise<void> {
        let text: string = '$(sign-in)';
        let command: string | undefined;
        let showIt: boolean = true;
        const template = Resources.html.get('statusBarText');

        switch (product.key) {
            case ProductJira.key: {
                if (authInfo) {
                    text = `$(person) ${product.name}: ${authInfo.user.displayName}`;
                    if (template) {
                        const data = { product: product.name, user: authInfo.user.displayName };
                        const context = { ...Container.config.jira.statusbar, ...data };
                        command = Commands.ShowJiraAuth;
                        text = Mustache.render(template, context);
                    }
                } else {
                    if (Container.config.jira.statusbar.showLogin) {
                        text = `$(sign-in) Sign in to ${product.name}`;
                        command = Commands.ShowJiraAuth;
                        product = ProductJira;
                    } else {
                        statusBarItem.hide();
                        showIt = false;
                    }
                }

                break;
            }

            case ProductBitbucket.key: {
                if (authInfo) {
                    text = `$(person) ${product.name}: ${authInfo.user.displayName}`;

                    if (template) {
                        const data = { product: product.name, user: authInfo.user.displayName };
                        const context = { ...Container.config.bitbucket.statusbar, ...data };
                        command = Commands.ShowBitbucketAuth;
                        text = Mustache.render(template, context);
                    }
                } else {
                    if (Container.config.bitbucket.statusbar.showLogin) {
                        text = `$(sign-in) Sign in to ${product.name}`;
                        command = Commands.ShowBitbucketAuth;
                        product = ProductBitbucket;
                    } else {
                        statusBarItem.hide();
                        showIt = false;
                    }
                }

                break;
            }
            default: {
                text = `$(person) Unknown Atlassian product ${product.name}`;
                command = undefined;
            }
        }

        statusBarItem.text = text;
        statusBarItem.command = command;
        statusBarItem.tooltip = `${product.name}`;

        if (showIt) {
            statusBarItem.show();
        }
    }
}
