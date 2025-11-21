import { RovoDevEnv } from './analytics/events';
import { RovoDevTelemetryProvider } from './rovoDevTelemetryProvider';

const mockSendTrackEvent = jest.fn();

jest.mock('src/container', () => {
    return {
        Container: {
            analyticsClient: {
                sendTrackEvent: (...args: any[]) => {
                    mockSendTrackEvent(...args);
                },
            },
        },
    };
});

function setProcessPlatform(platform: NodeJS.Platform) {
    Object.defineProperty(process, 'platform', {
        value: platform,
        writable: false,
    });
}

interface MockedData {
    getFirstAAID_value?: string | undefined;
}

const mockedData: MockedData = {};

const RovoDevEnvironments: RovoDevEnv[] = ['IDE', 'Boysenberry'];

// Rovo Dev event tests
describe('Rovo Dev events', () => {
    const appInstanceId = 'test-app-session-id';
    const mockSessionId = 'test-session-id';
    const mockPromptId = 'test-prompt-id';
    let telemetryProvider: RovoDevTelemetryProvider;

    beforeEach(() => {
        setProcessPlatform('win32');
        mockedData.getFirstAAID_value = 'some-user-id';
        mockSendTrackEvent.mockClear();
        telemetryProvider = new RovoDevTelemetryProvider('IDE', appInstanceId, jest.fn());
        telemetryProvider.startNewSession(mockSessionId, false);
    });

    it.each(RovoDevEnvironments)(
        'should create rovoDevNewSessionActionEvent with session information',
        async (rovoDevEnv) => {
            const isManuallyCreated = true;
            telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId, jest.fn());
            mockSendTrackEvent.mockClear();
            await telemetryProvider.startNewSession(mockSessionId, isManuallyCreated);

            expect(mockSendTrackEvent).toHaveBeenCalled();
            const event = await mockSendTrackEvent.mock.calls[0][0];

            expect(event.trackEvent.action).toEqual('rovoDevNewSessionAction');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.rovoDevEnv).toEqual(rovoDevEnv);
            expect(event.trackEvent.attributes.appInstanceId).toEqual(appInstanceId);
            expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
            expect(event.trackEvent.attributes.isManuallyCreated).toEqual(isManuallyCreated);
        },
    );

    it.each(RovoDevEnvironments)(
        'should create rovoDevPromptSentEvent with session and prompt IDs',
        async (rovoDevEnv) => {
            telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId, jest.fn());
            await telemetryProvider.startNewSession(mockSessionId, false);
            mockSendTrackEvent.mockClear();

            await telemetryProvider.fireTelemetryEvent({
                action: 'rovoDevPromptSent',
                subject: 'atlascode',
                attributes: {
                    promptId: mockPromptId,
                    deepPlanEnabled: true,
                },
            });

            expect(mockSendTrackEvent).toHaveBeenCalled();
            const event = await mockSendTrackEvent.mock.calls[0][0];

            expect(event.trackEvent.action).toEqual('rovoDevPromptSent');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.rovoDevEnv).toEqual(rovoDevEnv);
            expect(event.trackEvent.attributes.appInstanceId).toEqual(appInstanceId);
            expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
            expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
            expect(event.trackEvent.attributes.deepPlanEnabled).toEqual(true);
        },
    );

    it.each(RovoDevEnvironments)(
        'should create rovoDevTechnicalPlanningShownEvent with planning details',
        async (rovoDevEnv) => {
            const stepsCount = 5;
            const filesCount = 3;
            const questionsCount = 2;
            telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId, jest.fn());
            await telemetryProvider.startNewSession(mockSessionId, false);
            mockSendTrackEvent.mockClear();

            await telemetryProvider.fireTelemetryEvent({
                action: 'rovoDevTechnicalPlanningShown',
                subject: 'atlascode',
                attributes: {
                    promptId: mockPromptId,
                    stepsCount,
                    filesCount,
                    questionsCount,
                },
            });

            expect(mockSendTrackEvent).toHaveBeenCalled();
            const event = await mockSendTrackEvent.mock.calls[0][0];

            expect(event.trackEvent.action).toEqual('rovoDevTechnicalPlanningShown');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.rovoDevEnv).toEqual(rovoDevEnv);
            expect(event.trackEvent.attributes.appInstanceId).toEqual(appInstanceId);
            expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
            expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
            expect(event.trackEvent.attributes.stepsCount).toEqual(stepsCount);
            expect(event.trackEvent.attributes.filesCount).toEqual(filesCount);
            expect(event.trackEvent.attributes.questionsCount).toEqual(questionsCount);
        },
    );

    it.each(RovoDevEnvironments)(
        'should create rovoDevFilesSummaryShownEvent for new files summary',
        async (rovoDevEnv) => {
            const filesCount = 4;
            telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId, jest.fn());
            await telemetryProvider.startNewSession(mockSessionId, false);
            mockSendTrackEvent.mockClear();

            await telemetryProvider.fireTelemetryEvent({
                action: 'rovoDevFilesSummaryShown',
                subject: 'atlascode',
                attributes: {
                    promptId: mockPromptId,
                    filesCount,
                },
            });

            expect(mockSendTrackEvent).toHaveBeenCalled();
            const event = await mockSendTrackEvent.mock.calls[0][0];

            expect(event.trackEvent.action).toEqual('rovoDevFilesSummaryShown');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.rovoDevEnv).toEqual(rovoDevEnv);
            expect(event.trackEvent.attributes.appInstanceId).toEqual(appInstanceId);
            expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
            expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
            expect(event.trackEvent.attributes.filesCount).toEqual(filesCount);
        },
    );

    it.each(RovoDevEnvironments)('should create rovoDevFileChangedActionEvent for undo action', async (rovoDevEnv) => {
        const action = 'undo';
        const filesCount = 3;
        telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId, jest.fn());
        await telemetryProvider.startNewSession(mockSessionId, false);
        mockSendTrackEvent.mockClear();

        await telemetryProvider.fireTelemetryEvent({
            action: 'rovoDevFileChangedAction',
            subject: 'atlascode',
            attributes: {
                promptId: mockPromptId,
                action,
                filesCount,
            },
        });

        expect(mockSendTrackEvent).toHaveBeenCalled();
        const event = await mockSendTrackEvent.mock.calls[0][0];

        expect(event.trackEvent.action).toEqual('rovoDevFileChangedAction');
        expect(event.trackEvent.actionSubject).toEqual('atlascode');
        expect(event.trackEvent.attributes.rovoDevEnv).toEqual(rovoDevEnv);
        expect(event.trackEvent.attributes.appInstanceId).toEqual(appInstanceId);
        expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
        expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
        expect(event.trackEvent.attributes.action).toEqual(action);
        expect(event.trackEvent.attributes.filesCount).toEqual(filesCount);
    });

    it.each(RovoDevEnvironments)('should create rovoDevFileChangedActionEvent for keep action', async (rovoDevEnv) => {
        const action = 'keep';
        const filesCount = 2;
        telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId, jest.fn());
        await telemetryProvider.startNewSession(mockSessionId, false);
        mockSendTrackEvent.mockClear();

        await telemetryProvider.fireTelemetryEvent({
            action: 'rovoDevFileChangedAction',
            subject: 'atlascode',
            attributes: {
                promptId: mockPromptId,
                action,
                filesCount,
            },
        });

        expect(mockSendTrackEvent).toHaveBeenCalled();
        const event = await mockSendTrackEvent.mock.calls[0][0];

        expect(event.trackEvent.action).toEqual('rovoDevFileChangedAction');
        expect(event.trackEvent.actionSubject).toEqual('atlascode');
        expect(event.trackEvent.attributes.rovoDevEnv).toEqual(rovoDevEnv);
        expect(event.trackEvent.attributes.appInstanceId).toEqual(appInstanceId);
        expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
        expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
        expect(event.trackEvent.attributes.action).toEqual(action);
        expect(event.trackEvent.attributes.filesCount).toEqual(filesCount);
    });

    it.each(RovoDevEnvironments)('should create rovoDevStopActionEvent when successful', async (rovoDevEnv) => {
        telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId, jest.fn());
        await telemetryProvider.startNewSession(mockSessionId, false);
        mockSendTrackEvent.mockClear();

        await telemetryProvider.fireTelemetryEvent({
            action: 'rovoDevStopAction',
            subject: 'atlascode',
            attributes: {
                promptId: mockPromptId,
            },
        });

        expect(mockSendTrackEvent).toHaveBeenCalled();
        const event = await mockSendTrackEvent.mock.calls[0][0];

        expect(event.trackEvent.action).toEqual('rovoDevStopAction');
        expect(event.trackEvent.actionSubject).toEqual('atlascode');
        expect(event.trackEvent.attributes.rovoDevEnv).toEqual(rovoDevEnv);
        expect(event.trackEvent.attributes.appInstanceId).toEqual(appInstanceId);
        expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
        expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
        expect(event.trackEvent.attributes.failed).toBeUndefined();
    });

    it.each(RovoDevEnvironments)('should create rovoDevStopActionEvent when failed', async (rovoDevEnv) => {
        const failed = true;
        telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId, jest.fn());
        await telemetryProvider.startNewSession(mockSessionId, false);
        mockSendTrackEvent.mockClear();

        await telemetryProvider.fireTelemetryEvent({
            action: 'rovoDevStopAction',
            subject: 'atlascode',
            attributes: {
                promptId: mockPromptId,
                failed,
            },
        });

        expect(mockSendTrackEvent).toHaveBeenCalled();
        const event = await mockSendTrackEvent.mock.calls[0][0];

        expect(event.trackEvent.action).toEqual('rovoDevStopAction');
        expect(event.trackEvent.actionSubject).toEqual('atlascode');
        expect(event.trackEvent.attributes.rovoDevEnv).toEqual(rovoDevEnv);
        expect(event.trackEvent.attributes.appInstanceId).toEqual(appInstanceId);
        expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
        expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
        expect(event.trackEvent.attributes.failed).toEqual(failed);
    });

    it.each(RovoDevEnvironments)('should create rovoDevGitPushActionEvent when PR is created', async (rovoDevEnv) => {
        const prCreated = true;
        telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId, jest.fn());
        await telemetryProvider.startNewSession(mockSessionId, false);
        mockSendTrackEvent.mockClear();

        await telemetryProvider.fireTelemetryEvent({
            action: 'rovoDevGitPushAction',
            subject: 'atlascode',
            attributes: {
                promptId: mockPromptId,
                prCreated,
            },
        });

        expect(mockSendTrackEvent).toHaveBeenCalled();
        const event = await mockSendTrackEvent.mock.calls[0][0];

        expect(event.trackEvent.action).toEqual('rovoDevGitPushAction');
        expect(event.trackEvent.actionSubject).toEqual('atlascode');
        expect(event.trackEvent.attributes.rovoDevEnv).toEqual(rovoDevEnv);
        expect(event.trackEvent.attributes.appInstanceId).toEqual(appInstanceId);
        expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
        expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
        expect(event.trackEvent.attributes.prCreated).toEqual(prCreated);
    });

    it.each(RovoDevEnvironments)(
        'should create rovoDevGitPushActionEvent when PR is not created',
        async (rovoDevEnv) => {
            const prCreated = false;
            telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId, jest.fn());
            await telemetryProvider.startNewSession(mockSessionId, false);
            mockSendTrackEvent.mockClear();

            await telemetryProvider.fireTelemetryEvent({
                action: 'rovoDevGitPushAction',
                subject: 'atlascode',
                attributes: {
                    promptId: mockPromptId,
                    prCreated,
                },
            });

            expect(mockSendTrackEvent).toHaveBeenCalled();
            const event = await mockSendTrackEvent.mock.calls[0][0];

            expect(event.trackEvent.action).toEqual('rovoDevGitPushAction');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.rovoDevEnv).toEqual(rovoDevEnv);
            expect(event.trackEvent.attributes.appInstanceId).toEqual(appInstanceId);
            expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
            expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
            expect(event.trackEvent.attributes.prCreated).toEqual(prCreated);
        },
    );

    it.each(RovoDevEnvironments)('should create rovoDevDetailsExpandedEvent', async (rovoDevEnv) => {
        telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId, jest.fn());
        await telemetryProvider.startNewSession(mockSessionId, false);
        mockSendTrackEvent.mockClear();

        await telemetryProvider.fireTelemetryEvent({
            action: 'rovoDevDetailsExpanded',
            subject: 'atlascode',
            attributes: {
                promptId: mockPromptId,
            },
        });

        expect(mockSendTrackEvent).toHaveBeenCalled();
        const event = await mockSendTrackEvent.mock.calls[0][0];

        expect(event.trackEvent.action).toEqual('rovoDevDetailsExpanded');
        expect(event.trackEvent.actionSubject).toEqual('atlascode');
        expect(event.trackEvent.attributes.rovoDevEnv).toEqual(rovoDevEnv);
        expect(event.trackEvent.attributes.appInstanceId).toEqual(appInstanceId);
        expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
        expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
    });

    it.each(RovoDevEnvironments)('should create rovoDevCreatePrButtonClickedEvent', async (rovoDevEnv) => {
        telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId, jest.fn());
        await telemetryProvider.startNewSession(mockSessionId, false);
        mockSendTrackEvent.mockClear();

        await telemetryProvider.fireTelemetryEvent({
            action: 'clicked',
            subject: 'rovoDevCreatePrButton',
            attributes: {
                promptId: mockPromptId,
            },
        });

        expect(mockSendTrackEvent).toHaveBeenCalled();
        const event = await mockSendTrackEvent.mock.calls[0][0];

        expect(event.trackEvent.action).toEqual('clicked');
        expect(event.trackEvent.actionSubject).toEqual('rovoDevCreatePrButton');
        expect(event.trackEvent.attributes.rovoDevEnv).toEqual(rovoDevEnv);
        expect(event.trackEvent.attributes.appInstanceId).toEqual(appInstanceId);
        expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
        expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
    });
});
