import { Logger } from 'src/logger';

export interface AtlassianNotification {
    id: string;
    message: string;
}

export interface NotificationManager {
    getNotificationsByUri(uri: string): Map<string, AtlassianNotification>;
    addNotification(uri: string, notification: AtlassianNotification): void;
    removeNotification(uri: string, notification: AtlassianNotification): void;
    clearNotifications(uri: string): void;
}

export class NotificationManagerImpl implements NotificationManager {
    private notifications: Map<string, Map<string, AtlassianNotification>> = new Map();
    private static instance: NotificationManagerImpl;

    private constructor() {}

    public static getSingleton(): NotificationManager {
        if (!NotificationManagerImpl.instance) {
            NotificationManagerImpl.instance = new NotificationManagerImpl();
        }
        return NotificationManagerImpl.instance;
    }

    public getNotificationsByUri(uri: string): Map<string, AtlassianNotification> {
        return this.notifications.get(uri) || new Map();
    }

    public addNotification(uri: string, notification: AtlassianNotification): void {
        const notificationsForUri = this.getNotificationsByUri(uri);
        if (notificationsForUri.has(notification.id)) {
            Logger.debug(`Notification with id ${notification.id} already exists for uri ${uri}`);
            return;
        }

        notificationsForUri.set(notification.id, notification);
        this.notifications.set(uri, notificationsForUri);
    }

    public removeNotification(uri: string, notification: AtlassianNotification): void {
        const notificationsForUri = this.getNotificationsByUri(uri);
        if (!notificationsForUri.has(notification.id)) {
            Logger.debug(`Notification with id ${notification.id} does not exist for uri ${uri}`);
            return;
        }
        notificationsForUri.delete(notification.id);
        if (notificationsForUri.size === 0) {
            this.notifications.delete(uri);
        }
    }

    public clearNotifications(uri: string): void {
        this.notifications.delete(uri);
    }
}
