import { Commands } from 'src/commands';
import { commands, window } from 'vscode';

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
    // private _analyticsClient: AnalyticsClient;
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
        // this._analyticsClient = Container.analyticsClient;
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

        this.updateTimer();
    }

    private updateTimer() {
        // Updates the timer: after an event is added, the timer waits for a short time for any additional events.
        // If any new events are added, the timer is reset.
        // if no new events are added within a short time, the timer will trigger the display of the notification.

        // If the timer is already running, clear it.
        if (this.timer) {
            clearTimeout(this.timer);
        }

        // Set a new timer to trigger after a short time.
        this.timer = setTimeout(() => {
            this.aggregateAndShowNotifications();
            this.pile.clear();
            this.timer = undefined;
        }, 500);
    }

    private aggregateAndShowNotifications() {
        // get each notification in the pile
        // and show the notification
        this.pile.forEach((event) => {
            if (event.action === NotificationAction.Added) {
                event.notifications.forEach((notification) => {
                    this.showNotification(
                        notification.message,
                        this.makeActionText(notification),
                        this.makeActionFunction(notification),
                        this.makeDismissText(notification),
                        this.makeDismissFunction(notification),
                    );
                });
            }
        });
    }

    private showNotification(
        message: string,
        yesText: string,
        yesAction: () => void,
        dismissText?: string,
        dismissAction?: () => void,
    ) {
        let displayedNotification;
        if (dismissText) {
            displayedNotification = window.showInformationMessage(message, yesText, dismissText);
        } else {
            displayedNotification = window.showInformationMessage(message, yesText);
        }

        displayedNotification.then((selection) => {
            switch (selection) {
                case yesText:
                    yesAction();
                    break;
                case dismissText:
                    dismissAction?.();
                    break;
                default:
                    break;
            }
        });
    }

    private makeActionText(notification: AtlasCodeNotification): string {
        switch (notification.notificationType) {
            case NotificationType.LoginNeeded:
                return 'Log in to Jira';
            default:
                throw new Error(`Cannot make action text: Unknown notification type: ${notification.notificationType}`);
        }
    }

    private makeDismissText(notification: AtlasCodeNotification): string | undefined {
        switch (notification.notificationType) {
            case NotificationType.LoginNeeded:
                return 'Manage Notifications';
            default:
                return undefined;
        }
    }

    private makeActionFunction(notification: AtlasCodeNotification): () => void {
        switch (notification.notificationType) {
            case NotificationType.LoginNeeded:
                return () => {
                    commands.executeCommand(Commands.ShowJiraAuth);
                };
            default:
                throw new Error(`Cannot make action text: Unknown notification type: ${notification.notificationType}`);
        }
    }

    private makeDismissFunction(notification: AtlasCodeNotification): undefined | (() => void) {
        switch (notification.notificationType) {
            case NotificationType.LoginNeeded:
                return () => {};
            default:
                return undefined;
        }
    }

    // private analytics(uri: Uri, count: number) {
    //     if (count === 0) {
    //         return;
    //     }
    //     notificationChangeEvent(uri, NotificationSurface.Banner, count).then((e) => {
    //         this._analyticsClient.sendTrackEvent(e);
    //     });
    // }
}
