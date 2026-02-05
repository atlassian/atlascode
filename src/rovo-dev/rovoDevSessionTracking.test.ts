import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock the dependencies BEFORE importing the module
jest.mock('./api/extensionApi', () => ({
    ExtensionApi: jest.fn().mockImplementation(() => ({
        analytics: {
            sendTrackEvent: jest.fn(() => Promise.resolve()),
            sendScreenEvent: jest.fn(() => Promise.resolve()),
            sendErrorEvent: jest.fn(() => Promise.resolve()),
        },
    })),
}));

jest.mock('./performanceLogger', () => ({
    PerformanceLogger: jest.fn().mockImplementation(() => ({
        startSession: jest.fn(),
        endSession: jest.fn(),
        sessionStarted: jest.fn(),
        sessionEnded: jest.fn(),
    })),
}));

jest.mock('../logger', () => ({
    Logger: jest.fn().mockImplementation(() => ({
        error: jest.fn(),
    })),
}));

jest.mock('./util/rovoDevLogger', () => ({
    RovoDevLogger: {
        setSessionId: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
    },
}));

import { RovoDevTelemetryProvider } from './rovoDevTelemetryProvider';
import { RovoDevLogger } from './util/rovoDevLogger';

describe('RovoDev Session Tracking Integration', () => {
    let telemetryProvider: RovoDevTelemetryProvider;
    const mockOnError = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        telemetryProvider = new RovoDevTelemetryProvider('IDE', 'test-app-instance', mockOnError);
    });

    describe('session lifecycle', () => {
        it('should set sessionId on RovoDevLogger when starting a new session', async () => {
            const sessionId = 'new-session-789';

            await telemetryProvider.startNewSession(sessionId, false);

            expect(RovoDevLogger.setSessionId).toHaveBeenCalledWith(sessionId);
        });

        it('should expose sessionId via getter', async () => {
            const sessionId = 'exposed-session-123';

            await telemetryProvider.startNewSession(sessionId, true);

            expect(telemetryProvider.sessionId).toBe(sessionId);
        });

        it('should clear sessionId on RovoDevLogger when shutting down', () => {
            telemetryProvider.shutdown();

            expect(RovoDevLogger.setSessionId).toHaveBeenCalledWith(undefined);
        });

        it('should have empty sessionId before any session is started', () => {
            expect(telemetryProvider.sessionId).toBe('');
        });

        it('should update sessionId when starting a new session after another', async () => {
            await telemetryProvider.startNewSession('session-1', false);
            expect(RovoDevLogger.setSessionId).toHaveBeenCalledWith('session-1');

            await telemetryProvider.startNewSession('session-2', false);
            expect(RovoDevLogger.setSessionId).toHaveBeenCalledWith('session-2');

            expect(RovoDevLogger.setSessionId).toHaveBeenCalledTimes(2);
        });
    });
});
