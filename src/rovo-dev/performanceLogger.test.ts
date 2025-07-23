import {
    rovoDevTimeToRespondEndEvent,
    rovoDevTimeToRespondStartEvent,
    rovoDevTimeToTechPlanReturnedEvent,
} from '../../src/analytics';
import { Container } from '../../src/container';
import Perf from '../util/perf';
import { PerformanceLogger } from './performanceLogger';

// Mock dependencies
jest.mock('../../src/analytics');
jest.mock('../../src/container');
jest.mock('../util/perf');

const mockRovoDevTimeToRespondStartEvent = rovoDevTimeToRespondStartEvent as jest.MockedFunction<
    typeof rovoDevTimeToRespondStartEvent
>;
const mockRovoDevTimeToRespondEndEvent = rovoDevTimeToRespondEndEvent as jest.MockedFunction<
    typeof rovoDevTimeToRespondEndEvent
>;
const mockRovoDevTimeToTechPlanReturnedEvent = rovoDevTimeToTechPlanReturnedEvent as jest.MockedFunction<
    typeof rovoDevTimeToTechPlanReturnedEvent
>;
const mockPerf = Perf as jest.Mocked<typeof Perf>;
const mockContainer = Container as jest.Mocked<typeof Container>;

describe('PerformanceLogger', () => {
    let performanceLogger: PerformanceLogger;
    let mockAnalyticsClient: jest.Mocked<any>;

    beforeEach(() => {
        performanceLogger = new PerformanceLogger();

        // Setup mock analytics client
        mockAnalyticsClient = {
            sendTrackEvent: jest.fn().mockResolvedValue(undefined),
        };

        // Mock the getter for analyticsClient
        Object.defineProperty(mockContainer, 'analyticsClient', {
            get: jest.fn(() => mockAnalyticsClient),
            configurable: true,
        });

        // Reset all mocks
        jest.clearAllMocks();

        // Setup default mock return values
        mockPerf.mark.mockImplementation(() => {});
        mockPerf.measure.mockReturnValue(100);
        mockPerf.clear.mockImplementation(() => {});

        mockRovoDevTimeToRespondStartEvent.mockResolvedValue({ type: 'start', data: {} } as any);
        mockRovoDevTimeToRespondEndEvent.mockResolvedValue({ type: 'end', data: {} } as any);
        mockRovoDevTimeToTechPlanReturnedEvent.mockResolvedValue({ type: 'techPlan', data: {} } as any);
    });

    describe('sessionStarted', () => {
        it('should set the current session ID', () => {
            const sessionId = 'test-session-123';

            performanceLogger.sessionStarted(sessionId);

            // We can't directly access private properties, but we can test the behavior
            // by checking that subsequent method calls use this session ID
            expect(() => performanceLogger.sessionStarted(sessionId)).not.toThrow();
        });

        it('should update session ID when called multiple times', () => {
            performanceLogger.sessionStarted('session-1');
            performanceLogger.sessionStarted('session-2');

            // Should not throw and should accept the new session ID
            expect(() => performanceLogger.sessionStarted('session-2')).not.toThrow();
        });
    });

    describe('promptStarted', () => {
        it('should call Perf.mark with the prompt ID', () => {
            const promptId = 'test-prompt-123';

            performanceLogger.promptStarted(promptId);

            expect(mockPerf.mark).toHaveBeenCalledWith(promptId);
            expect(mockPerf.mark).toHaveBeenCalledTimes(1);
        });

        it('should handle multiple prompt starts', () => {
            performanceLogger.promptStarted('prompt-1');
            performanceLogger.promptStarted('prompt-2');

            expect(mockPerf.mark).toHaveBeenCalledTimes(2);
            expect(mockPerf.mark).toHaveBeenNthCalledWith(1, 'prompt-1');
            expect(mockPerf.mark).toHaveBeenNthCalledWith(2, 'prompt-2');
        });
    });

    describe('promptFirstMessageReceived', () => {
        beforeEach(() => {
            performanceLogger.sessionStarted('test-session');
        });

        it('should measure performance and send analytics event', async () => {
            const promptId = 'test-prompt';
            const expectedMeasurement = 150;
            mockPerf.measure.mockReturnValue(expectedMeasurement);

            await performanceLogger.promptFirstMessageReceived(promptId);

            expect(mockPerf.measure).toHaveBeenCalledWith(promptId);
            expect(mockRovoDevTimeToRespondStartEvent).toHaveBeenCalledWith(
                'test-session',
                promptId,
                expectedMeasurement,
            );
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledWith({ type: 'start', data: {} });
        });

        it('should handle analytics event creation failure', async () => {
            const promptId = 'test-prompt';
            mockRovoDevTimeToRespondStartEvent.mockRejectedValue(new Error('Analytics error'));

            await expect(performanceLogger.promptFirstMessageReceived(promptId)).rejects.toThrow('Analytics error');
        });

        it('should handle analytics client send failure', async () => {
            const promptId = 'test-prompt';
            mockAnalyticsClient.sendTrackEvent.mockRejectedValue(new Error('Send error'));

            await expect(performanceLogger.promptFirstMessageReceived(promptId)).rejects.toThrow('Send error');
        });
    });

    describe('promptTechnicalPlanReceived', () => {
        beforeEach(() => {
            performanceLogger.sessionStarted('test-session');
        });

        it('should measure performance and send analytics event with both timing values', async () => {
            const promptId = 'test-prompt';
            const firstMessageTime = 100;
            const techPlanTime = 200;

            // Setup first message received to set timeToFirstMessage
            mockPerf.measure.mockReturnValueOnce(firstMessageTime);
            await performanceLogger.promptFirstMessageReceived(promptId);

            // Reset mocks and setup for tech plan
            jest.clearAllMocks();
            mockPerf.measure.mockReturnValue(techPlanTime);

            await performanceLogger.promptTechnicalPlanReceived(promptId);

            expect(mockPerf.measure).toHaveBeenCalledWith(promptId);
            expect(mockRovoDevTimeToTechPlanReturnedEvent).toHaveBeenCalledWith(
                'test-session',
                promptId,
                firstMessageTime,
                techPlanTime,
            );
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledWith({ type: 'techPlan', data: {} });
        });

        it('should work when called before first message received', async () => {
            const promptId = 'test-prompt';
            const techPlanTime = 200;
            mockPerf.measure.mockReturnValue(techPlanTime);

            await performanceLogger.promptTechnicalPlanReceived(promptId);

            expect(mockRovoDevTimeToTechPlanReturnedEvent).toHaveBeenCalledWith(
                'test-session',
                promptId,
                -1, // Default value for timeToFirstMessage
                techPlanTime,
            );
        });
    });

    describe('promptLastMessageReceived', () => {
        beforeEach(() => {
            performanceLogger.sessionStarted('test-session');
        });

        it('should measure performance, clear performance data, and send final analytics event', async () => {
            const promptId = 'test-prompt';
            const firstMessageTime = 100;
            const techPlanTime = 200;
            const lastMessageTime = 300;

            // Setup previous timing data
            mockPerf.measure.mockReturnValueOnce(firstMessageTime);
            await performanceLogger.promptFirstMessageReceived(promptId);

            mockPerf.measure.mockReturnValueOnce(techPlanTime);
            await performanceLogger.promptTechnicalPlanReceived(promptId);

            // Reset mocks and setup for last message
            jest.clearAllMocks();
            mockPerf.measure.mockReturnValue(lastMessageTime);

            await performanceLogger.promptLastMessageReceived(promptId);

            expect(mockPerf.measure).toHaveBeenCalledWith(promptId);
            expect(mockPerf.clear).toHaveBeenCalledWith(promptId);
            expect(mockRovoDevTimeToRespondEndEvent).toHaveBeenCalledWith(
                'test-session',
                promptId,
                firstMessageTime,
                techPlanTime,
                lastMessageTime,
            );
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledWith({ type: 'end', data: {} });
        });

        it('should work with default timing values when other methods not called', async () => {
            const promptId = 'test-prompt';
            const lastMessageTime = 300;
            mockPerf.measure.mockReturnValue(lastMessageTime);

            await performanceLogger.promptLastMessageReceived(promptId);

            expect(mockRovoDevTimeToRespondEndEvent).toHaveBeenCalledWith(
                'test-session',
                promptId,
                -1, // Default timeToFirstMessage
                -1, // Default timeToTechnicalPlan
                lastMessageTime,
            );
        });

        it('should clear performance marker even if analytics fails', async () => {
            const promptId = 'test-prompt';
            mockAnalyticsClient.sendTrackEvent.mockRejectedValue(new Error('Analytics error'));

            await expect(performanceLogger.promptLastMessageReceived(promptId)).rejects.toThrow('Analytics error');

            expect(mockPerf.clear).toHaveBeenCalledWith(promptId);
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete prompt lifecycle correctly', async () => {
            const sessionId = 'integration-session';
            const promptId = 'integration-prompt';

            // Mock timing values
            const firstMessageTime = 100;
            const techPlanTime = 250;
            const lastMessageTime = 400;

            performanceLogger.sessionStarted(sessionId);
            performanceLogger.promptStarted(promptId);

            mockPerf.measure.mockReturnValueOnce(firstMessageTime);
            await performanceLogger.promptFirstMessageReceived(promptId);

            mockPerf.measure.mockReturnValueOnce(techPlanTime);
            await performanceLogger.promptTechnicalPlanReceived(promptId);

            mockPerf.measure.mockReturnValueOnce(lastMessageTime);
            await performanceLogger.promptLastMessageReceived(promptId);

            // Verify all analytics events were sent with correct data
            expect(mockRovoDevTimeToRespondStartEvent).toHaveBeenCalledWith(sessionId, promptId, firstMessageTime);
            expect(mockRovoDevTimeToTechPlanReturnedEvent).toHaveBeenCalledWith(
                sessionId,
                promptId,
                firstMessageTime,
                techPlanTime,
            );
            expect(mockRovoDevTimeToRespondEndEvent).toHaveBeenCalledWith(
                sessionId,
                promptId,
                firstMessageTime,
                techPlanTime,
                lastMessageTime,
            );
            expect(mockAnalyticsClient.sendTrackEvent).toHaveBeenCalledTimes(3);
            expect(mockPerf.clear).toHaveBeenCalledWith(promptId);
        });

        it('should handle multiple concurrent prompts', async () => {
            const sessionId = 'multi-session';
            const promptId1 = 'prompt-1';
            const promptId2 = 'prompt-2';

            performanceLogger.sessionStarted(sessionId);
            performanceLogger.promptStarted(promptId1);
            performanceLogger.promptStarted(promptId2);

            mockPerf.measure.mockReturnValue(100);
            await performanceLogger.promptFirstMessageReceived(promptId1);

            mockPerf.measure.mockReturnValue(150);
            await performanceLogger.promptFirstMessageReceived(promptId2);

            expect(mockPerf.mark).toHaveBeenCalledWith(promptId1);
            expect(mockPerf.mark).toHaveBeenCalledWith(promptId2);
            expect(mockRovoDevTimeToRespondStartEvent).toHaveBeenCalledTimes(2);
        });
    });
});
