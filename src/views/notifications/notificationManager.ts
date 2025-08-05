import { ConfigurationChangeEvent, Disposable, Uri, window } from 'vscode';

import { AuthInfoEvent, isRemoveAuthEvent, Product, ProductBitbucket, ProductJira } from '../../atlclients/authInfo';
import { configuration } from '../../config/configuration';
import { Container } from '../../container';
import { Logger } from '../../logger';
import { FeatureFlagClient, Features } from '../../util/featureFlags';
import { Time } from '../../util/time';
import { AtlassianNotificationNotifier } from './atlassianNotificationNotifier';
import { AuthNotifier } from './authNotifier';
import { BannerDelegate } from './bannerDelegate';

export interface AtlasCodeNotification {
    id: string;
    uri: Uri;
    message: string;
    notificationType: NotificationType;
    product: Product;
    userId?: string;
    timestamp: number;
}
export interface NotificationDelegate {
    onNotificationChange(event: NotificationChangeEvent): void;
    getSurface(): NotificationSurface;
}

export interface NotificationChangeEvent {
    action: NotificationAction;
    notifications: Map<string, AtlasCodeNotification>;
}

export interface NotificationNotifier {
    fetchNotifications(): void;
}

export enum NotificationType {
    AssignedToYou = 'AssignedToYou',
    JiraComment = 'JiraComment',
    PRComment = 'PRComment',
    PRApproved = 'PRApproved',
    PRChangeRequired = 'PRChangeRequired',
    PRReviewRequested = 'PRReviewRequested',
    PipelineFailure = 'PipelineFailure',
    PipelineSuccess = 'PipelineSuccess',
    LoginNeeded = 'LoginNeeded',
    Other = 'Other',
}

export enum NotificationSurface {
    Banner = 'Banner',
    Badge = 'Badge',
    All = 'All',
}

export enum NotificationAction {
    Added = 'Added',
    Removed = 'Removed',
    MarkedAsRead = 'MarkedAsRead',
}

const ENABLE_BADGE_FOR = [NotificationType.PRComment, NotificationType.JiraComment, NotificationType.LoginNeeded];

const ENABLE_BANNER_FOR = [
    NotificationType.AssignedToYou,
    NotificationType.JiraComment,
    NotificationType.PRComment,
    NotificationType.PRApproved,
    NotificationType.PRChangeRequired,
    NotificationType.PRReviewRequested,
    NotificationType.PipelineFailure,
    NotificationType.PipelineSuccess,
    NotificationType.LoginNeeded,
    NotificationType.Other,
];

export class NotificationManagerImpl extends Disposable {
    private notifications: Map<string, Map<string, AtlasCodeNotification>> = new Map();
    private static instance: NotificationManagerImpl;
    private delegates: Set<NotificationDelegate> = new Set();
    private notifiers: Set<NotificationNotifier> = new Set();
    private listenerId: NodeJS.Timeout | undefined;
    private _jiraEnabled: boolean;
    private _bitbucketEnabled: boolean;
    private _disposable: Disposable[] = [];
    private userReadNotifications: { id: string; timestamp: number }[] = [];

    private constructor() {
        super(() => this.dispose());
        this._disposable.push(Disposable.from(Container.credentialManager.onDidAuthChange(this.onDidAuthChange, this)));
        this._disposable.push(Disposable.from(configuration.onDidChange(this.onDidChangeConfiguration, this)));
        this._disposable.push(Disposable.from(window.onDidChangeWindowState(this.runNotifiers, this)));
        this._jiraEnabled = Container.config.jira.enabled;
        this._bitbucketEnabled = Container.config.bitbucket.enabled;
        this.userReadNotifications = NotificationDB.getReadNotifications();
    }

    public onDidAuthChange(e: AuthInfoEvent): void {
        if (isRemoveAuthEvent(e)) {
            this.clearNotificationsByUserId(e.userId);
            return;
        }
    }

    public override dispose() {
        this._disposable.forEach((e) => e.dispose());
    }

    public static getInstance(): NotificationManagerImpl {
        if (!NotificationManagerImpl.instance) {
            NotificationManagerImpl.instance = new NotificationManagerImpl();

            NotificationManagerImpl.instance.notifiers.add(AuthNotifier.getInstance());
            if (FeatureFlagClient.checkGate(Features.AtlassianNotifications)) {
                NotificationManagerImpl.instance.notifiers.add(AtlassianNotificationNotifier.getInstance());
            }

            // Note: the badge delegate is not registered here as it needs the context of the tree view
            NotificationManagerImpl.instance.registerDelegate(BannerDelegate.getInstance());
        }
        return NotificationManagerImpl.instance;
    }

    public listen(): void {
        if (this.listenerId) {
            Logger.debug('Notification manager is already listening');
            return;
        }
        // Run immediately
        this.runNotifiers();

        // Then every minute
        this.listenerId = setInterval(() => {
            this.runNotifiers();
        }, 60 * 1000);
    }

    public stopListening(): void {
        Logger.debug('Stopping notification manager');
        if (this.listenerId) {
            clearInterval(this.listenerId);
            this.listenerId = undefined;
        }
    }

    public registerDelegate(delegate: NotificationDelegate): void {
        Logger.debug(`Registering delegate ${delegate}`);
        this.delegates.add(delegate);
    }

    public unregisterDelegate(delegate: NotificationDelegate): void {
        Logger.debug(`Unregistering delegate ${delegate}`);
        this.delegates.delete(delegate);
    }

    public getNotificationsByUri(
        uri: Uri,
        notificationSurface: NotificationSurface,
    ): Map<string, AtlasCodeNotification> {
        Logger.debug(`Getting notifications for uri ${uri} with surface ${notificationSurface}`);
        const notificationsForUri = this.notifications.get(uri.toString()) ?? new Map();
        return this.filterNotificationsBySurface(notificationsForUri, notificationSurface);
    }

    public addNotification(notification: AtlasCodeNotification): void {
        const uri = notification.uri;
        if (this.userReadNotifications.some((n) => n.id === notification.id)) {
            Logger.debug(`Notification with id ${notification.id} has already been read by the user`);
            return;
        }
        Logger.debug(`Adding notification with id ${notification.id} for uri ${uri}`);
        if (!this.notifications.has(uri.toString())) {
            Logger.debug(`No notifications found for uri ${uri}, creating new map`);
            this.notifications.set(uri.toString(), new Map());
        }

        const notificationsForUri = this.getNotificationsByUri(uri, NotificationSurface.All);
        if (notificationsForUri.has(notification.id)) {
            Logger.debug(`Notification with id ${notification.id} already exists for uri ${uri}`);
            return;
        }

        notificationsForUri.set(notification.id, notification);
        this.onNotificationChange(NotificationAction.Added, new Map([[notification.id, notification]]));
    }

    public clearNotificationsByUri(uri: Uri): void {
        Logger.debug(`Clearing notifications for uri ${uri}`);
        const removedNotifications = this.notifications.get(uri.toString()) || new Map();
        this.notifications.delete(uri.toString());
        this.onNotificationChange(NotificationAction.MarkedAsRead, removedNotifications);
    }

    private clearNotificationsByProduct(product: Product): void {
        Logger.debug(`Clearing notifications for product ${product}`);
        const removedNotifications = new Map<string, AtlasCodeNotification>();
        this.notifications.forEach((notificationsForUri, uri) => {
            notificationsForUri.forEach((notification) => {
                if (notification.product === product) {
                    removedNotifications.set(notification.id, notification);
                    notificationsForUri.delete(notification.id);
                }
            });
            if (notificationsForUri.size === 0) {
                this.notifications.delete(uri);
            }
        });
        this.onNotificationChange(NotificationAction.Removed, removedNotifications);
    }

    private clearNotificationsByUserId(userId: string): void {
        Logger.debug(`Clearing notifications for userId ${userId}`);
        const removedNotifications = new Map<string, AtlasCodeNotification>();
        this.notifications.forEach((notificationsForUri) => {
            notificationsForUri.forEach((notification) => {
                if (notification.userId === userId) {
                    removedNotifications.set(notification.id, notification);
                    notificationsForUri.delete(notification.id);
                }
            });
        });
        this.onNotificationChange(NotificationAction.Removed, removedNotifications);
    }

    private onNotificationChange(action: NotificationAction, notifications: Map<string, AtlasCodeNotification>): void {
        // Store in the VS Code global state the notificationIDs that have been removed
        this.storeRemovedNotificationIds(action, notifications);
        notifications = notifications || new Map();
        this.delegates.forEach((delegate) => {
            const filteredNotifications = this.filterNotificationsBySurface(notifications, delegate.getSurface());
            if (filteredNotifications.size === 0) {
                Logger.debug(`No notifications for delegate ${delegate}`);
                return;
            }
            const notificationChangeEvent: NotificationChangeEvent = {
                action,
                notifications: filteredNotifications,
            };
            delegate.onNotificationChange(notificationChangeEvent);
            Logger.debug(`Delegate ${delegate} notified`);
        });
    }

    private storeRemovedNotificationIds(
        action: NotificationAction,
        notifications: Map<string, AtlasCodeNotification>,
    ): void {
        const notificationsToStore = Array.from(notifications.values()).filter(
            (n) => n.notificationType !== NotificationType.LoginNeeded,
        );
        if (action !== NotificationAction.MarkedAsRead || notificationsToStore.length === 0) {
            return;
        }

        const newUserReadNotifications = notificationsToStore.map((n) => ({
            id: n.id,
            timestamp: n.timestamp,
        }));

        // Store the removed notification IDs and timestamps in the global state
        const existingEntries = NotificationDB.getReadNotifications();
        const updatedEntries = [...existingEntries, ...newUserReadNotifications];
        this.userReadNotifications = updatedEntries;
        NotificationDB.setReadNotifications(updatedEntries);
    }

    private getBadgeNotifications(
        notifications: Map<string, AtlasCodeNotification>,
    ): Map<string, AtlasCodeNotification> {
        return this.getFilteredNotifications(notifications, ENABLE_BADGE_FOR);
    }

    private getBannerNotifications(
        notifications: Map<string, AtlasCodeNotification>,
    ): Map<string, AtlasCodeNotification> {
        return this.getFilteredNotifications(notifications, ENABLE_BANNER_FOR);
    }

    private getFilteredNotifications(
        notifications: Map<string, AtlasCodeNotification>,
        enabledTypes: NotificationType[],
    ): Map<string, AtlasCodeNotification> {
        const filteredNotifications = new Map<string, AtlasCodeNotification>();
        notifications.forEach((notification) => {
            if (enabledTypes.includes(notification.notificationType)) {
                filteredNotifications.set(notification.id, notification);
            }
        });
        return filteredNotifications;
    }

    private runNotifiers(): void {
        if (!window.state.focused) {
            Logger.debug('Window is not focused, skipping notification check');
            return;
        }

        this.notifiers.forEach((notifier) => {
            notifier.fetchNotifications();
        });
    }

    private filterNotificationsBySurface(
        notificationsForUri: Map<string, AtlasCodeNotification>,
        notificationSurface: NotificationSurface,
    ): Map<string, AtlasCodeNotification> {
        switch (notificationSurface) {
            case NotificationSurface.Banner:
                return this.getBannerNotifications(notificationsForUri);
            case NotificationSurface.Badge:
                return this.getBadgeNotifications(notificationsForUri);
            case NotificationSurface.All:
                return notificationsForUri;
            default:
                Logger.debug(`Unknown notification surface: ${notificationSurface}`);
                return new Map();
        }
    }

    public onDidChangeConfiguration(e: ConfigurationChangeEvent): void {
        if (configuration.changed(e, 'jira.enabled')) {
            this._jiraEnabled = Container.config.jira.enabled;
            this.onJiraNotificationChange();
        }
        if (configuration.changed(e, 'bitbucket.enabled')) {
            this._bitbucketEnabled = Container.config.bitbucket.enabled;
            this.onBitbucketNotificationChange();
        }
    }

    private onJiraNotificationChange(): void {
        if (this._jiraEnabled) {
            Logger.debug('Jira notifications enabled');
            this.runNotifiers();
        } else {
            Logger.debug('Jira notifications disabled');
            this.clearNotificationsByProduct(ProductJira);
        }
    }

    private onBitbucketNotificationChange(): void {
        if (this._bitbucketEnabled) {
            Logger.debug('Bitbucket notifications enabled');
            this.runNotifiers();
        } else {
            Logger.debug('Bitbucket notifications disabled');
            this.clearNotificationsByProduct(ProductBitbucket);
        }
    }
}

class NotificationDB {
    private static readonly USER_READ_NOTIFICATIONS_KEY = 'userReadNotifications';
    public static getReadNotifications(): { id: string; timestamp: number }[] {
        const inDB = Container.context.globalState.get<{ id: string; timestamp: number }[]>(
            NotificationDB.USER_READ_NOTIFICATIONS_KEY,
            [],
        );

        const results = inDB.filter((notification) => NotificationDB.isGoodTTL(notification));
        if (results.length !== inDB.length) {
            Container.context.globalState.update(NotificationDB.USER_READ_NOTIFICATIONS_KEY, results);
        }
        return results;
    }

    public static setReadNotifications(notifications: { id: string; timestamp: number }[]): void {
        Container.context.globalState.update(NotificationDB.USER_READ_NOTIFICATIONS_KEY, notifications);
    }

    private static isGoodTTL(notification: { id: string; timestamp: number }): boolean {
        return Date.now() - notification.timestamp < 8 * Time.DAYS;
    }
}
