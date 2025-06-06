import { AuthInfo, AuthInfoState, ProductJira } from '../../atlclients/authInfo';
import { graphqlRequest } from '../../atlclients/graphql/graphqlClient';
import { Container } from '../../container';
import { AtlassianNotificationNotifier } from './atlassianNotificationNotifier';
import { NotificationManagerImpl } from './notificationManager';

jest.mock('../../container');
jest.mock('../../logger');
jest.mock('../../atlclients/graphql/graphqlClient');
jest.mock('./notificationManager');
jest.mock('../../util/featureFlags', () => ({
    FeatureFlagClient: {
        checkExperimentValue: jest.fn(() => true),
    },
}));

const mockGraphqlRequest = graphqlRequest as jest.MockedFunction<typeof graphqlRequest>;
const mockNotificationManager = NotificationManagerImpl.getInstance as jest.MockedFunction<
    typeof NotificationManagerImpl.getInstance
>;

describe('AtlassianNotificationNotifier', () => {
    let notifier: AtlassianNotificationNotifier;
    let mockAddNotification: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset the singleton instance
        (AtlassianNotificationNotifier as any).instance = undefined;

        mockAddNotification = jest.fn();
        mockNotificationManager.mockReturnValue({
            addNotification: mockAddNotification,
        } as any);

        // Mock Container.credentialManager
        (Container as any).credentialManager = {
            getAllValidAuthInfo: jest.fn(),
            onDidAuthChange: jest.fn(() => ({ dispose: jest.fn() })),
        };

        notifier = AtlassianNotificationNotifier.getInstance();
    });

    afterEach(() => {
        notifier.dispose();
    });

    it('should be a singleton', () => {
        const instance1 = AtlassianNotificationNotifier.getInstance();
        const instance2 = AtlassianNotificationNotifier.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should fetch notifications for all valid auth infos', async () => {
        // Create mock auth infos
        const authInfo1 = createMockAuthInfo('user1');
        const authInfo2 = createMockAuthInfo('user2');

        // Mock getAllValidAuthInfo to return 2 auth infos
        (Container.credentialManager.getAllValidAuthInfo as jest.Mock).mockResolvedValue([authInfo1, authInfo2]);

        // Mock unseen notification count responses
        mockGraphqlRequest
            .mockResolvedValueOnce({ notifications: { unseenNotificationCount: 2 } }) // user1 count
            .mockResolvedValueOnce({ notifications: { unseenNotificationCount: 1 } }) // user2 count
            .mockResolvedValueOnce({
                // user1 notifications
                notifications: {
                    notificationFeed: {
                        nodes: [createPRTextCommentNode(), createPRADFCommentNode()],
                    },
                },
            })
            .mockResolvedValueOnce({
                // user2 notifications
                notifications: {
                    notificationFeed: {
                        nodes: [createJiraCommentNode(), createRandomNonRelevantNode()],
                    },
                },
            });

        // Call fetchNotifications
        notifier.fetchNotifications();

        // Wait for all async operations to complete
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Verify that graphqlRequest was called for unseen count and notification details for both users
        expect(mockGraphqlRequest).toHaveBeenCalledTimes(4);

        // Verify that notifications were added (should only add PR and Jira comment notifications, not the random one)
        expect(mockAddNotification).toHaveBeenCalledTimes(3);
    });

    it('should not fetch notifications if rate limit is hit', async () => {
        const authInfo = createMockAuthInfo('user1');
        (Container.credentialManager.getAllValidAuthInfo as jest.Mock).mockResolvedValue([authInfo]);

        // First call should work
        mockGraphqlRequest.mockResolvedValue({ notifications: { unseenNotificationCount: 1 } });
        notifier.fetchNotifications();

        // Second call immediately should be rate limited
        mockGraphqlRequest.mockClear();
        notifier.fetchNotifications();

        // Should not make any new requests due to rate limiting
        expect(mockGraphqlRequest).not.toHaveBeenCalled();
    });

    it('should not fetch notifications if no new notifications', async () => {
        const authInfo = createMockAuthInfo('user1');
        (Container.credentialManager.getAllValidAuthInfo as jest.Mock).mockResolvedValue([authInfo]);

        // Mock same unseen count as before
        mockGraphqlRequest.mockResolvedValue({ notifications: { unseenNotificationCount: 5 } });

        // First call
        notifier.fetchNotifications();
        expect(mockGraphqlRequest).toHaveBeenCalledTimes(0); // unseen count, but not notification details

        mockGraphqlRequest.mockClear();

        // Advance time to avoid rate limiting
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 61000);

        // Second call with same count
        mockGraphqlRequest.mockResolvedValue({ notifications: { unseenNotificationCount: 5 } });
        notifier.fetchNotifications();

        // Should only call unseen count, not notification details since count didn't change
        expect(mockGraphqlRequest).toHaveBeenCalledTimes(0);

        jest.restoreAllMocks();
    });

    it('should handle auth change events', () => {
        // Simulate setting unseen count for user
        (notifier as any)._lastUnseenNotificationCount['user1'] = 5;

        // Simulate remove auth event
        const removeEvent = {
            type: 'remove',
            userId: 'user1',
            product: ProductJira,
            credentialId: 'cred1',
        };

        (notifier as any).onDidAuthChange(removeEvent);

        // Verify that the unseen count was reset
        expect((notifier as any)._lastUnseenNotificationCount['user1']).toBe(0);
    });
});

// Helper functions for creating test objects
function createMockAuthInfo(userId: string): AuthInfo {
    return {
        user: {
            id: userId,
            displayName: generateRandomString(),
            email: `${userId}@example.com`,
            avatarUrl: generateRandomUrl(),
        },
        state: AuthInfoState.Valid,
    };
}

function createPRTextCommentNode() {
    return {
        headNotification: {
            notificationId: generateRandomString(),
            timestamp: new Date().toISOString(),
            content: {
                url: `https://bitbucket.org/team/${generateRandomString()}/pull-requests/${generateRandomNumber()}`,
                message: `${generateRandomString()} commented on pull request`,
                bodyItems: [
                    {
                        document: {
                            format: 'text',
                            data: generateRandomString(),
                        },
                    },
                ],
            },
        },
    };
}

function createPRADFCommentNode() {
    const adfData = {
        content: [
            {
                content: [
                    {
                        type: 'text',
                        text: generateRandomString(),
                    },
                ],
            },
        ],
    };

    return {
        headNotification: {
            notificationId: generateRandomString(),
            timestamp: new Date().toISOString(),
            content: {
                url: `https://bitbucket.org/team/${generateRandomString()}/pull-requests/${generateRandomNumber()}`,
                message: `${generateRandomString()} commented on pull request`,
                bodyItems: [
                    {
                        document: {
                            format: 'ADF',
                            data: JSON.stringify(adfData),
                        },
                    },
                ],
            },
        },
    };
}

function createJiraCommentNode() {
    return {
        headNotification: {
            notificationId: generateRandomString(),
            timestamp: new Date().toISOString(),
            content: {
                url: `https://${generateRandomString()}.atlassian.net/browse/${generateRandomString().toUpperCase()}-${generateRandomNumber()}`,
                message: `${generateRandomString()} commented on issue`,
                bodyItems: [],
            },
        },
    };
}

function createRandomNonRelevantNode() {
    return {
        headNotification: {
            notificationId: generateRandomString(),
            timestamp: new Date().toISOString(),
            content: {
                url: `https://${generateRandomString()}.com/some/random/path`,
                message: `${generateRandomString()} did something random`,
                bodyItems: [],
            },
        },
    };
}

function generateRandomString(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateRandomNumber(min: number = 1, max: number = 9999): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomUrl(): string {
    return `https://${generateRandomString()}.com/${generateRandomString()}`;
}
