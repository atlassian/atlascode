import { window } from 'vscode';

import {
    NotificationAction,
    NotificationChangeEvent,
    NotificationDelegate,
    NotificationManagerImpl,
    NotificationSurface,
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
        this.showNotification(
            'hi!',
            'Yes',
            () => {},
            'Dismiss',
            () => {},
        );
    }

    private showNotification(
        message: string,
        yesText: string,
        yesAction: () => void,
        dismissText: string,
        dismissAction: () => void,
    ) {
        const manageNotifications = 'Manage Notifications';
        const manageNotificationsAction = () => {};
        window.showInformationMessage(message, yesText, dismissText, manageNotifications).then((selection) => {
            switch (selection) {
                case yesText:
                    yesAction();
                    break;
                case dismissText:
                    dismissAction();
                    break;
                case manageNotifications:
                    manageNotificationsAction();
                    break;
                default:
                    break;
            }
        });
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
