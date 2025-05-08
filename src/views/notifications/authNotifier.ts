import { ConfigurationChangeEvent, Disposable, TreeItem } from 'vscode';

import { Product, ProductBitbucket, ProductJira } from '../../atlclients/authInfo';
import { configuration } from '../../config/configuration';
import { Container } from '../../container';
import { Logger } from '../../logger';
import { loginToJiraMessageNode } from '../jira/treeViews/utils';
import { loginToBitbucketMessageNode } from '../nodes/definedNodes';
import { NotificationManagerImpl, NotificationNotifier, NotificationType } from './notificationManager';

export class AuthNotifier implements NotificationNotifier, Disposable {
    private static instance: AuthNotifier;
    private _disposable: Disposable[] = [];
    private _jiraEnabled: boolean;
    private _bitbucketEnabled: boolean;

    public static getSingleton(): AuthNotifier {
        if (!AuthNotifier.instance) {
            AuthNotifier.instance = new AuthNotifier();
        }
        return AuthNotifier.instance;
    }

    private constructor() {
        this._disposable.push(
            Disposable.from(Container.credentialManager.onDidAuthChange(this.fetchNotifications, this)),
        );
        this._disposable.push(Disposable.from(configuration.onDidChange(this.onDidChangeConfiguration, this)));
        this._jiraEnabled = Container.config.jira.enabled;
        this._bitbucketEnabled = Container.config.bitbucket.enabled;
    }

    public dispose() {
        this._disposable.forEach((d) => d.dispose());
    }

    public onDidChangeConfiguration(e: ConfigurationChangeEvent): void {
        if (configuration.changed(e, 'jira.enabled')) {
            Logger.debug('Jira enabled changed');
            this._jiraEnabled = Container.config.jira.enabled;
        }
        if (configuration.changed(e, 'bitbucket.enabled')) {
            Logger.debug('Bitbucket enabled changed');
            this._bitbucketEnabled = Container.config.bitbucket.enabled;
        }
        this.fetchNotifications();
    }

    public fetchNotifications(): void {
        this.checkJiraAuth();
        this.checkBitbucketAuth();
    }

    private checkJiraAuth(): void {
        this.checkAuth(ProductJira, 'jira.login', 'Connect Jira to view & manage work items', loginToJiraMessageNode);
    }

    private checkBitbucketAuth(): void {
        this.checkAuth(
            ProductBitbucket,
            'bitbucket.login',
            'Connect Bitbucket to view & manage pull requests',
            loginToBitbucketMessageNode.getTreeItem(),
        );
    }

    private checkAuth(product: Product, notificationId: string, message: string, treeItem: TreeItem): void {
        if (!this.isEnabled(product)) {
            NotificationManagerImpl.getSingleton().clearNotifications(treeItem.resourceUri!);
            return;
        }
        const numberOfAuth =
            Container.siteManager.numberOfAuthedSites(product, false) +
            Container.siteManager.numberOfAuthedSites(product, true);
        if (numberOfAuth === 0) {
            NotificationManagerImpl.getSingleton().addNotification(treeItem.resourceUri!, {
                id: notificationId,
                notificationType: NotificationType.LoginNeeded,
                message: message,
            });
            return;
        }
        NotificationManagerImpl.getSingleton().clearNotifications(treeItem.resourceUri!);
    }

    private isEnabled(product: Product): boolean {
        switch (product) {
            case ProductJira:
                return this._jiraEnabled;
            case ProductBitbucket:
                return this._bitbucketEnabled;
            default:
                return false;
        }
    }
}
