import { Logger } from 'src/logger';
import { Uri } from 'vscode';

export interface AtlasCodeNotification {
    id: string;
    message: string;
    notificationType: NotificationType;
}
export interface NotificationDelegate {
    onNotificationChange(uri: Uri): void;
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
    private delegates: NotificationDelegate[] = [];

    private constructor() {}

    public static getSingleton(): NotificationManagerImpl {
        if (!NotificationManagerImpl.instance) {
            NotificationManagerImpl.instance = new NotificationManagerImpl();
        }
        return NotificationManagerImpl.instance;
    }

    public registerDelegate(delegate: NotificationDelegate): void {
        Logger.debug(`Registering delegate ${delegate}`);
        this.delegates.push(delegate);
    }

    public unregisterDelegate(delegate: NotificationDelegate): void {
        Logger.debug(`Unregistering delegate ${delegate}`);
        const index = this.delegates.indexOf(delegate);
        if (index > -1) {
            this.delegates.splice(index, 1);
        }
    }

    public getNotificationsByUri(
        uri: Uri,
        notificationSurface: NotificationSurface,
    ): Map<string, AtlasCodeNotification> {
        Logger.debug(`Getting notifications for uri ${uri} with surface ${notificationSurface}`);
        const notificationsForUri = this.notifications.get(uri.toString()) ?? new Map();
        switch (notificationSurface) {
            case NotificationSurface.Banner:
                return this.getBannerNotifications(notificationsForUri);
            case NotificationSurface.Badge:
                return this.getBadgeNotifications(notificationsForUri);
            case NotificationSurface.All:
                return notificationsForUri;
            default:
                const error = new Error(`Unknown notification surface: ${notificationSurface}`);
                Logger.error(error);
                throw error;
        }
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
        this.onNotificationChange(uri);
    }

    public removeNotification(uri: Uri, notification: AtlasCodeNotification): void {
        Logger.debug(`Removing notification with id ${notification.id} for uri ${uri}`);
        const notificationsForUri = this.getNotificationsByUri(uri, NotificationSurface.All);
        if (!notificationsForUri.has(notification.id)) {
            Logger.debug(`Notification with id ${notification.id} does not exist for uri ${uri}`);
            return;
        }
        notificationsForUri.delete(notification.id);
        if (notificationsForUri.size === 0) {
            this.notifications.delete(uri.toString());
        }

        this.onNotificationChange(uri);
    }

    public clearNotifications(uri: Uri): void {
        Logger.debug(`Clearing notifications for uri ${uri}`);
        this.notifications.delete(uri.toString());
        this.onNotificationChange(uri);
    }

    private onNotificationChange(uri: Uri): void {
        Logger.debug(`Sending notification change for ${uri}`);
        this.delegates.forEach((delegate) => {
            delegate.onNotificationChange(uri);
        });
        Logger.debug(`Notification change sent for ${uri}`);
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
}
