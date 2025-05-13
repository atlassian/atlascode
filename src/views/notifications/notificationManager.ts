import { Uri } from 'vscode';

import { Logger } from '../../logger';
import { AuthNotifier } from './authNotifier';
import { BannerDelegate } from './bannerDelegate';

export interface AtlasCodeNotification {
    id: string;
    message: string;
    notificationType: NotificationType;
}
export interface NotificationDelegate {
    onNotificationChange(event: NotificationChangeEvent): void;
    getSurface(): NotificationSurface;
}

export interface NotificationChangeEvent {
    action: NotificationAction;
    uri: Uri;
    notifications: Map<string, AtlasCodeNotification>;
}

export interface NotificationNotifier {
    fetchNotifications(): void;
}

export enum NotificationType {
    AssignedToYou = 'AssignedToYou',
    NewCommentOnJira = 'NewCommentOnJira',
    PRNewComment = 'NewCommentOnPR',
    PRApproved = 'PRApproved',
    PRChangeRequired = 'PRChangeRequired',
    PRReviewRequested = 'PRReviewRequested',
    PipelineFailure = 'PipelineFailure',
    PipelineSuccess = 'PipelineSuccess',
    MentionedInComment = 'MentionedInComment',
    LoginNeeded = 'LoginNeeded',
    NewFeatureAnnouncement = 'NewFeatureAnnouncement',
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
}

const ENABLE_BADGE_FOR = [NotificationType.LoginNeeded];

const ENABLE_BANNER_FOR = [
    NotificationType.AssignedToYou,
    NotificationType.NewCommentOnJira,
    NotificationType.PRNewComment,
    NotificationType.PRApproved,
    NotificationType.PRChangeRequired,
    NotificationType.PRReviewRequested,
    NotificationType.PipelineFailure,
    NotificationType.PipelineSuccess,
    NotificationType.MentionedInComment,
    NotificationType.NewFeatureAnnouncement,
    NotificationType.LoginNeeded,
    NotificationType.Other,
];
export class NotificationManagerImpl {
    private notifications: Map<string, Map<string, AtlasCodeNotification>> = new Map();
    private static instance: NotificationManagerImpl;
    private delegates: Set<NotificationDelegate> = new Set();
    private notifiers: Set<NotificationNotifier> = new Set();
    private listenerId: NodeJS.Timeout | undefined;

    private constructor() {}

    public static getInstance(): NotificationManagerImpl {
        if (!NotificationManagerImpl.instance) {
            NotificationManagerImpl.instance = new NotificationManagerImpl();

            NotificationManagerImpl.instance.notifiers.add(AuthNotifier.getInstance());

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

    public addNotification(uri: Uri, notification: AtlasCodeNotification): void {
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
        this.onNotificationChange(NotificationAction.Added, uri, new Map([[notification.id, notification]]));
    }

    public clearNotifications(uri: Uri): void {
        Logger.debug(`Clearing notifications for uri ${uri}`);
        const removedNotifications = this.notifications.get(uri.toString());
        this.notifications.delete(uri.toString());
        this.onNotificationChange(NotificationAction.Removed, uri, removedNotifications);
    }

    private onNotificationChange(
        action: NotificationAction,
        uri: Uri,
        notifications: Map<string, AtlasCodeNotification> | undefined,
    ): void {
        notifications = notifications || new Map();
        Logger.debug(`Sending notification change for ${uri}`);
        this.delegates.forEach((delegate) => {
            const filteredNotifications = this.filterNotificationsBySurface(notifications, delegate.getSurface());
            if (filteredNotifications.size === 0) {
                Logger.debug(`No notifications for delegate ${delegate} for uri ${uri}`);
                return;
            }
            const notificationChangeEvent: NotificationChangeEvent = {
                action,
                uri,
                notifications: filteredNotifications,
            };
            delegate.onNotificationChange(notificationChangeEvent);
            Logger.debug(`Delegate ${delegate} notified for uri ${uri}`);
        });
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

    private runNotifiers() {
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
}
