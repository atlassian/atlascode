import { MentionResourceConfig } from '@atlaskit/mention';

import { AtlascodeMentionProvider } from './AtlascodeMentionsProvider';

// Mock the AbstractMentionResource to avoid importing the full Atlaskit implementation
jest.mock('@atlaskit/mention', () => ({
    AbstractMentionResource: class {
        protected _notifyListeners = jest.fn();
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
});
