import { CancellationToken, EventEmitter, FileDecorationProvider, ThemeColor, TreeView, Uri, window } from 'vscode';

import { NotificationDelegate, NotificationManagerImpl } from './notificationManager';

export class BadgeDelegate implements FileDecorationProvider, NotificationDelegate {
    private static badgeDelegateSingleton: BadgeDelegate | undefined = undefined;

    public static initialize<T>(treeViewParent: TreeView<T>): BadgeDelegate {
        if (this.badgeDelegateSingleton) {
            return this.badgeDelegateSingleton;
        }
        this.badgeDelegateSingleton = new BadgeDelegate();
        return this.badgeDelegateSingleton;
    }

    public static getInstance(): BadgeDelegate {
        return this.badgeDelegateSingleton!;
    }

    private constructor() {
        if (BadgeDelegate.badgeDelegateSingleton) {
            throw new Error('An instance of BadgeDelegate already exists.');
        }

        window.registerFileDecorationProvider(this);
    }

    onNotificationChange(uri: Uri): void {
        this._onDidChangeFileDecorations.fire(uri);
    }
    private _onDidChangeFileDecorations = new EventEmitter<undefined | Uri | Uri[]>();
    public readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

    public provideFileDecoration(uri: Uri, token: CancellationToken) {
        const badgeValue = NotificationManagerImpl.getSingleton().getNotificationsByUri(uri).size;
        if (!badgeValue) {
            return undefined;
        }

        return {
            badge: this.getBadgeSymbol(badgeValue),
            tooltip: `${badgeValue} notifications`,
            color: new ThemeColor('editorForeground'),
            propagate: false,
        };
    }

    private getBadgeSymbol(value: number): string {
        switch (value) {
            default:
                return '🔔';
        }
    }
}
