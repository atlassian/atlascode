import { ThemeColor, TreeView, Uri, window } from 'vscode';

import { ProductJira } from '../../atlclients/authInfo';
import { BadgeDelegate } from './badgeDelegate';
import {
    AtlasCodeNotification,
    NotificationManagerImpl,
    NotificationSurface,
    NotificationType,
} from './notificationManager';

jest.mock('../../analytics', () => ({
    notificationChangeEvent: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../container', () => ({
    Container: {
        analyticsClient: {
            sendTrackEvent: jest.fn(),
        },
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
    NotificationAction: {
        Added: 'Added',
        Removed: 'Removed',
    },
    NotificationType: {
        LoinNeeded: 'LoginNeeded',
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

    it('should update badge values for different notification counts', () => {
        const uri = Uri.parse('file://test1');
        const notification1: AtlasCodeNotification = {
            id: 'notification1',
            message: 'Test notification 1',
            notificationType: NotificationType.LoginNeeded,
            uri: uri,
            product: ProductJira,
            timestamp: Date.now(),
        };
        const notification2: AtlasCodeNotification = {
            id: 'notification2',
            message: 'Test notification 2',
            notificationType: NotificationType.LoginNeeded,
            uri: uri,
            product: ProductJira,
            timestamp: Date.now(),
        };

        // Case 1: 0 notifications
        (NotificationManagerImpl.getInstance().getNotificationsByUri as jest.Mock).mockReturnValue(new Map());
        badgeDelegate.provideFileDecoration(uri, {} as any);
        expect(NotificationManagerImpl.getInstance().getNotificationsByUri).toHaveBeenCalledTimes(1);
        expect(treeViewMock.badge).toEqual({ tooltip: '0 notifications', value: 0 });

        // Case 2: 1 notification
        (NotificationManagerImpl.getInstance().getNotificationsByUri as jest.Mock).mockReturnValue(
            new Map([[notification1.id, notification1]]),
        );
        // Create a real Map with a notification object that includes the uri
        badgeDelegate.provideFileDecoration(uri, {} as any);
        expect(treeViewMock.badge).toEqual({
            value: 1,
            tooltip: '1 notification',
        });

        // Case 3: 2 notifications
        (NotificationManagerImpl.getInstance().getNotificationsByUri as jest.Mock).mockReturnValue(
            new Map([
                [notification1.id, notification1],
                [notification2.id, notification2],
            ]),
        );
        badgeDelegate.provideFileDecoration(uri, {} as any);
        expect(treeViewMock.badge).toEqual({
            value: 2,
            tooltip: '2 notifications',
        });

        // Case 4: Back to 1 notification
        (NotificationManagerImpl.getInstance().getNotificationsByUri as jest.Mock).mockReturnValue(
            new Map([[notification1.id, notification1]]),
        );
        badgeDelegate.provideFileDecoration(uri, {} as any);
        expect(treeViewMock.badge).toEqual({
            value: 1,
            tooltip: '1 notification',
        });

        // Case 5: Back to 0 notifications
        (NotificationManagerImpl.getInstance().getNotificationsByUri as jest.Mock).mockReturnValue(new Map());
        badgeDelegate.provideFileDecoration(uri, {} as any);
        expect(treeViewMock.badge).toEqual({
            value: 0,
            tooltip: '0 notifications',
        });
    });

    it('should provide file decoration for multiple URIs', () => {
        const uri1 = Uri.parse('file://test1');
        const uri2 = Uri.parse('file://test2');

        const mockNotificationsUri1 = new Set(['notification1', 'notification2']);
        const mockNotificationsUri2 = new Set(['notification1']);

        (NotificationManagerImpl.getInstance().getNotificationsByUri as jest.Mock).mockImplementation((uri) => {
            if (uri.toString() === uri1.toString()) {
                return mockNotificationsUri1;
            } else if (uri.toString() === uri2.toString()) {
                return mockNotificationsUri2;
            }
            return new Set();
        });

        const decorationUri1 = badgeDelegate.provideFileDecoration(uri1, {} as any);
        const decorationUri2 = badgeDelegate.provideFileDecoration(uri2, {} as any);

        expect(NotificationManagerImpl.getInstance().getNotificationsByUri).toHaveBeenCalledWith(
            uri1,
            NotificationSurface.Badge,
        );
        expect(decorationUri1).toEqual({
            badge: '2',
            tooltip: '2 notifications',
            color: new ThemeColor('activityBarBadge.background'),
            propagate: false,
        });

        expect(NotificationManagerImpl.getInstance().getNotificationsByUri).toHaveBeenCalledWith(
            uri2,
            NotificationSurface.Badge,
        );
        expect(decorationUri2).toEqual({
            badge: '1',
            tooltip: '1 notification',
            color: new ThemeColor('activityBarBadge.background'),
            propagate: false,
        });
    });
});
