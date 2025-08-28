import { ConfigurationChangeEvent, Disposable, Uri } from 'vscode';

import { Product, ProductJira } from '../../atlclients/authInfo';
import { configuration } from '../../config/configuration';
import { Container } from '../../container';
import { NotificationManagerImpl, NotificationNotifier, NotificationType } from './notificationManager';

export class AuthNotifier extends Disposable implements NotificationNotifier {
    private static instance: AuthNotifier;
    private _disposable: Disposable[] = [];
    private _jiraEnabled: boolean;

    public static getInstance(): AuthNotifier {
        if (!AuthNotifier.instance) {
            AuthNotifier.instance = new AuthNotifier();
        }
        return AuthNotifier.instance;
    }

    private constructor() {
        super(() => {
            this.dispose();
        });
        this._disposable.push(
            Disposable.from(Container.credentialManager.onDidAuthChange(this.fetchNotifications, this)),
        );
        this._disposable.push(Disposable.from(configuration.onDidChange(this.onDidChangeConfiguration, this)));
        this._jiraEnabled = Container.config.jira.enabled;
    }

    public override dispose() {
        this._disposable.forEach((d) => d.dispose());
    }

    public onDidChangeConfiguration(e: ConfigurationChangeEvent): void {
        if (configuration.changed(e, 'jira.enabled')) {
            this._jiraEnabled = Container.config.jira.enabled;
        }
        this.fetchNotifications();
    }

    public fetchNotifications(): void {
        if (process.env.ROVODEV_BBY) {
            return;
        }
        this.checkJiraAuth();
        // we explicitly are not checking for bitbucket auth here: https://www.loom.com/share/0e96dcef1e524166929057074fc25e40?sid=6edcc48e-7ee8-46cb-a700-14fbd779b6de
    }

    private checkJiraAuth(): void {
        this.checkAuth(
            ProductJira,
            'jira.login',
            'Log in to Jira to view & manage work items',
            Uri.parse('Please login to Jira'),
        );
    }

    private checkAuth(product: Product, notificationId: string, message: string, uri: Uri): void {
        if (!this.isEnabled(product)) {
            NotificationManagerImpl.getInstance().clearNotificationsByUri(uri);
            return;
        }
        const numberOfAuth =
            Container.siteManager.numberOfAuthedSites(product, false) +
            Container.siteManager.numberOfAuthedSites(product, true);
        if (numberOfAuth === 0) {
            NotificationManagerImpl.getInstance().addNotification({
                id: notificationId,
                uri: uri,
                notificationType: NotificationType.LoginNeeded,
                message: message,
                product: product,
                timestamp: Date.now(),
            });
            return;
        }
        NotificationManagerImpl.getInstance().clearNotificationsByUri(uri);
    }

    private isEnabled(product: Product): boolean {
        switch (product) {
            case ProductJira:
                return this._jiraEnabled;
            default:
                return false;
        }
    }
}
