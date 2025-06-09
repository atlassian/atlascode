jest.mock('../../container', () => ({
    Container: {
        config: {
            jira: {
                enabled: true,
            },
        },
        siteManager: {
            numberOfAuthedSites: jest.fn().mockReturnValue(0),
        },
        credentialManager: {
            onDidAuthChange: jest.fn(),
        },
    },
}));

jest.mock('../../config/configuration', () => ({
    configuration: {
        onDidChange: jest.fn(),
        changed: jest.fn().mockReturnValue(true),
    },
}));

const addNotificationSpy = jest.fn();
const clearNotificationByUriSpy = jest.fn();
jest.mock('./notificationManager', () => {
    const NotificationManagerImpl = {
        getInstance: jest.fn().mockReturnValue({
            addNotification: addNotificationSpy,
            clearNotificationsByUri: clearNotificationByUriSpy,
        }),
    };
    const NotificationType = {
        LoginNeeded: 'LoginNeeded',
    };
    return { NotificationManagerImpl, NotificationType };
});

import { Container } from '../../container';
import { AuthNotifier } from './authNotifier';

describe('AuthNotifier', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Container.config.jira.enabled = true;
        Container.siteManager.numberOfAuthedSites = jest.fn().mockReturnValue(0);
    });

    afterEach(() => {});

    it('should create a singleton instance', () => {
        const instance1 = AuthNotifier.getInstance();
        const instance2 = AuthNotifier.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should add a notification when there are no authenticated sites', () => {
        const authNotifier = AuthNotifier.getInstance();

        authNotifier.fetchNotifications();

        expect(addNotificationSpy).toHaveBeenCalled();
        expect(clearNotificationByUriSpy).not.toHaveBeenCalled();
    });

    it('should clear notifications when there are authenticated sites', () => {
        Container.siteManager.numberOfAuthedSites = jest.fn().mockReturnValue(1);
        const authNotifier = AuthNotifier.getInstance();

        authNotifier.fetchNotifications();

        expect(addNotificationSpy).not.toHaveBeenCalled();
        expect(clearNotificationByUriSpy).toHaveBeenCalled();
    });

    it('should clear notifications when jira is disabled', () => {
        Container.config.jira.enabled = false;
        AuthNotifier.getInstance().onDidChangeConfiguration({
            affectsConfiguration: jest.fn().mockReturnValue(true),
        } as any);
        const authNotifier = AuthNotifier.getInstance();

        authNotifier.fetchNotifications();

        expect(addNotificationSpy).not.toHaveBeenCalled();
        expect(clearNotificationByUriSpy).toHaveBeenCalled();
    });
});
