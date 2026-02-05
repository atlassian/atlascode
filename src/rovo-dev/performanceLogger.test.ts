import Perf from '../util/perf';
import { RovodevAnalyticsApi } from './analytics/rovodevAnalyticsApi';
import { ExtensionApi, Track } from './api/extensionApi';
import { PerformanceLogger } from './performanceLogger';
import { RovoDevLogger } from './util/rovoDevLogger';

// Mock dependencies
jest.mock('./util/rovoDevLogger');
jest.mock('../util/perf');
jest.mock('./api/extensionApi', () => {
    return {
        ExtensionApi: jest.fn(),
    };
});

const mockLogger = RovoDevLogger as jest.Mocked<typeof RovoDevLogger>;
const mockPerf = Perf as jest.Mocked<typeof Perf>;

describe('PerformanceLogger', () => {
    let performanceLogger: PerformanceLogger;
    let mockAnalyticsClient: jest.Mocked<RovodevAnalyticsApi>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock analytics client
        mockAnalyticsClient = {
            sendTrackEvent: jest.fn().mockResolvedValue(undefined),
            sendScreenEvent: jest.fn().mockResolvedValue(undefined),
            sendErrorEvent: jest.fn().mockResolvedValue(undefined),
        };

        // Mock ExtensionApi constructor to return an instance with analytics
        (ExtensionApi as jest.Mock).mockImplementation(() => ({
            analytics: mockAnalyticsClient,
        }));

        performanceLogger = new PerformanceLogger('IDE', 'test-instance-id');

        // Setup default mock returns
        mockPerf.measure.mockReturnValue(100);
    });

    describe('sessionStarted', () => {
        it('should set the current session ID', () => {
            const rovoDevSessionId = 'test-session-123';

            performanceLogger.sessionStarted(rovoDevSessionId);

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
            const rovoDevPromptId = 'test-prompt-123';

            expect(() => performanceLogger.promptStarted(rovoDevPromptId)).toThrow('Session not started');
        });

        it('should mark performance start when session is active', () => {
            const rovoDevSessionId = 'test-session-123';
            const rovoDevPromptId = 'test-prompt-123';

            performanceLogger.sessionStarted(rovoDevSessionId);
            performanceLogger.promptStarted(rovoDevPromptId);

            expect(mockPerf.mark).toHaveBeenCalledWith(rovoDevPromptId);
        });
    });

    describe('promptFirstByteReceived', () => {
        beforeEach(() => {
            performanceLogger.sessionStarted('test-session-123');
        });

        it('should measure performance and send analytics event', async () => {
            const rovoDevPromptId = 'test-prompt-123';
            const measureValue = 150;

            mockPerf.measure.mockReturnValue(measureValue);

            await performanceLogger.promptFirstByteReceived(rovoDevPromptId);

            expect(mockPerf.measure).toHaveBeenCalledWith(rovoDevPromptId);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                `Event fired: api.rovodev.chat.response.timeToFirstByte ${measureValue} ms`,
            );

            const expectedEvent: Track.PerformanceEvent = {
                action: 'performanceEvent',
                subject: 'atlascode',
                attributes: {
                    tag: 'api.rovodev.chat.response.timeToFirstByte',
                    measure: measureValue,
                    rovoDevEnv: 'IDE',
                    appInstanceId: 'test-instance-id',
                    rovoDevSessionId: 'test-session-123',
                    rovoDevPromptId,
                },
            };
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledWith(expectedEvent);
        });

        it('should handle analytics client errors gracefully', async () => {
            const rovoDevPromptId = 'test-prompt-123';
            mockAnalyticsClient.sendTrackEvent.mockRejectedValue(new Error('Network error'));

            await expect(performanceLogger.promptFirstByteReceived(rovoDevPromptId)).rejects.toThrow('Network error');
        });
    });

    describe('promptFirstMessageReceived', () => {
        beforeEach(() => {
            performanceLogger.sessionStarted('test-session-123');
        });

        it('should measure performance and send analytics event', async () => {
            const rovoDevPromptId = 'test-prompt-123';
            const measureValue = 200;

            mockPerf.measure.mockReturnValue(measureValue);

            await performanceLogger.promptFirstMessageReceived(rovoDevPromptId);
            expect(mockPerf.measure).toHaveBeenCalledWith(rovoDevPromptId);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                `Event fired: api.rovodev.chat.response.timeToFirstMessage ${measureValue} ms`,
            );

            const expectedEvent: Track.PerformanceEvent = {
                action: 'performanceEvent',
                subject: 'atlascode',
                attributes: {
                    tag: 'api.rovodev.chat.response.timeToFirstMessage',
                    measure: measureValue,
                    rovoDevEnv: 'IDE',
                    appInstanceId: 'test-instance-id',
                    rovoDevSessionId: 'test-session-123',
                    rovoDevPromptId,
                },
            };
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledWith(expectedEvent);
        });
    });

    describe('promptTechnicalPlanReceived', () => {
        beforeEach(() => {
            performanceLogger.sessionStarted('test-session-123');
        });

        it('should measure performance and send analytics event', async () => {
            const rovoDevPromptId = 'test-prompt-123';
            const measureValue = 300;

            mockPerf.measure.mockReturnValue(measureValue);

            await performanceLogger.promptTechnicalPlanReceived(rovoDevPromptId);

            expect(mockPerf.measure).toHaveBeenCalledWith(rovoDevPromptId);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                `Event fired: api.rovodev.chat.response.timeToTechPlan ${measureValue} ms`,
            );

            const expectedEvent: Track.PerformanceEvent = {
                action: 'performanceEvent',
                subject: 'atlascode',
                attributes: {
                    tag: 'api.rovodev.chat.response.timeToTechPlan',
                    measure: measureValue,
                    rovoDevEnv: 'IDE',
                    appInstanceId: 'test-instance-id',
                    rovoDevSessionId: 'test-session-123',
                    rovoDevPromptId,
                },
            };
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledWith(expectedEvent);
        });
    });

    describe('promptLastMessageReceived', () => {
        beforeEach(() => {
            performanceLogger.sessionStarted('test-session-123');
        });

        it('should measure performance, clear performance data, and send analytics event', async () => {
            const rovoDevPromptId = 'test-prompt-123';
            const measureValue = 500;

            mockPerf.measure.mockReturnValue(measureValue);

            await performanceLogger.promptLastMessageReceived(rovoDevPromptId);

            expect(mockPerf.measure).toHaveBeenCalledWith(rovoDevPromptId);
            expect(mockPerf.clear).toHaveBeenCalledWith(rovoDevPromptId);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                `Event fired: api.rovodev.chat.response.timeToLastMessage ${measureValue} ms`,
            );

            const expectedEvent: Track.PerformanceEvent = {
                action: 'performanceEvent',
                subject: 'atlascode',
                attributes: {
                    tag: 'api.rovodev.chat.response.timeToLastMessage',
                    measure: measureValue,
                    rovoDevEnv: 'IDE',
                    appInstanceId: 'test-instance-id',
                    rovoDevSessionId: 'test-session-123',
                    rovoDevPromptId,
                },
            };
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledWith(expectedEvent);
        });

        it('should clear performance data even if analytics fails', async () => {
            const rovoDevPromptId = 'test-prompt-123';
            mockAnalyticsClient.sendTrackEvent.mockRejectedValue(new Error('Analytics error'));

            await expect(performanceLogger.promptLastMessageReceived(rovoDevPromptId)).rejects.toThrow(
                'Analytics error',
            );
            expect(mockPerf.clear).toHaveBeenCalledWith(rovoDevPromptId);
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete prompt lifecycle', async () => {
            const rovoDevSessionId = 'integration-session-123';
            const rovoDevPromptId = 'integration-prompt-123';

            // Start session
            performanceLogger.sessionStarted(rovoDevSessionId);

            // Start prompt
            performanceLogger.promptStarted(rovoDevPromptId);
            expect(mockPerf.mark).toHaveBeenCalledWith(rovoDevPromptId);

            // Receive first byte
            await performanceLogger.promptFirstByteReceived(rovoDevPromptId);
            expect(mockPerf.measure).toHaveBeenCalledWith(rovoDevPromptId);

            // Receive first message
            await performanceLogger.promptFirstMessageReceived(rovoDevPromptId);
            expect(mockPerf.measure).toHaveBeenCalledWith(rovoDevPromptId);

            // Receive technical plan
            await performanceLogger.promptTechnicalPlanReceived(rovoDevPromptId);
            expect(mockPerf.measure).toHaveBeenCalledWith(rovoDevPromptId);

            // Receive last message
            await performanceLogger.promptLastMessageReceived(rovoDevPromptId);
            expect(mockPerf.measure).toHaveBeenCalledWith(rovoDevPromptId);
            expect(mockPerf.clear).toHaveBeenCalledWith(rovoDevPromptId);

            // Verify all analytics events were sent
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledTimes(4);
        });

        it('should handle multiple prompts in same session', async () => {
            const rovoDevSessionId = 'multi-prompt-session';
            const promptId1 = 'prompt-1';
            const promptId2 = 'prompt-2';

            performanceLogger.sessionStarted(rovoDevSessionId);

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
            const rovoDevSessionId = 'context-session-123';
            const rovoDevPromptId = 'context-prompt-123';

            performanceLogger.sessionStarted(rovoDevSessionId);

            await performanceLogger.promptFirstByteReceived(rovoDevPromptId);
            await performanceLogger.promptFirstMessageReceived(rovoDevPromptId);

            // Verify rovoDevSessionId was used in both analytics events
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    attributes: expect.objectContaining({
                        tag: 'api.rovodev.chat.response.timeToFirstByte',
                        rovoDevSessionId,
                    }),
                }),
            );
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    attributes: expect.objectContaining({
                        tag: 'api.rovodev.chat.response.timeToFirstMessage',
                        rovoDevSessionId,
                    }),
                }),
            );
        });
    });

    describe('edge cases', () => {
        it('should handle NaN measurement values', async () => {
            performanceLogger.sessionStarted('test-session');
            mockPerf.measure.mockReturnValue(NaN);

            await performanceLogger.promptFirstByteReceived('test-prompt');

            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    attributes: expect.objectContaining({
                        tag: 'api.rovodev.chat.response.timeToFirstByte',
                        measure: NaN,
                    }),
                }),
            );
        });

        it('should handle zero measurement values', async () => {
            performanceLogger.sessionStarted('test-session');
            mockPerf.measure.mockReturnValue(0);

            await performanceLogger.promptFirstMessageReceived('test-prompt');

            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    attributes: expect.objectContaining({
                        tag: 'api.rovodev.chat.response.timeToFirstMessage',
                        measure: 0,
                    }),
                }),
            );
        });

        it('should handle empty string session and prompt IDs', async () => {
            performanceLogger.sessionStarted('non-empty-session');

            expect(() => performanceLogger.promptStarted('')).not.toThrow();
            expect(mockPerf.mark).toHaveBeenCalledWith('');

            await performanceLogger.promptFirstByteReceived('');
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    attributes: expect.objectContaining({
                        tag: 'api.rovodev.chat.response.timeToFirstByte',
                        rovoDevSessionId: 'non-empty-session',
                        rovoDevPromptId: '',
                    }),
                }),
            );
        });
    });
});
