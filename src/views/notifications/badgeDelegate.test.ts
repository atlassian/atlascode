import { ThemeColor, TreeView, Uri, window } from 'vscode';

import { BadgeDelegate } from './badgeDelegate';
import { NotificationManagerImpl, NotificationSurface } from './notificationManager';

jest.mock('vscode', () => ({
    EventEmitter: jest.fn().mockImplementation(() => ({
        fire: jest.fn(),
        event: jest.fn(),
    })),
    ThemeColor: jest.fn(),
    Uri: {
        parse: jest.fn((uri: string) => ({ toString: () => uri })),
    },
    window: {
        registerFileDecorationProvider: jest.fn(),
    },
}));

jest.mock('./notificationManager', () => ({
    NotificationManagerImpl: {
        getInstance: jest.fn().mockReturnValue({
            registerDelegate: jest.fn(),
            getNotificationsByUri: jest.fn(),
        }),
    },
    NotificationSurface: {
        Badge: 'Badge',
    },
}));

describe('BadgeDelegate', () => {
    let treeViewMock: TreeView<any>;
    let badgeDelegate: BadgeDelegate;

    beforeAll(() => {
        treeViewMock = { badge: undefined } as unknown as TreeView<any>;
        BadgeDelegate.initialize(treeViewMock);
        badgeDelegate = BadgeDelegate.getInstance();
    });
    beforeEach(() => {});

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize and register the delegate', () => {
        expect(window.registerFileDecorationProvider).toHaveBeenCalledWith(badgeDelegate);
        expect(NotificationManagerImpl.getInstance().registerDelegate).toHaveBeenCalledWith(badgeDelegate);
    });

    it('should return the singleton instance', () => {
        expect(BadgeDelegate.getInstance()).toBe(BadgeDelegate.getInstance());
    });

    it('should throw an error if trying to create multiple instances', () => {
        expect(() => BadgeDelegate.initialize(treeViewMock)).toThrow('BadgeDelegate already initialized.');
    });

    it('should update badge values', () => {
        const uri = Uri.parse('file://test');
        const mockNotifications = new Set(['notification1', 'notification2']);
        (NotificationManagerImpl.getInstance().getNotificationsByUri as jest.Mock).mockReturnValue(mockNotifications);

        badgeDelegate.onNotificationChange(uri);

        expect(NotificationManagerImpl.getInstance().getNotificationsByUri).toHaveBeenCalledWith(
            uri,
            NotificationSurface.Badge,
        );
        expect(treeViewMock.badge).toEqual({
            value: 2,
            tooltip: '2 notifications',
        });
    });

    it('should provide file decoration for a URI', () => {
        const uri = Uri.parse('file://test');
        const mockNotifications = new Set(['notification1']);
        (NotificationManagerImpl.getInstance().getNotificationsByUri as jest.Mock).mockReturnValue(mockNotifications);

        const decoration = badgeDelegate.provideFileDecoration(uri, {} as any);

        expect(NotificationManagerImpl.getInstance().getNotificationsByUri).toHaveBeenCalledWith(
            uri,
            NotificationSurface.Badge,
        );
        expect(decoration).toEqual({
            badge: '1️⃣',
            tooltip: '1 notification',
            color: new ThemeColor('editorForeground'),
            propagate: false,
        });
    });
});
