import { commands, Uri, window } from 'vscode';

import { notificationChangeEvent } from '../../analytics';
import { AnalyticsClient } from '../../analytics-node-client/src/client.min';
import { Commands } from '../../commands';
import { Container } from '../../container';
import {
    AtlasCodeNotification,
    NotificationAction,
    NotificationChangeEvent,
    NotificationDelegate,
    NotificationManagerImpl,
    NotificationSurface,
    NotificationType,
} from './notificationManager';

export class BannerDelegate implements NotificationDelegate {
    private static bannerDelegateSingleton: BannerDelegate | undefined = undefined;
    private _analyticsClient: AnalyticsClient;
    private pile: Set<NotificationChangeEvent> = new Set();
    private timer: NodeJS.Timeout | undefined;

    public static getInstance(): BannerDelegate {
        if (!this.bannerDelegateSingleton) {
            this.bannerDelegateSingleton = new BannerDelegate();
            NotificationManagerImpl.getInstance().registerDelegate(this.bannerDelegateSingleton);
        }
        return this.bannerDelegateSingleton!;
    }

    private constructor() {
        this._analyticsClient = Container.analyticsClient;
    }

    public getSurface(): NotificationSurface {
        return NotificationSurface.Banner;
    }

    public onNotificationChange(event: NotificationChangeEvent): void {
        if (event.action === NotificationAction.Removed) {
            return;
        }

        // Adds to the "pile of notifications" for the given URI.
        this.pile.add(event);

        this.scheduleNotificationDisplay();
    }

    private scheduleNotificationDisplay() {
        this.clearExistingSchedule();
        this.createNewSchedule();
    }

    private createNewSchedule() {
        this.timer = setTimeout(() => {
            this.aggregateAndShowNotifications();
        }, 500);
    }

    private clearExistingSchedule() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
    }

    private aggregateAndShowNotifications() {
        // for now, this simply shows all notifications in the pile with no aggregation. In the future, this should group notifications by notification type.
        this.pile.forEach((event) => {
            let count = 0;
            if (event.action === NotificationAction.Added) {
                event.notifications.forEach((notification) => {
                    this.showNotification(
                        notification,
                        this.makeActionText(notification),
                        this.makeActionFunction(notification),
                    );
                    count++;
                });
            }
            this.analyticsBannerShown(event.uri, count);
        });
        this.pile.clear();
        this.timer = undefined;
    }

    private showNotification(notification: AtlasCodeNotification, yesText: string, yesAction: () => void) {
        const displayedNotification = window.showInformationMessage(notification.message, yesText);

        displayedNotification.then((selection) => {
            switch (selection) {
                case yesText:
                    yesAction();
                    break;
                default:
                    break;
            }
        });
    }

    private makeActionText(notification: AtlasCodeNotification): string {
        switch (notification.notificationType) {
            case NotificationType.NewCommentOnJira:
                return 'Reply';
            case NotificationType.AssignedToYou:
                return 'View Assigned Work Item';
            case NotificationType.LoginNeeded:
                return 'Log in to Jira';
            default:
                throw new Error(`Cannot make action text: Unknown notification type: ${notification.notificationType}`);
        }
    }

    private makeActionFunction(notification: AtlasCodeNotification): () => void {
        switch (notification.notificationType) {
            case NotificationType.NewCommentOnJira:
                return () => {};
            case NotificationType.AssignedToYou:
                return () => {};
            case NotificationType.LoginNeeded:
                return () => {
                    commands.executeCommand(Commands.ShowJiraAuth);
                };
            default:
                throw new Error(`Cannot make action text: Unknown notification type: ${notification.notificationType}`);
        }
    }

    private analyticsBannerShown(uri: Uri, count: number) {
        notificationChangeEvent(uri, NotificationSurface.Banner, count).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }
}
