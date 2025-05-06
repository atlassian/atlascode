import { CancellationToken, EventEmitter, FileDecorationProvider, ThemeColor, TreeView, Uri, window } from 'vscode';

import { NotificationDelegate, NotificationManagerImpl, NotificationSurface } from './notificationManager';

export class BadgeDelegate implements FileDecorationProvider, NotificationDelegate {
    private static badgeDelegateSingleton: BadgeDelegate | undefined = undefined;
    private overallCount = 0;
    private badgesRegistration: Record<string, number> = {};

    public static initialize<T>(treeViewParent: TreeView<T>): BadgeDelegate {
        if (this.badgeDelegateSingleton) {
            return this.badgeDelegateSingleton;
        }
        this.badgeDelegateSingleton = new BadgeDelegate(treeViewParent);

        NotificationManagerImpl.getSingleton().registerDelegate(this.badgeDelegateSingleton);
        return this.badgeDelegateSingleton;
    }

    public static getInstance(): BadgeDelegate {
        return this.badgeDelegateSingleton!;
    }

    private constructor(private treeViewParent: TreeView<any>) {
        if (BadgeDelegate.badgeDelegateSingleton) {
            throw new Error('An instance of BadgeDelegate already exists.');
        }

        window.registerFileDecorationProvider(this);
    }

    onNotificationChange(uri: Uri): void {
        const newBadgeValue = NotificationManagerImpl.getSingleton().getNotificationsByUri(
            uri,
            NotificationSurface.Badge,
        ).size;
        const oldBadgeValue = this.badgesRegistration[uri.toString()];
        this.registerBadgeValueByUri(newBadgeValue, uri);
        this.updateOverallCount(newBadgeValue, oldBadgeValue);
        this.setExtensionBadge();
        this._onDidChangeFileDecorations.fire(uri);
    }
    private _onDidChangeFileDecorations = new EventEmitter<undefined | Uri | Uri[]>();
    public readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

    public provideFileDecoration(uri: Uri, token: CancellationToken) {
        const newBadgeValue = NotificationManagerImpl.getSingleton().getNotificationsByUri(
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
        return {
            badge: this.getBadgeSymbol(newBadgeValue),
            tooltip: `${newBadgeValue} notifications`,
            color: new ThemeColor('editorForeground'),
            propagate: false,
        };
    }

    private updateOverallCount(newBadgeValue: number | undefined, oldBadgeValue: number | undefined): void {
        if (newBadgeValue === undefined) {
            newBadgeValue = 0;
        }
        if (oldBadgeValue === undefined) {
            oldBadgeValue = 0;
        }

        this.overallCount += newBadgeValue - oldBadgeValue;

        if (this.overallCount < 0) {
            this.overallCount = 0;
        }
    }

    private overallToolTip(): string {
        return `${this.overallCount} notifications`;
    }

    private getBadgeSymbol(value: number): string {
        switch (value) {
            case 0:
                return '';
            default:
                return '🔔';
        }
    }
}
