import { Product, ProductBitbucket, ProductJira } from 'src/atlclients/authInfo';
import { Container } from 'src/container';
import { Disposable, TreeItem } from 'vscode';

import { loginToJiraMessageNode } from '../jira/treeViews/utils';
import { loginToBitbucketMessageNode } from '../nodes/definedNodes';
import { NotificationManagerImpl, NotificationNotifier, NotificationType } from './notificationManager';

export class AuthNotifier implements NotificationNotifier, Disposable {
    private static instance: AuthNotifier;
    private _disposable: Disposable;

    public static getSingleton(): AuthNotifier {
        if (!AuthNotifier.instance) {
            AuthNotifier.instance = new AuthNotifier();
        }
        return AuthNotifier.instance;
    }

    private constructor() {
        this._disposable = Disposable.from(
            Container.credentialManager.onDidAuthChange(this.fetchNotificationsProxy, this),
        );
    }

    public dispose() {
        this._disposable.dispose();
    }

    public fetchNotificationsProxy(): void {
        this.fetchNotifications();
    }

    public fetchNotifications(): void {
        this.checkJiraAuth();
        this.checkBitbucketAuth();
    }

    private checkJiraAuth(): void {
        this.checkAuth(ProductJira, 'jira.login', 'Please login to Jira', loginToJiraMessageNode);
    }

    private checkBitbucketAuth(): void {
        this.checkAuth(
            ProductBitbucket,
            'bitbucket.login',
            'Please login to Bitbucket',
            loginToBitbucketMessageNode.getTreeItem(),
        );
    }

    private checkAuth(product: Product, notificationId: string, message: string, treeItem: TreeItem): void {
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
}
