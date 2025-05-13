import { Uri } from 'vscode';

import { NotificationManagerImpl } from './notificationManager';
import { AtlasCodeNotification, NotificationSurface, NotificationType } from './notificationManager';

const authNotifierFetchNotifications = jest.fn();
jest.mock('./authNotifier', () => ({
    AuthNotifier: {
        getInstance: jest.fn(() => ({
            onAuthChange: jest.fn(),
            fetchNotifications: authNotifierFetchNotifications,
        })),
    },
}));
jest.mock('../../container', () => ({
    Container: {
        analyticsClient: {
            sendTrackEvent: jest.fn(),
        },
    },
}));

describe('NotificationManagerImpl', () => {
    let notificationManager: NotificationManagerImpl;

    beforeEach(() => {
        notificationManager = NotificationManagerImpl.getInstance();
        notificationManager.stopListening(); // Ensure no listeners are running between tests
    });

    afterEach(() => {
        notificationManager.stopListening();
    });

    it('should return the same instance for getInstance', () => {
        const instance1 = NotificationManagerImpl.getInstance();
        const instance2 = NotificationManagerImpl.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should start and stop listening and notifiers should be called', () => {
        jest.useFakeTimers();
        const setIntervalMock = jest.spyOn(global, 'setInterval');
        const clearIntervalMock = jest.spyOn(global, 'clearInterval');

        notificationManager.listen();
        expect(setIntervalMock).toHaveBeenCalledTimes(1);

        // confirm that notifiers are run immediately
        expect(authNotifierFetchNotifications).toHaveBeenCalledTimes(1);

        // confirm that double listen does not create multiple intervals or multiple runNotifiers
        notificationManager.listen();
        expect(setIntervalMock).toHaveBeenCalledTimes(1);
        expect(authNotifierFetchNotifications).toHaveBeenCalledTimes(1);

        // confirm that notifiers are run every minute
        jest.advanceTimersByTime(60 * 1000);
        expect(authNotifierFetchNotifications).toHaveBeenCalledTimes(2);

        // confirm that stopListening clears the interval and stops the notifiers
        notificationManager.stopListening();
        expect(clearIntervalMock).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(60 * 1000);
        expect(authNotifierFetchNotifications).toHaveBeenCalledTimes(2); // should not be called again

        setIntervalMock.mockRestore();
        clearIntervalMock.mockRestore();
        jest.useRealTimers();
    });

    it('should register and unregister delegates', () => {
        const mockDelegate = {
            onNotificationChange: jest.fn(),
            getSurface: jest.fn(() => NotificationSurface.All),
        };
        notificationManager.registerDelegate(mockDelegate);
        const uri = Uri.parse(generateRandomFileUri());
        notificationManager.addNotification(uri, {
            id: '1',
            message: 'Test Notification',
            notificationType: NotificationType.AssignedToYou,
        });

        expect(mockDelegate.onNotificationChange).toHaveBeenCalledTimes(1);

        notificationManager.unregisterDelegate(mockDelegate);

        notificationManager.addNotification(uri, {
            id: '2',
            message: 'Another Test Notification',
            notificationType: NotificationType.AssignedToYou,
        });
        expect(mockDelegate.onNotificationChange).toHaveBeenCalledTimes(1);
    });

    it('should add and retrieve notifications by URI', () => {
        const uri = Uri.parse(generateRandomFileUri());
        const notification: AtlasCodeNotification = {
            id: '1',
            message: 'Test Notification',
            notificationType: NotificationType.AssignedToYou,
        };

        notificationManager.addNotification(uri, notification);
        const notifications = notificationManager.getNotificationsByUri(uri, NotificationSurface.All);
        expect(notifications.size).toBe(1);
        expect(notifications.get(notification.id)).toEqual(notification);
    });

    it('should not add duplicate notifications', () => {
        const uri = Uri.parse(generateRandomFileUri());
        const notification: AtlasCodeNotification = {
            id: '1',
            message: 'Test Notification',
            notificationType: NotificationType.AssignedToYou,
        };

        notificationManager.addNotification(uri, notification);
        notificationManager.addNotification(uri, notification);
        const notifications = notificationManager.getNotificationsByUri(uri, NotificationSurface.All);
        expect(notifications.size).toBe(1);
    });

    it('should clear all notifications for a URI', () => {
        const uri = Uri.parse(generateRandomFileUri());
        const notification1: AtlasCodeNotification = {
            id: '1',
            message: 'Test Notification 1',
            notificationType: NotificationType.AssignedToYou,
        };
        const notification2: AtlasCodeNotification = {
            id: '2',
            message: 'Test Notification 2',
            notificationType: NotificationType.NewCommentOnJira,
        };

        notificationManager.addNotification(uri, notification1);
        notificationManager.addNotification(uri, notification2);
        notificationManager.clearNotifications(uri);
        const notifications = notificationManager.getNotificationsByUri(uri, NotificationSurface.All);
        expect(notifications.size).toBe(0);
    });

    it('should filter notifications by surface type', () => {
        const uri = Uri.parse(generateRandomFileUri());
        const bannerOnlyNotification: AtlasCodeNotification = {
            id: '1',
            message: 'Banner Notification',
            notificationType: NotificationType.AssignedToYou,
        };
        const badgeAndBannerNotification: AtlasCodeNotification = {
            id: '2',
            message: 'Badge and Badge Notification',
            notificationType: NotificationType.LoginNeeded,
        };

        notificationManager.addNotification(uri, bannerOnlyNotification);
        notificationManager.addNotification(uri, badgeAndBannerNotification);

        const bannerNotifications = notificationManager.getNotificationsByUri(uri, NotificationSurface.Banner);
        expect(bannerNotifications.size).toBe(2);
        expect(bannerNotifications.get(bannerOnlyNotification.id)).toEqual(bannerOnlyNotification);
        expect(bannerNotifications.get(badgeAndBannerNotification.id)).toEqual(badgeAndBannerNotification);

        const badgeNotifications = notificationManager.getNotificationsByUri(uri, NotificationSurface.Badge);
        expect(badgeNotifications.size).toBe(1);
        expect(badgeNotifications.get(badgeAndBannerNotification.id)).toEqual(badgeAndBannerNotification);
    });
});

function generateRandomFileUri(): string {
    return `file://${Math.random().toString(36).substring(2)}`;
}
