import { Logger } from 'src/logger';
import { Uri } from 'vscode';

export interface AtlassianNotification {
    id: string;
    message: string;
}

export interface NotificationManager {
    getNotificationsByUri(uri: Uri): Map<string, AtlassianNotification>;
    addNotification(uri: Uri, notification: AtlassianNotification): void;
    removeNotification(uri: Uri, notification: AtlassianNotification): void;
    clearNotifications(uri: Uri): void;
}

export interface NotificationDelegate {
    onNotificationChange(uri: Uri): void;
}

export class NotificationManagerImpl implements NotificationManager {
    private notifications: Map<string, Map<string, AtlassianNotification>> = new Map();
    private static instance: NotificationManagerImpl;
    private delegates: NotificationDelegate[] = [];

    private constructor() {}

    public static getSingleton(): NotificationManager {
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

    public getNotificationsByUri(uri: Uri): Map<string, AtlassianNotification> {
        Logger.debug(`Getting notifications for uri ${uri}`);
        return this.notifications.get(uri.toString()) ?? new Map();
    }

    public addNotification(uri: Uri, notification: AtlassianNotification): void {
        Logger.debug(`Adding notification with id ${notification.id} for uri ${uri}`);
        const notificationsForUri = this.getNotificationsByUri(uri);
        if (notificationsForUri.has(notification.id)) {
            Logger.debug(`Notification with id ${notification.id} already exists for uri ${uri}`);
            return;
        }

        notificationsForUri.set(notification.id, notification);
        this.notifications.set(uri.toString(), notificationsForUri);
        this.onNotificationChange(uri);
    }

    public removeNotification(uri: Uri, notification: AtlassianNotification): void {
        Logger.debug(`Removing notification with id ${notification.id} for uri ${uri}`);
        const notificationsForUri = this.getNotificationsByUri(uri);
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
}
