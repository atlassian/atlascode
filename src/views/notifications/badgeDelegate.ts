import { CancellationToken, EventEmitter, FileDecorationProvider, ThemeColor, TreeView, Uri, window } from 'vscode';

import { notificationChangeEvent } from '../../analytics';
import { AnalyticsClient } from '../../analytics-node-client/src/client.min';
import { Container } from '../../container';
import { NotificationDelegate, NotificationManagerImpl, NotificationSurface } from './notificationManager';

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

    public onNotificationChange(uri: Uri): void {
        const newBadgeValue = NotificationManagerImpl.getInstance().getNotificationsByUri(
            uri,
            NotificationSurface.Badge,
        ).size;
        const oldBadgeValue = this.badgesRegistration[uri.toString()];
        this.registerBadgeValueByUri(newBadgeValue, uri);
        const badgeCountDelta = this.updateOverallCount(newBadgeValue, oldBadgeValue);
        this.analytics(uri, badgeCountDelta);
        this.setExtensionBadge();
        this._onDidChangeFileDecorations.fire(uri);
    }

    private _onDidChangeFileDecorations = new EventEmitter<undefined | Uri | Uri[]>();

    public readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

    public provideFileDecoration(uri: Uri, token: CancellationToken) {
        const newBadgeValue = NotificationManagerImpl.getInstance().getNotificationsByUri(
            uri,
            NotificationSurface.Badge,
        ).size;
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

    private updateOverallCount(newBadgeValue: number | undefined, oldBadgeValue: number | undefined): number {
        if (newBadgeValue === undefined) {
            newBadgeValue = 0;
        }
        if (oldBadgeValue === undefined) {
            oldBadgeValue = 0;
        }

        const delta = newBadgeValue - oldBadgeValue;
        this.overallCount += delta;

        if (this.overallCount < 0) {
            this.overallCount = 0;
        }

        return delta;
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

    private analytics(uri: Uri, badgeCountDelta: number): void {
        if (badgeCountDelta === 0) {
            return;
        }
        notificationChangeEvent(uri, NotificationSurface.Badge, badgeCountDelta).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }
}
