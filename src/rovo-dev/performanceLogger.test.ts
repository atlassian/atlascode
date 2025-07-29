import { performanceEvent } from '../analytics';
import { Container } from '../container';
import { Logger } from '../logger';
import Perf from '../util/perf';
import { PerformanceLogger } from './performanceLogger';

// Mock dependencies
jest.mock('../analytics');
jest.mock('../container');
jest.mock('../logger');
jest.mock('../util/perf');

const mockPerformanceEvent = performanceEvent as jest.MockedFunction<typeof performanceEvent>;
const mockContainer = Container as jest.Mocked<typeof Container>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;
const mockPerf = Perf as jest.Mocked<typeof Perf>;

describe('PerformanceLogger', () => {
    let performanceLogger: PerformanceLogger;
    let mockAnalyticsClient: { sendTrackEvent: jest.Mock };

    beforeEach(() => {
        jest.clearAllMocks();
        performanceLogger = new PerformanceLogger();

        // Setup mock analytics client
        mockAnalyticsClient = {
            sendTrackEvent: jest.fn().mockResolvedValue(undefined),
        };

        // Mock Container.analyticsClient as a getter
        Object.defineProperty(mockContainer, 'analyticsClient', {
            get: jest.fn(() => mockAnalyticsClient),
            configurable: true,
        });

        // Setup default mock returns
        mockPerf.measure.mockReturnValue(100);
        mockPerformanceEvent.mockResolvedValue({ type: 'track', event: 'test' } as any);
    });

    describe('sessionStarted', () => {
        it('should set the current session ID', () => {
            const sessionId = 'test-session-123';

            performanceLogger.sessionStarted(sessionId);

            // Verify session is set by calling a method that requires it
            expect(() => performanceLogger.promptStarted('test-prompt')).not.toThrow();
        });

        it('should update session ID when called multiple times', () => {
            performanceLogger.sessionStarted('session-1');
            performanceLogger.sessionStarted('session-2');

            // Should not throw since session is set
            expect(() => performanceLogger.promptStarted('test-prompt')).not.toThrow();
        });
    });

    describe('promptStarted', () => {
        it('should throw error if session is not started', () => {
            const promptId = 'test-prompt-123';

            expect(() => performanceLogger.promptStarted(promptId)).toThrow('Session not started');
        });

        it('should mark performance start when session is active', () => {
            const sessionId = 'test-session-123';
            const promptId = 'test-prompt-123';

            performanceLogger.sessionStarted(sessionId);
            performanceLogger.promptStarted(promptId);

            expect(mockPerf.mark).toHaveBeenCalledWith(promptId);
        });
    });

    describe('promptFirstByteReceived', () => {
        beforeEach(() => {
            performanceLogger.sessionStarted('test-session-123');
        });

        it('should measure performance and send analytics event', async () => {
            const promptId = 'test-prompt-123';
            const measureValue = 150;
            const mockEvent = { type: 'track', event: 'timeToFirstByte' };

            mockPerf.measure.mockReturnValue(measureValue);
            mockPerformanceEvent.mockResolvedValue(mockEvent as any);

            await performanceLogger.promptFirstByteReceived(promptId);

            expect(mockPerf.measure).toHaveBeenCalledWith(promptId);
            expect(mockPerformanceEvent).toHaveBeenCalledWith('rovodev.response.timeToFirstByte', measureValue, {
                sessionId: 'test-session-123',
                promptId,
            });
            expect(mockLogger.debug).toHaveBeenCalledWith(
                `Event fired: rovodev.response.timeToFirstByte ${measureValue} ms`,
            );
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledWith(mockEvent);
        });

        it('should handle analytics client errors gracefully', async () => {
            const promptId = 'test-prompt-123';
            mockAnalyticsClient.sendTrackEvent.mockRejectedValue(new Error('Network error'));

            await expect(performanceLogger.promptFirstByteReceived(promptId)).rejects.toThrow('Network error');
        });
    });

    describe('promptFirstMessageReceived', () => {
        beforeEach(() => {
            performanceLogger.sessionStarted('test-session-123');
        });

        it('should measure performance and send analytics event', async () => {
            const promptId = 'test-prompt-123';
            const measureValue = 200;
            const mockEvent = { type: 'track', event: 'timeToFirstMessage' };

            mockPerf.measure.mockReturnValue(measureValue);
            mockPerformanceEvent.mockResolvedValue(mockEvent as any);

            await performanceLogger.promptFirstMessageReceived(promptId);

            expect(mockPerf.measure).toHaveBeenCalledWith(promptId);
            expect(mockPerformanceEvent).toHaveBeenCalledWith('rovodev.response.timeToFirstMessage', measureValue, {
                sessionId: 'test-session-123',
                promptId,
            });
            expect(mockLogger.debug).toHaveBeenCalledWith(
                `Event fired: rovodev.response.timeToFirstMessage ${measureValue} ms`,
            );
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledWith(mockEvent);
        });
    });

    describe('promptTechnicalPlanReceived', () => {
        beforeEach(() => {
            performanceLogger.sessionStarted('test-session-123');
        });

        it('should measure performance and send analytics event', async () => {
            const promptId = 'test-prompt-123';
            const measureValue = 300;
            const mockEvent = { type: 'track', event: 'timeToTechPlan' };

            mockPerf.measure.mockReturnValue(measureValue);
            mockPerformanceEvent.mockResolvedValue(mockEvent as any);

            await performanceLogger.promptTechnicalPlanReceived(promptId);

            expect(mockPerf.measure).toHaveBeenCalledWith(promptId);
            expect(mockPerformanceEvent).toHaveBeenCalledWith('rovodev.response.timeToTechPlan', measureValue, {
                sessionId: 'test-session-123',
                promptId,
            });
            expect(mockLogger.debug).toHaveBeenCalledWith(
                `Event fired: rovodev.response.timeToTechPlan ${measureValue} ms`,
            );
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledWith(mockEvent);
        });
    });

    describe('promptLastMessageReceived', () => {
        beforeEach(() => {
            performanceLogger.sessionStarted('test-session-123');
        });

        it('should measure performance, clear performance data, and send analytics event', async () => {
            const promptId = 'test-prompt-123';
            const measureValue = 500;
            const mockEvent = { type: 'track', event: 'timeToLastMessage' };

            mockPerf.measure.mockReturnValue(measureValue);
            mockPerformanceEvent.mockResolvedValue(mockEvent as any);

            await performanceLogger.promptLastMessageReceived(promptId);

            expect(mockPerf.measure).toHaveBeenCalledWith(promptId);
            expect(mockPerf.clear).toHaveBeenCalledWith(promptId);
            expect(mockPerformanceEvent).toHaveBeenCalledWith('rovodev.response.timeToLastMessage', measureValue, {
                sessionId: 'test-session-123',
                promptId,
            });
            expect(mockLogger.debug).toHaveBeenCalledWith(
                `Event fired: rovodev.response.timeToLastMessage ${measureValue} ms`,
            );
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledWith(mockEvent);
        });

        it('should clear performance data even if analytics fails', async () => {
            const promptId = 'test-prompt-123';
            mockAnalyticsClient.sendTrackEvent.mockRejectedValue(new Error('Analytics error'));

            await expect(performanceLogger.promptLastMessageReceived(promptId)).rejects.toThrow('Analytics error');
            expect(mockPerf.clear).toHaveBeenCalledWith(promptId);
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete prompt lifecycle', async () => {
            const sessionId = 'integration-session-123';
            const promptId = 'integration-prompt-123';

            // Start session
            performanceLogger.sessionStarted(sessionId);

            // Start prompt
            performanceLogger.promptStarted(promptId);
            expect(mockPerf.mark).toHaveBeenCalledWith(promptId);

            // Receive first byte
            await performanceLogger.promptFirstByteReceived(promptId);
            expect(mockPerf.measure).toHaveBeenCalledWith(promptId);

            // Receive first message
            await performanceLogger.promptFirstMessageReceived(promptId);
            expect(mockPerf.measure).toHaveBeenCalledWith(promptId);

            // Receive technical plan
            await performanceLogger.promptTechnicalPlanReceived(promptId);
            expect(mockPerf.measure).toHaveBeenCalledWith(promptId);

            // Receive last message
            await performanceLogger.promptLastMessageReceived(promptId);
            expect(mockPerf.measure).toHaveBeenCalledWith(promptId);
            expect(mockPerf.clear).toHaveBeenCalledWith(promptId);

            // Verify all analytics events were sent
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledTimes(4);
        });

        it('should handle multiple prompts in same session', async () => {
            const sessionId = 'multi-prompt-session';
            const promptId1 = 'prompt-1';
            const promptId2 = 'prompt-2';

            performanceLogger.sessionStarted(sessionId);

            // First prompt
            performanceLogger.promptStarted(promptId1);
            await performanceLogger.promptFirstByteReceived(promptId1);

            // Second prompt
            performanceLogger.promptStarted(promptId2);
            await performanceLogger.promptFirstByteReceived(promptId2);

            expect(mockPerf.mark).toHaveBeenCalledWith(promptId1);
            expect(mockPerf.mark).toHaveBeenCalledWith(promptId2);
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledTimes(2);
        });

        it('should maintain session context across multiple prompt methods', async () => {
            const sessionId = 'context-session-123';
            const promptId = 'context-prompt-123';

            performanceLogger.sessionStarted(sessionId);

            await performanceLogger.promptFirstByteReceived(promptId);
            await performanceLogger.promptFirstMessageReceived(promptId);

            // Verify sessionId was used in both calls
            expect(mockPerformanceEvent).toHaveBeenCalledWith(
                'rovodev.response.timeToFirstByte',
                expect.any(Number),
                expect.objectContaining({ sessionId }),
            );
            expect(mockPerformanceEvent).toHaveBeenCalledWith(
                'rovodev.response.timeToFirstMessage',
                expect.any(Number),
                expect.objectContaining({ sessionId }),
            );
        });
    });

    describe('edge cases', () => {
        it('should handle NaN measurement values', async () => {
            performanceLogger.sessionStarted('test-session');
            mockPerf.measure.mockReturnValue(NaN);

            await performanceLogger.promptFirstByteReceived('test-prompt');

            expect(mockPerformanceEvent).toHaveBeenCalledWith(
                'rovodev.response.timeToFirstByte',
                NaN,
                expect.any(Object),
            );
        });

        it('should handle zero measurement values', async () => {
            performanceLogger.sessionStarted('test-session');
            mockPerf.measure.mockReturnValue(0);

            await performanceLogger.promptFirstMessageReceived('test-prompt');

            expect(mockPerformanceEvent).toHaveBeenCalledWith(
                'rovodev.response.timeToFirstMessage',
                0,
                expect.any(Object),
            );
        });

        it('should handle empty string session and prompt IDs', async () => {
            performanceLogger.sessionStarted('non-empty-session');

            expect(() => performanceLogger.promptStarted('')).not.toThrow();
            expect(mockPerf.mark).toHaveBeenCalledWith('');

            await performanceLogger.promptFirstByteReceived('');
            expect(mockPerformanceEvent).toHaveBeenCalledWith(
                'rovodev.response.timeToFirstByte',
                expect.any(Number),
                expect.objectContaining({ promptId: '' }),
            );
        });
    });
});
