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
        this.updateOverallCount(event);

        const uniqueUris = new Set<Uri>();
        event.notifications.forEach((notification) => {
            const uri = notification.uri;
            if (uri) {
                uniqueUris.add(uri);
            }
        });
        uniqueUris.forEach((uri) => {
            this._onDidChangeFileDecorations.fire(uri);
        });
    }

    private _onDidChangeFileDecorations = new EventEmitter<undefined | Uri | Uri[]>();

    public readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

    private updateOverallCount(event: NotificationChangeEvent) {
        switch (event.action) {
            case NotificationAction.Removed:
                this.overallCount -= event.notifications.size;
                break;
            case NotificationAction.Added:
                this.overallCount += event.notifications.size;
                break;
            default:
                return;
        }
        this.setExtensionBadge();
    }

    public provideFileDecoration(uri: Uri, token: CancellationToken) {
        const oldBadgeValue = this.badgesRegistration[uri.toString()];
        const newBadgeValue = NotificationManagerImpl.getInstance().getNotificationsByUri(
            uri,
            NotificationSurface.Badge,
        ).size;
        this.registerBadgeValueByUri(newBadgeValue, uri);

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
        if (newBadgeValue === 0) {
            return undefined;
        }
        return {
            badge: this.getBadgeSymbol(newBadgeValue),
            tooltip: newBadgeValue === 1 ? '1 notification' : `${newBadgeValue} notifications`,
            color: new ThemeColor('editorForeground'),
            propagate: false,
        };
    }

    private overallToolTip(): string {
        return this.overallCount === 1 ? '1 notification' : `${this.overallCount} notifications`;
    }

    private getBadgeSymbol(value: number): string {
        switch (value) {
            case 0:
                return '';
            case 1:
                return '1️⃣';
            case 2:
                return '2️⃣';
            case 3:
                return '3️⃣';
            case 4:
                return '4️⃣';
            case 5:
                return '5️⃣';
            case 6:
                return '6️⃣';
            case 7:
                return '7️⃣';
            case 8:
                return '8️⃣';
            case 9:
                return '9️⃣';
            case 10:
                return '🔟';
            default:
                return '🔟+';
        }
    }

    private analytics(uri: Uri, newBadgeValue: number, oldBadgeValue: number): void {
        const safeNewBadgeValue = newBadgeValue ?? 0;
        const safeOldBadgeValue = oldBadgeValue ?? 0;
        const badgeCountDelta = safeNewBadgeValue - safeOldBadgeValue;

        if (badgeCountDelta === 0) {
            return;
        }
        notificationChangeEvent(uri, NotificationSurface.Badge, badgeCountDelta).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }
}
