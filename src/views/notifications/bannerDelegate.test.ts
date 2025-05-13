import { Uri, window } from 'vscode';

import { BannerDelegate } from './bannerDelegate';
import {
    NotificationAction,
    NotificationChangeEvent,
    NotificationSurface,
    NotificationType,
} from './notificationManager';

jest.mock('vscode', () => ({
    commands: {
        executeCommand: jest.fn(),
    },
    window: {
        showInformationMessage: jest.fn(() => Promise.resolve()),
    },
    Uri: {
        parse: jest.fn((uri: string) => ({ toString: () => uri })),
    },
}));
jest.mock('../../commands', () => ({
    Commands: {
        ShowJiraAuth: 'ShowJiraAuth',
    },
}));
jest.mock('../../container', () => ({
    Container: {
        analyticsClient: {
            sendTrackEvent: jest.fn(),
        },
    },
}));
jest.mock('../../analytics', () => ({
    notificationChangeEvent: jest.fn().mockResolvedValue({}),
}));
jest.mock('./notificationManager', () => ({
    NotificationManagerImpl: {
        getInstance: jest.fn(() => ({
            registerDelegate: jest.fn(),
        })),
    },
    NotificationSurface: {
        Banner: 'Banner',
    },
    NotificationAction: {
        Added: 'Added',
        Removed: 'Removed',
    },
    NotificationType: {
        LoginNeeded: 'LoginNeeded',
    },
}));

describe('BannerDelegate', () => {
    let bannerDelegate: BannerDelegate;
    const SHORT_TIMEOUT = 500; // Short timeout for testing

    beforeEach(() => {
        jest.clearAllMocks();
        bannerDelegate = BannerDelegate.getInstance();
    });

    it('should return the same instance for getInstance', () => {
        const instance1 = BannerDelegate.getInstance();
        const instance2 = BannerDelegate.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should return the correct surface', () => {
        expect(bannerDelegate.getSurface()).toBe(NotificationSurface.Banner);
    });

    it('should add notifications to the pile and update the timer on notification change and post notifications after a short time', () => {
        jest.useFakeTimers();
        const event: NotificationChangeEvent = {
            action: NotificationAction.Added,
            uri: Uri.parse('file://test'),
            notifications: new Map([
                [
                    'testKey',
                    {
                        id: 'testId',
                        message: 'Test notification',
                        notificationType: NotificationType.LoginNeeded,
                    },
                ],
            ]),
        };

        bannerDelegate.onNotificationChange(event);

        // Verify that the event was added to the pile
        expect((bannerDelegate as any).pile.size).toBe(1);

        // Verify that the timer was set
        expect((bannerDelegate as any).timer).toBeDefined();

        // Verify that after a short time, the timer will trigger the display of the notification
        jest.advanceTimersByTime(SHORT_TIMEOUT); // Simulate the passage of time
        expect(window.showInformationMessage).toHaveBeenCalledTimes(1);
        expect((bannerDelegate as any).timer).toBeUndefined();
        expect((bannerDelegate as any).pile.size).toBe(0); // Pile should be cleared after showing the notification
        jest.useRealTimers();
    });

    it('should delay the display of notifications if multiple events are added within a short time', () => {
        jest.useFakeTimers();
        const event1: NotificationChangeEvent = {
            action: NotificationAction.Added,
            uri: Uri.parse('file://test1'),
            notifications: new Map([
                [
                    'testKey1',
                    {
                        id: 'testId1',
                        message: 'Test notification 1',
                        notificationType: NotificationType.LoginNeeded,
                    },
                ],
            ]),
        };
        const event2: NotificationChangeEvent = {
            action: NotificationAction.Added,
            uri: Uri.parse('file://test2'),
            notifications: new Map([
                [
                    'testKey2',
                    {
                        id: 'testId2',
                        message: 'Test notification 2',
                        notificationType: NotificationType.LoginNeeded,
                    },
                ],
            ]),
        };
        bannerDelegate.onNotificationChange(event1);
        jest.advanceTimersByTime(SHORT_TIMEOUT / 2); // Simulate the passage of time

        // verify that timer has not yet triggered
        expect(window.showInformationMessage).not.toHaveBeenCalled();
        expect((bannerDelegate as any).timer).toBeDefined();
        expect((bannerDelegate as any).pile.size).toBe(1); // Pile should still contain the first event

        // Add a second event before the timer triggers
        bannerDelegate.onNotificationChange(event2);
        jest.advanceTimersByTime(SHORT_TIMEOUT / 2); // Simulate the passage of time

        // verify that the timer has still not yet triggered
        expect(window.showInformationMessage).not.toHaveBeenCalled();
        expect((bannerDelegate as any).timer).toBeDefined();
        expect((bannerDelegate as any).pile.size).toBe(2); // Pile should now contain both events

        // Advance the timer to trigger the display of notifications
        jest.advanceTimersByTime(SHORT_TIMEOUT / 2 + 1); // Simulate the passage of time

        // Verify that the notifications are displayed
        expect(window.showInformationMessage).toHaveBeenCalledTimes(2);
        expect((bannerDelegate as any).timer).toBeUndefined(); // Timer should be cleared
        expect((bannerDelegate as any).pile.size).toBe(0); // Pile should be cleared after showing the notifications
        jest.useRealTimers();
    });

    it('should not add notifications to the pile if the action is Removed', () => {
        jest.useFakeTimers();

        const event: NotificationChangeEvent = {
            action: NotificationAction.Removed,
            uri: Uri.parse('file://test'),
            notifications: new Map(),
        };

        bannerDelegate.onNotificationChange(event);
        jest.advanceTimersByTime(SHORT_TIMEOUT); // Simulate the passage of time
        // Verify that the pile remains empty
        expect((bannerDelegate as any).pile.size).toBe(0);
        jest.useRealTimers();
    });
});
