import { MentionResourceConfig } from '@atlaskit/mention';

import { AtlascodeMentionProvider } from './AtlascodeMentionsProvider';

// Mock the AbstractMentionResource to avoid importing the full Atlaskit implementation
const mockNotifyListeners = jest.fn();

jest.mock('@atlaskit/mention', () => ({
    AbstractMentionResource: class {
        protected _notifyListeners = mockNotifyListeners;
        protected _notifyAllResultsListeners = jest.fn();
    },
    MentionNameStatus: {
        UNKNOWN: 'UNKNOWN',
        OK: 'OK',
        SERVICE_ERROR: 'SERVICE_ERROR',
    },
}));

describe('AtlascodeMentionProvider', () => {
    const mockFetchUsers = jest.fn();
    let mockConfig: MentionResourceConfig;
    let mockMentionNameResolver: jest.Mocked<any>;

    // update timeout for GH actions
    jest.setTimeout(10000);

    beforeEach(() => {
        // Reset the singleton instance before each test
        (AtlascodeMentionProvider as any).instance = undefined;

        mockMentionNameResolver = {
            lookupName: jest.fn(),
        };
        mockConfig = {
            url: 'https://example.com',
            mentionNameResolver: mockMentionNameResolver,
        };

        jest.clearAllMocks();
        mockNotifyListeners.mockClear();
        jest.clearAllTimers();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    describe('Singleton pattern', () => {
        it('should create a single instance', () => {
            const instance1 = AtlascodeMentionProvider.init(mockConfig, mockFetchUsers);
            const instance2 = AtlascodeMentionProvider.init(mockConfig, mockFetchUsers);

            expect(instance1).toBe(instance2);
            expect(instance1).toBeInstanceOf(AtlascodeMentionProvider);
        });

        it('should return the same instance on subsequent calls', () => {
            const firstInstance = AtlascodeMentionProvider.init(mockConfig, mockFetchUsers);
            const secondInstance = AtlascodeMentionProvider.init(
                { url: 'https://example.com', mentionNameResolver: undefined },
                jest.fn(),
            );

            expect(firstInstance).toBe(secondInstance);
        });
    });

    describe('supportsMentionNameResolving method', () => {
        it('should return true', () => {
            const provider = AtlascodeMentionProvider.init(mockConfig, mockFetchUsers);

            expect(provider.supportsMentionNameResolving()).toBe(true);
        });
    });

    describe('cacheMentionName method', () => {
        it('should exist and not throw when called', () => {
            const provider = AtlascodeMentionProvider.init(mockConfig, mockFetchUsers);

            expect(() => provider.cacheMentionName('user1', 'John Doe')).not.toThrow();
        });

        it('should be a no-op method', () => {
            const provider = AtlascodeMentionProvider.init(mockConfig, mockFetchUsers);

            // Should return undefined and not affect anything
            const result = provider.cacheMentionName('user1', 'John Doe');
            expect(result).toBeUndefined();
        });
    });

    describe('filter method', () => {
        it('should call fetchUsers with empty string when no query provided', async () => {
            mockFetchUsers.mockResolvedValue([]);
            const provider = AtlascodeMentionProvider.init(mockConfig, mockFetchUsers);

            provider.filter();

            jest.advanceTimersByTime(35);

            expect(mockFetchUsers).toHaveBeenCalledWith('');
        });

        it('should call fetchUsers with provided query', async () => {
            mockFetchUsers.mockResolvedValue([]);
            const provider = AtlascodeMentionProvider.init(mockConfig, mockFetchUsers);

            provider.filter('john');
            jest.advanceTimersByTime(31);
            expect(mockFetchUsers).toHaveBeenCalledWith('john');
        });

        it('should format mentions correctly for Bitbucket Cloud', async () => {
            const mockUsers = [
                {
                    accountId: 'user1',
                    displayName: 'John Doe',
                    mention: '@john',
                    avatarUrl: 'avatar1.jpg',
                },
                {
                    accountId: 'user2',
                    displayName: 'Jane Smith',
                    mention: '@jane',
                    avatarUrl: 'avatar2.jpg',
                },
            ];
            mockFetchUsers.mockResolvedValue(mockUsers);

            const configWithCloud = { ...mockConfig, isBitbucketCloud: true };
            const provider = AtlascodeMentionProvider.init(configWithCloud, mockFetchUsers);

            provider.filter('test');
            jest.advanceTimersByTime(31);

            // Allow microtasks to complete
            await Promise.resolve();

            // Should have notified listeners with properly formatted mentions
            expect(mockNotifyListeners).toHaveBeenCalledWith(
                {
                    mentions: [
                        {
                            id: '{user1}',
                            name: 'John Doe',
                            mentionName: '@john',
                            avatarUrl: 'avatar1.jpg',
                        },
                        {
                            id: '{user2}',
                            name: 'Jane Smith',
                            mentionName: '@jane',
                            avatarUrl: 'avatar2.jpg',
                        },
                    ],
                    query: 'test',
                },
                {},
            );
        });

        it('should format mentions correctly for non-Cloud Bitbucket', async () => {
            const mockUsers = [
                {
                    accountId: 'user1',
                    displayName: 'John Doe',
                    mention: '@john',
                    avatarUrl: 'avatar1.jpg',
                },
            ];
            mockFetchUsers.mockResolvedValue(mockUsers);

            const configWithoutCloud = { ...mockConfig, isBitbucketCloud: false };
            const provider = AtlascodeMentionProvider.init(configWithoutCloud, mockFetchUsers);

            provider.filter('test');
            jest.advanceTimersByTime(31);

            // Allow microtasks to complete
            await Promise.resolve();

            expect(mockNotifyListeners).toHaveBeenCalledWith(
                {
                    mentions: [
                        {
                            id: 'user1', // No curly braces for non-cloud
                            name: 'John Doe',
                            mentionName: '@john',
                            avatarUrl: 'avatar1.jpg',
                        },
                    ],
                    query: 'test',
                },
                {},
            );
        });

        it('should notify all results listeners', async () => {
            const mockUsers = [{ accountId: 'user1', displayName: 'John', mention: '@john', avatarUrl: 'avatar.jpg' }];
            mockFetchUsers.mockResolvedValue(mockUsers);

            const provider = AtlascodeMentionProvider.init(mockConfig, mockFetchUsers);

            provider.filter('test');
            jest.advanceTimersByTime(31);

            // Allow microtasks to complete
            await Promise.resolve();
            expect((provider as any)._notifyAllResultsListeners).toHaveBeenCalledWith({
                mentions: [
                    {
                        id: 'user1',
                        name: 'John',
                        mentionName: '@john',
                        avatarUrl: 'avatar.jpg',
                    },
                ],
                query: 'test',
            });
        });
    });

    describe('resolveMentionName method', () => {
        it('should return warning result when no mentionNameResolver configured', async () => {
            const configWithoutResolver = { ...mockConfig, mentionNameResolver: undefined };
            const provider = AtlascodeMentionProvider.init(configWithoutResolver, mockFetchUsers);

            const result = await provider.resolveMentionName('user1');

            expect(result).toEqual({
                id: 'user1',
                name: '',
                status: 'UNKNOWN',
            });
        });

        it('should call mentionNameResolver.lookupName when resolver is available', async () => {
            const mockResult = {
                id: 'user1',
                name: 'John Doe',
                status: 'OK' as const,
            };
            mockMentionNameResolver.lookupName.mockResolvedValue(mockResult);

            const provider = AtlascodeMentionProvider.init(mockConfig, mockFetchUsers);

            const result = await provider.resolveMentionName('user1');

            expect(mockMentionNameResolver.lookupName).toHaveBeenCalledWith('user1');
            expect(result).toEqual(mockResult);
        });

        it('should cache mention name resolution results', async () => {
            const mockResult = {
                id: 'user1',
                name: 'John Doe',
                status: 'OK' as const,
            };
            mockMentionNameResolver.lookupName.mockResolvedValue(mockResult);

            const provider = AtlascodeMentionProvider.init(mockConfig, mockFetchUsers);

            // First call
            const result1 = await provider.resolveMentionName('user1');
            // Second call within cache duration
            const result2 = await provider.resolveMentionName('user1');

            expect(mockMentionNameResolver.lookupName).toHaveBeenCalledTimes(1);
            expect(result1).toEqual(mockResult);
            expect(result2).toEqual(mockResult);
        });

        it('should respect cache expiry time', async () => {
            const mockResult = {
                id: 'user1',
                name: 'John Doe',
                status: 'OK' as const,
            };
            mockMentionNameResolver.lookupName.mockResolvedValue(mockResult);

            const provider = AtlascodeMentionProvider.init(mockConfig, mockFetchUsers);

            // First call
            await provider.resolveMentionName('user1');

            // Fast-forward time beyond cache duration (5 minutes + 1ms)
            jest.advanceTimersByTime(300001);

            // Second call after cache expiry
            await provider.resolveMentionName('user1');

            expect(mockMentionNameResolver.lookupName).toHaveBeenCalledTimes(2);
        });

        it('should handle different user IDs independently in cache', async () => {
            const mockResult1 = { id: 'user1', name: 'John Doe', status: 'OK' as const };
            const mockResult2 = { id: 'user2', name: 'Jane Smith', status: 'OK' as const };

            mockMentionNameResolver.lookupName.mockResolvedValueOnce(mockResult1).mockResolvedValueOnce(mockResult2);

            const provider = AtlascodeMentionProvider.init(mockConfig, mockFetchUsers);

            const result1 = await provider.resolveMentionName('user1');
            const result2 = await provider.resolveMentionName('user2');

            expect(mockMentionNameResolver.lookupName).toHaveBeenCalledTimes(2);
            expect(mockMentionNameResolver.lookupName).toHaveBeenNthCalledWith(1, 'user1');
            expect(mockMentionNameResolver.lookupName).toHaveBeenNthCalledWith(2, 'user2');
            expect(result1).toEqual(mockResult1);
            expect(result2).toEqual(mockResult2);
        });

        it('should handle rejected promises from mentionNameResolver', async () => {
            const error = new Error('Network error');
            mockMentionNameResolver.lookupName.mockRejectedValue(error);

            const provider = AtlascodeMentionProvider.init(mockConfig, mockFetchUsers);

            await expect(provider.resolveMentionName('user1')).rejects.toThrow('Network error');
        });

        it('should cache failed promises and not retry immediately', async () => {
            const error = new Error('Network error');
            mockMentionNameResolver.lookupName.mockRejectedValue(error);

            const provider = AtlascodeMentionProvider.init(mockConfig, mockFetchUsers);

            // First call - should fail and cache the failed promise
            await expect(provider.resolveMentionName('user1')).rejects.toThrow('Network error');

            // Second call within cache duration - should return cached failed promise
            await expect(provider.resolveMentionName('user1')).rejects.toThrow('Network error');

            // Should only have made one call to the resolver
            expect(mockMentionNameResolver.lookupName).toHaveBeenCalledTimes(1);
        });
    });

    describe('shouldHighlightMention method', () => {
        it('should always return false', () => {
            const provider = AtlascodeMentionProvider.init(mockConfig, mockFetchUsers);

            const mockMention = {
                id: 'user1',
                text: '@john',
                accessLevel: 'APPLICATION',
            };

            expect(provider.shouldHighlightMention(mockMention as any)).toBe(false);
        });
    });

    describe('Private constructor behavior', () => {
        it('should properly initialize config and fetchUsers', async () => {
            const customConfig = { url: 'custom-url', isBitbucketCloud: false };
            const customFetchUsers = jest.fn().mockResolvedValue([]);

            const provider = AtlascodeMentionProvider.init(customConfig, customFetchUsers);

            provider.filter('test');
            jest.advanceTimersByTime(31);

            // Allow microtasks to complete
            await Promise.resolve();

            expect(customFetchUsers).toHaveBeenCalledWith('test');
        });
    });

    describe('Edge cases and error handling', () => {
        it('should handle empty user arrays from fetchUsers', async () => {
            mockFetchUsers.mockResolvedValue([]);

            const provider = AtlascodeMentionProvider.init(mockConfig, mockFetchUsers);

            provider.filter('test');
            jest.advanceTimersByTime(31);

            await Promise.resolve();

            expect(mockNotifyListeners).toHaveBeenCalledWith({ mentions: [], query: 'test' }, {});
        });

        it('should handle fetchUsers rejection gracefully', async () => {
            const error = new Error('Fetch failed');
            mockFetchUsers.mockRejectedValue(error);

            const provider = AtlascodeMentionProvider.init(mockConfig, mockFetchUsers);

            // Should not throw when filter is called
            expect(() => {
                provider.filter('test');
                jest.advanceTimersByTime(31);
            }).not.toThrow();

            await Promise.resolve();
        });

        it('should handle malformed user objects', async () => {
            const malformedUsers = [
                { accountId: 'user1' }, // Missing other required fields
                { displayName: 'John' }, // Missing accountId
                null,
                undefined,
            ];
            mockFetchUsers.mockResolvedValue(malformedUsers);

            const provider = AtlascodeMentionProvider.init(mockConfig, mockFetchUsers);

            provider.filter('test');
            jest.advanceTimersByTime(31);

            // Allow microtasks to complete
            await Promise.resolve();

            expect(mockNotifyListeners).toHaveBeenCalled();
        });

        it('should handle very long queries', async () => {
            const longQuery = 'a'.repeat(1000);
            mockFetchUsers.mockResolvedValue([]);

            const provider = AtlascodeMentionProvider.init(mockConfig, mockFetchUsers);

            provider.filter(longQuery);
            jest.advanceTimersByTime(31);

            await Promise.resolve();

            expect(mockFetchUsers).toHaveBeenCalledWith(longQuery);
        });
    });

    describe('Cache memory management', () => {
        it('should maintain separate cache entries for different IDs', async () => {
            const mockResults = [
                { id: 'user1', name: 'John', status: 'OK' as const },
                { id: 'user2', name: 'Jane', status: 'OK' as const },
                { id: 'user3', name: 'Bob', status: 'OK' as const },
            ];

            mockMentionNameResolver.lookupName
                .mockResolvedValueOnce(mockResults[0])
                .mockResolvedValueOnce(mockResults[1])
                .mockResolvedValueOnce(mockResults[2]);

            const provider = AtlascodeMentionProvider.init(mockConfig, mockFetchUsers);

            // Populate cache with multiple entries
            await provider.resolveMentionName('user1');
            await provider.resolveMentionName('user2');
            await provider.resolveMentionName('user3');

            // Verify all cached entries work independently
            const cachedResult1 = await provider.resolveMentionName('user1');
            const cachedResult2 = await provider.resolveMentionName('user2');
            const cachedResult3 = await provider.resolveMentionName('user3');

            expect(cachedResult1).toEqual(mockResults[0]);
            expect(cachedResult2).toEqual(mockResults[1]);
            expect(cachedResult3).toEqual(mockResults[2]);

            // Should have only made 3 calls total (initial population)
            expect(mockMentionNameResolver.lookupName).toHaveBeenCalledTimes(3);
        });
    });
});
