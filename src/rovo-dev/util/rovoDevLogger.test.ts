import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { SentryService } from '../../sentry';
import { RovoDevLogger } from './rovoDevLogger';

// Mock dependencies
jest.mock('../../sentry');
jest.mock('../../util/isDebugging', () => ({
    isDebugging: jest.fn(() => false),
}));

describe('RovoDevLogger', () => {
    let mockSentryService: any;

    beforeEach(() => {
        mockSentryService = {
            isInitialized: jest.fn(),
            captureException: jest.fn(),
        };
        (SentryService.getInstance as jest.Mock).mockReturnValue(mockSentryService);

        // Clear sessionId before each test
        RovoDevLogger.setSessionId(undefined);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('setSessionId', () => {
        it('should allow setting a sessionId', () => {
            const sessionId = 'test-session-123';

            // This should not throw
            expect(() => RovoDevLogger.setSessionId(sessionId)).not.toThrow();
        });

        it('should allow clearing sessionId', () => {
            RovoDevLogger.setSessionId('test-session');

            // This should not throw
            expect(() => RovoDevLogger.setSessionId(undefined)).not.toThrow();
        });
    });

    describe('error logging with sessionId', () => {
        it('should include sessionId in Sentry tags when sessionId is set', () => {
            mockSentryService.isInitialized.mockReturnValue(true);

            const sessionId = 'test-session-456';
            RovoDevLogger.setSessionId(sessionId);

            const testError = new Error('test error');
            RovoDevLogger.error(testError, 'Test error message');

            expect(mockSentryService.captureException).toHaveBeenCalledWith(
                testError,
                expect.objectContaining({
                    tags: expect.objectContaining({
                        productArea: 'RovoDev',
                        sessionId: sessionId,
                    }),
                }),
            );
        });

        it('should not include sessionId in Sentry tags when sessionId is not set', () => {
            mockSentryService.isInitialized.mockReturnValue(true);

            // Ensure sessionId is not set
            RovoDevLogger.setSessionId(undefined);

            const testError = new Error('test error');
            RovoDevLogger.error(testError, 'Test error message');

            expect(mockSentryService.captureException).toHaveBeenCalledWith(
                testError,
                expect.objectContaining({
                    tags: expect.objectContaining({
                        productArea: 'RovoDev',
                    }),
                }),
            );

            // Verify sessionId is not in the tags
            const capturedTags = mockSentryService.captureException.mock.calls[0][1].tags;
            expect(capturedTags).not.toHaveProperty('sessionId');
        });

        it('should update sessionId when set multiple times', () => {
            mockSentryService.isInitialized.mockReturnValue(true);

            const sessionId1 = 'session-1';
            const sessionId2 = 'session-2';

            RovoDevLogger.setSessionId(sessionId1);
            RovoDevLogger.error(new Error('error 1'), 'First error');

            RovoDevLogger.setSessionId(sessionId2);
            RovoDevLogger.error(new Error('error 2'), 'Second error');

            // Check first call
            expect(mockSentryService.captureException).toHaveBeenNthCalledWith(
                1,
                expect.any(Error),
                expect.objectContaining({
                    tags: expect.objectContaining({
                        sessionId: sessionId1,
                    }),
                }),
            );

            // Check second call
            expect(mockSentryService.captureException).toHaveBeenNthCalledWith(
                2,
                expect.any(Error),
                expect.objectContaining({
                    tags: expect.objectContaining({
                        sessionId: sessionId2,
                    }),
                }),
            );
        });

        it('should work when Sentry is not initialized', () => {
            mockSentryService.isInitialized.mockReturnValue(false);

            RovoDevLogger.setSessionId('test-session');

            // Should not throw
            expect(() => RovoDevLogger.error(new Error('test'), 'message')).not.toThrow();

            expect(mockSentryService.captureException).not.toHaveBeenCalled();
        });
    });
});
