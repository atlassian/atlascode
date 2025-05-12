import { notificationChangeEvent } from 'src/analytics';
import { Uri } from 'vscode';

import { AnalyticsClient } from '../../analytics-node-client/src/client.min';
import { Container } from '../../container';
import {
    NotificationAction,
    NotificationChangeEvent,
    NotificationDelegate,
    NotificationManagerImpl,
    NotificationSurface,
} from './notificationManager';

export class BannerDelegate implements NotificationDelegate {
    private static bannerDelegateSingleton: BannerDelegate | undefined = undefined;
    private _analyticsClient: AnalyticsClient;

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
        const { action, uri, notifications } = event;
        if (action === NotificationAction.Removed) {
            return;
        }

        const newBannerValue = notifications.size;
        this.analytics(uri, newBannerValue);
    }

    private analytics(uri: Uri, count: number) {
        if (count === 0) {
            return;
        }
        notificationChangeEvent(uri, NotificationSurface.Banner, count).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }
}
