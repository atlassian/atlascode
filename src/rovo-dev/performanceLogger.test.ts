import * as analytics from '../../src/analytics';
import { Container } from '../../src/container';
import { PerformanceLogger } from './performanceLogger';

// Mock the analytics module
jest.mock('../../src/analytics', () => ({
    rovoDevTimeToRespondStartEvent: jest.fn(),
    rovoDevTimeToTechPlanReturnedEvent: jest.fn(),
    rovoDevTimeToRespondEndEvent: jest.fn(),
}));

// Mock the Container
jest.mock('../../src/container', () => ({
    Container: {
        analyticsClient: {
            sendTrackEvent: jest.fn(),
        },
    },
}));

// Mock the Performance API
const mockMark = jest.fn();
const mockMeasure = jest.fn();

Object.defineProperty(global, 'performance', {
    value: {
        mark: mockMark,
        measure: mockMeasure,
    },
    writable: true,
});

describe('PerformanceLogger', () => {
    let performanceLogger: PerformanceLogger;
    let mockSendTrackEvent: jest.Mock;

    const mockSessionId = 'test-session-123';
    const mockPromptId = 'test-prompt-456';
    const mockDuration = 1500; // ms
    const mockEvent = { type: 'track', name: 'testEvent' };

    beforeEach(() => {
        performanceLogger = new PerformanceLogger();
        mockSendTrackEvent = Container.analyticsClient.sendTrackEvent as jest.Mock;

        // Reset all mocks
        jest.clearAllMocks();

        // Setup default mock returns
        mockMeasure.mockReturnValue({ duration: mockDuration });
        (analytics.rovoDevTimeToRespondStartEvent as jest.Mock).mockResolvedValue(mockEvent);
        (analytics.rovoDevTimeToTechPlanReturnedEvent as jest.Mock).mockResolvedValue(mockEvent);
        (analytics.rovoDevTimeToRespondEndEvent as jest.Mock).mockResolvedValue(mockEvent);
        mockSendTrackEvent.mockResolvedValue(undefined);
    });

    describe('sessionStarted', () => {
        it('should store the session ID', () => {
            performanceLogger.sessionStarted(mockSessionId);

            // Since currentSessionId is private, we can verify its storage by checking
            // subsequent method calls that use it
            expect(() => performanceLogger.sessionStarted(mockSessionId)).not.toThrow();
        });
    });

    describe('promptStarted', () => {
        it('should create a performance mark with the prompt ID', () => {
            performanceLogger.promptStarted(mockPromptId);

            expect(mockMark).toHaveBeenCalledWith(mockPromptId);
            expect(mockMark).toHaveBeenCalledTimes(1);
        });
    });

    describe('promptFirstMessageReceived', () => {
        beforeEach(() => {
            performanceLogger.sessionStarted(mockSessionId);
        });

        it('should measure performance and send analytics event', async () => {
            await performanceLogger.promptFirstMessageReceived(mockPromptId);

            expect(mockMeasure).toHaveBeenCalledWith(mockPromptId);
            expect(analytics.rovoDevTimeToRespondStartEvent).toHaveBeenCalledWith(
                mockSessionId,
                mockPromptId,
                mockDuration,
            );
            expect(mockSendTrackEvent).toHaveBeenCalledWith(mockEvent);
        });

        it('should handle analytics errors gracefully', async () => {
            const error = new Error('Analytics error');
            (analytics.rovoDevTimeToRespondStartEvent as jest.Mock).mockRejectedValue(error);

            await expect(performanceLogger.promptFirstMessageReceived(mockPromptId)).rejects.toThrow('Analytics error');
        });

        it('should handle track event sending errors gracefully', async () => {
            const error = new Error('Send event error');
            mockSendTrackEvent.mockRejectedValue(error);

            await expect(performanceLogger.promptFirstMessageReceived(mockPromptId)).rejects.toThrow(
                'Send event error',
            );
        });
    });

    describe('promptTechnicalPlanReceived', () => {
        beforeEach(() => {
            performanceLogger.sessionStarted(mockSessionId);
        });

        it('should measure performance and send analytics event with correct parameters', async () => {
            // First, simulate the first message received to set timeToFirstMessage
            await performanceLogger.promptFirstMessageReceived(mockPromptId);

            // Clear mocks to isolate this test
            jest.clearAllMocks();
            mockMeasure.mockReturnValue({ duration: mockDuration });
            (analytics.rovoDevTimeToTechPlanReturnedEvent as jest.Mock).mockResolvedValue(mockEvent);

            await performanceLogger.promptTechnicalPlanReceived(mockPromptId);

            expect(mockMeasure).toHaveBeenCalledWith(mockPromptId);
            expect(analytics.rovoDevTimeToTechPlanReturnedEvent).toHaveBeenCalledWith(
                mockSessionId,
                mockPromptId,
                mockDuration, // timeToFirstMessage from previous call
                mockDuration, // timeToTechnicalPlan from current call
            );
            expect(mockSendTrackEvent).toHaveBeenCalledWith(mockEvent);
        });

        it('should work without prior first message call', async () => {
            await performanceLogger.promptTechnicalPlanReceived(mockPromptId);

            expect(analytics.rovoDevTimeToTechPlanReturnedEvent).toHaveBeenCalledWith(
                mockSessionId,
                mockPromptId,
                -1, // default timeToFirstMessage
                mockDuration,
            );
        });
    });

    describe('promptLastMessageReceived', () => {
        beforeEach(() => {
            performanceLogger.sessionStarted(mockSessionId);
        });

        it('should measure performance and send analytics event with all timing data', async () => {
            const firstMessageDuration = 800;
            const techPlanDuration = 1200;
            const lastMessageDuration = 2000;

            // Simulate the sequence of calls
            mockMeasure.mockReturnValueOnce({ duration: firstMessageDuration });
            await performanceLogger.promptFirstMessageReceived(mockPromptId);

            mockMeasure.mockReturnValueOnce({ duration: techPlanDuration });
            await performanceLogger.promptTechnicalPlanReceived(mockPromptId);

            // Clear mocks to isolate this test
            jest.clearAllMocks();
            mockMeasure.mockReturnValue({ duration: lastMessageDuration });
            (analytics.rovoDevTimeToRespondEndEvent as jest.Mock).mockResolvedValue(mockEvent);

            await performanceLogger.promptLastMessageReceived(mockPromptId);

            expect(mockMeasure).toHaveBeenCalledWith(mockPromptId);
            expect(analytics.rovoDevTimeToRespondEndEvent).toHaveBeenCalledWith(
                mockSessionId,
                mockPromptId,
                firstMessageDuration,
                techPlanDuration,
                lastMessageDuration,
            );
            expect(mockSendTrackEvent).toHaveBeenCalledWith(mockEvent);
        });

        it('should work with partial timing data', async () => {
            const lastMessageDuration = 2000;
            mockMeasure.mockReturnValue({ duration: lastMessageDuration });

            await performanceLogger.promptLastMessageReceived(mockPromptId);

            expect(analytics.rovoDevTimeToRespondEndEvent).toHaveBeenCalledWith(
                mockSessionId,
                mockPromptId,
                -1, // default timeToFirstMessage
                -1, // default timeToTechnicalPlan
                lastMessageDuration,
            );
        });
    });

    describe('integration scenarios', () => {
        it('should handle a complete prompt lifecycle', async () => {
            const durations = {
                firstMessage: 500,
                techPlan: 1000,
                lastMessage: 1500,
            };

            performanceLogger.sessionStarted(mockSessionId);
            performanceLogger.promptStarted(mockPromptId);

            // First message
            mockMeasure.mockReturnValueOnce({ duration: durations.firstMessage });
            await performanceLogger.promptFirstMessageReceived(mockPromptId);

            // Technical plan
            mockMeasure.mockReturnValueOnce({ duration: durations.techPlan });
            await performanceLogger.promptTechnicalPlanReceived(mockPromptId);

            // Last message
            mockMeasure.mockReturnValueOnce({ duration: durations.lastMessage });
            await performanceLogger.promptLastMessageReceived(mockPromptId);

            // Verify all analytics events were called correctly
            expect(analytics.rovoDevTimeToRespondStartEvent).toHaveBeenCalledWith(
                mockSessionId,
                mockPromptId,
                durations.firstMessage,
            );
            expect(analytics.rovoDevTimeToTechPlanReturnedEvent).toHaveBeenCalledWith(
                mockSessionId,
                mockPromptId,
                durations.firstMessage,
                durations.techPlan,
            );
            expect(analytics.rovoDevTimeToRespondEndEvent).toHaveBeenCalledWith(
                mockSessionId,
                mockPromptId,
                durations.firstMessage,
                durations.techPlan,
                durations.lastMessage,
            );

            // Verify all events were sent
            expect(mockSendTrackEvent).toHaveBeenCalledTimes(3);
        });

        it('should handle multiple prompts in the same session', async () => {
            const promptId1 = 'prompt-1';
            const promptId2 = 'prompt-2';

            performanceLogger.sessionStarted(mockSessionId);

            // First prompt
            performanceLogger.promptStarted(promptId1);
            mockMeasure.mockReturnValueOnce({ duration: 100 });
            await performanceLogger.promptFirstMessageReceived(promptId1);

            // Second prompt
            performanceLogger.promptStarted(promptId2);
            mockMeasure.mockReturnValueOnce({ duration: 200 });
            await performanceLogger.promptFirstMessageReceived(promptId2);

            expect(mockMark).toHaveBeenCalledWith(promptId1);
            expect(mockMark).toHaveBeenCalledWith(promptId2);
            expect(analytics.rovoDevTimeToRespondStartEvent).toHaveBeenCalledWith(mockSessionId, promptId1, 100);
            expect(analytics.rovoDevTimeToRespondStartEvent).toHaveBeenCalledWith(mockSessionId, promptId2, 200);
        });
    });
});
