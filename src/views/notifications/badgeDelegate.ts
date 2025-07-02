import { CancellationToken, EventEmitter, FileDecorationProvider, ThemeColor, TreeView, Uri, window } from 'vscode';

import { notificationChangeEvent } from '../../analytics';
import { AnalyticsClient } from '../../analytics-node-client/src/client.min';
import { Container } from '../../container';
import {
    NotificationAction,
    NotificationChangeEvent,
    NotificationDelegate,
    NotificationManagerImpl,
    NotificationSurface,
} from './notificationManager';
import { determineNotificationSource } from './notificationSources';

export class BadgeDelegate implements FileDecorationProvider, NotificationDelegate {
    private static badgeDelegateSingleton: BadgeDelegate | undefined = undefined;
    private overallCount = 0;
    private badgesRegistration: Record<string, number> = {};
    private _analyticsClient: AnalyticsClient;

    public static initialize(treeViewParent: TreeView<any>): void {
        if (this.badgeDelegateSingleton) {
            throw new Error('BadgeDelegate already initialized.');
        }
        this.badgeDelegateSingleton = new BadgeDelegate(treeViewParent);
        NotificationManagerImpl.getInstance().registerDelegate(this.badgeDelegateSingleton);
    }

    public static getInstance(): BadgeDelegate {
        if (!this.badgeDelegateSingleton) {
            throw new Error('BadgeDelegate has not been initialized. Call initialize() first.');
        }
        return this.badgeDelegateSingleton!;
    }

    private constructor(private treeViewParent: TreeView<any>) {
        window.registerFileDecorationProvider(this);
        this._analyticsClient = Container.analyticsClient;
    }

    public getSurface(): NotificationSurface {
        return NotificationSurface.Badge;
    }

    public onNotificationChange(event: NotificationChangeEvent): void {
        // iterate though the URIs in the event and update the badges
        if (event.action === NotificationAction.Removed || event.action === NotificationAction.MarkedAsRead) {
            event.notifications.forEach((notification) => {
                if (!this.badgesRegistration[notification.uri.toString()]) {
                    return;
                }
                const uri = notification.uri;
                const newBadgeValue = 0;
                const oldBadgeValue = this.badgesRegistration[uri.toString()];
                delete this.badgesRegistration[uri.toString()];
                this.updateOverallCount(oldBadgeValue, newBadgeValue);
            });
        }

        this._onDidChangeFileDecorations.fire(undefined);
    }

    private _onDidChangeFileDecorations = new EventEmitter<undefined | Uri | Uri[]>();

    public readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

    private updateOverallCount(oldBadgeValue: number, newBadgeValue: number): void {
        this.overallCount += newBadgeValue - oldBadgeValue;

        this.setExtensionBadge();
    }

    public provideFileDecoration(uri: Uri, token: CancellationToken) {
        const oldBadgeValue = this.badgesRegistration[uri.toString()] || 0;
        const newBadgeValue = NotificationManagerImpl.getInstance().getNotificationsByUri(
            uri,
            NotificationSurface.Badge,
        ).size;
        this.registerBadgeValueByUri(newBadgeValue, uri);
        this.updateOverallCount(oldBadgeValue, newBadgeValue);
        this.analytics(uri, newBadgeValue, oldBadgeValue);
        return this.constructItemBadge(newBadgeValue);
    }

    private registerBadgeValueByUri(newBadgeValue: number, uri: Uri) {
        if (newBadgeValue === 0) {
            delete this.badgesRegistration[uri.toString()];
        } else {
            this.badgesRegistration[uri.toString()] = newBadgeValue;
        }
    }

    private setExtensionBadge() {
        this.treeViewParent.badge = {
            value: this.overallCount,
            tooltip: this.overallToolTip(),
        };
    }

    private constructItemBadge(newBadgeValue: number) {
        if (newBadgeValue <= 0) {
            return undefined;
        }

        return {
            badge: newBadgeValue > 10 ? '10+' : newBadgeValue.toString(),
            tooltip: newBadgeValue === 1 ? '1 notification' : `${newBadgeValue} notifications`,
            color: new ThemeColor('activityBarBadge.background'),
            propagate: false,
        };
    }

    private overallToolTip(): string {
        return this.overallCount === 1 ? '1 notification' : `${this.overallCount} notifications`;
    }

    private analytics(uri: Uri, newBadgeValue: number, oldBadgeValue: number): void {
        const safeNewBadgeValue = newBadgeValue ?? 0;
        const safeOldBadgeValue = oldBadgeValue ?? 0;
        const badgeCountDelta = safeNewBadgeValue - safeOldBadgeValue;

        if (badgeCountDelta === 0) {
            return;
        }
        notificationChangeEvent(determineNotificationSource(uri), uri, NotificationSurface.Badge, badgeCountDelta).then(
            (e) => {
                this._analyticsClient.sendTrackEvent(e);
            },
        );
    }
}
