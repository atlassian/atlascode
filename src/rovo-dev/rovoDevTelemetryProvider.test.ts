import { Logger } from 'src/logger';

import { RovoDevEnv } from './analytics/events';
import { RovoDevTelemetryProvider } from './rovoDevTelemetryProvider';

const mockSendTrackEvent = jest.fn();

jest.mock('src/logger', () => {
    return {
        Logger: {
            rovoDevErrorInternal: jest.fn(),
            debug: jest.fn(),
        },
        retrieveCallerName: jest.fn(),
    };
});

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
        telemetryProvider = new RovoDevTelemetryProvider('IDE', appInstanceId);
        telemetryProvider.startNewSession(mockSessionId, 'init');
    });

    it.each(RovoDevEnvironments)(
        'should create rovoDevNewSessionActionEvent with session information',
        async (rovoDevEnv) => {
            telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId);
            mockSendTrackEvent.mockClear();
            await telemetryProvider.startNewSession(mockSessionId, 'manuallyCreated');

            expect(mockSendTrackEvent).toHaveBeenCalled();
            const event = await mockSendTrackEvent.mock.calls[0][0];

            expect(event.trackEvent.action).toEqual('rovoDevNewSessionAction');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.rovoDevEnv).toEqual(rovoDevEnv);
            expect(event.trackEvent.attributes.appInstanceId).toEqual(appInstanceId);
            expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
            expect(event.trackEvent.attributes.source).toEqual('manuallyCreated');
        },
    );

    it.each(RovoDevEnvironments)(
        'should create rovoDevPromptSentEvent with session and prompt IDs',
        async (rovoDevEnv) => {
            telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId);
            await telemetryProvider.startNewSession(mockSessionId, 'init');
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
            telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId);
            await telemetryProvider.startNewSession(mockSessionId, 'init');
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
            telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId);
            await telemetryProvider.startNewSession(mockSessionId, 'init');
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
        telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId);
        await telemetryProvider.startNewSession(mockSessionId, 'init');
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
        telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId);
        await telemetryProvider.startNewSession(mockSessionId, 'init');
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
        telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId);
        await telemetryProvider.startNewSession(mockSessionId, 'init');
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
        telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId);
        await telemetryProvider.startNewSession(mockSessionId, 'init');
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
        telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId);
        await telemetryProvider.startNewSession(mockSessionId, 'init');
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
            telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId);
            await telemetryProvider.startNewSession(mockSessionId, 'init');
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
        telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId);
        await telemetryProvider.startNewSession(mockSessionId, 'init');
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
        telemetryProvider = new RovoDevTelemetryProvider(rovoDevEnv, appInstanceId);
        await telemetryProvider.startNewSession(mockSessionId, 'init');
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

// RovoDevTelemetryProvider error logging tests
describe('RovoDevTelemetryProvider error logging', () => {
    const appInstanceId = 'test-app-instance-123';
    const mockSessionId = 'test-session-456';
    const mockPromptId = 'test-prompt-789';
    let telemetryProvider: RovoDevTelemetryProvider;
    const { retrieveCallerName } = require('src/logger');

    beforeEach(() => {
        jest.clearAllMocks();
        retrieveCallerName.mockReturnValue('testCallerFunction');
        telemetryProvider = new RovoDevTelemetryProvider('IDE', appInstanceId);
        telemetryProvider.startNewSession(mockSessionId, 'init');
        telemetryProvider.startNewPrompt(mockPromptId);
    });

    describe('instance logError method', () => {
        it('should call Logger.rovoDevErrorInternal with correct metadata for IDE environment', () => {
            const testError = new Error('Test RovoDev error');
            const errorMessage = 'Something went wrong in RovoDev';

            telemetryProvider.logError(testError, errorMessage, 'param1', 'param2');

            expect(Logger.rovoDevErrorInternal).toHaveBeenCalledWith(
                testError,
                'testCallerFunction',
                errorMessage,
                {
                    rovoDevEnv: 'IDE',
                    appInstanceId: appInstanceId,
                    sessionId: mockSessionId,
                },
                mockPromptId,
                'param1',
                'param2',
            );
        });

        it('should call Logger.rovoDevErrorInternal with correct metadata for Boysenberry environment', () => {
            const bbyTelemetryProvider = new RovoDevTelemetryProvider('Boysenberry', 'bby-instance-456');
            bbyTelemetryProvider.startNewSession('bby-session-789', 'init');
            bbyTelemetryProvider.startNewPrompt('bby-prompt-012');

            const testError = new Error('BBY error');
            bbyTelemetryProvider.logError(testError, 'BBY failed');

            expect(Logger.rovoDevErrorInternal).toHaveBeenCalledWith(
                testError,
                'testCallerFunction',
                'BBY failed',
                {
                    rovoDevEnv: 'Boysenberry',
                    appInstanceId: 'bby-instance-456',
                    sessionId: 'bby-session-789',
                },
                'bby-prompt-012',
            );
        });

        it('should include current sessionId in metadata', () => {
            const testError = new Error('Test error');
            telemetryProvider.logError(testError);

            expect(Logger.rovoDevErrorInternal).toHaveBeenCalledWith(
                testError,
                'testCallerFunction',
                undefined,
                expect.objectContaining({
                    sessionId: mockSessionId,
                }),
                mockPromptId,
            );
        });

        it('should include current promptId in call', () => {
            const testError = new Error('Test error');
            telemetryProvider.logError(testError, 'Error occurred');

            expect(Logger.rovoDevErrorInternal).toHaveBeenCalledWith(
                testError,
                'testCallerFunction',
                'Error occurred',
                expect.any(Object),
                mockPromptId,
            );
        });

        it('should pass through all params to Logger', () => {
            const testError = new Error('Test error');
            telemetryProvider.logError(testError, 'Error message', 'p1', 'p2', 'p3');

            expect(Logger.rovoDevErrorInternal).toHaveBeenCalledWith(
                testError,
                'testCallerFunction',
                'Error message',
                expect.any(Object),
                mockPromptId,
                'p1',
                'p2',
                'p3',
            );
        });

        it('should retrieve caller name from stack trace', () => {
            const testError = new Error('Test error');
            telemetryProvider.logError(testError);

            expect(retrieveCallerName).toHaveBeenCalled();
            expect(Logger.rovoDevErrorInternal).toHaveBeenCalledWith(
                testError,
                'testCallerFunction',
                undefined,
                expect.any(Object),
                mockPromptId,
            );
        });

        it('should handle error without message or params', () => {
            const testError = new Error('Minimal error');
            telemetryProvider.logError(testError);

            expect(Logger.rovoDevErrorInternal).toHaveBeenCalledWith(
                testError,
                'testCallerFunction',
                undefined,
                expect.objectContaining({
                    rovoDevEnv: 'IDE',
                    appInstanceId: appInstanceId,
                    sessionId: mockSessionId,
                }),
                mockPromptId,
            );
        });
    });

    describe('static logError method', () => {
        beforeEach(() => {
            // Set the static Instance for the static method to use
            RovoDevTelemetryProvider['Instance'] = telemetryProvider;
        });

        afterEach(() => {
            RovoDevTelemetryProvider['Instance'] = undefined;
        });

        it('should call instance logErrorInternal when Instance is set', () => {
            const testError = new Error('Static error');
            RovoDevTelemetryProvider.logError(testError, 'Static error message');

            expect(Logger.rovoDevErrorInternal).toHaveBeenCalledWith(
                testError,
                'testCallerFunction',
                'Static error message',
                expect.objectContaining({
                    rovoDevEnv: 'IDE',
                    appInstanceId: appInstanceId,
                    sessionId: mockSessionId,
                }),
                mockPromptId,
            );
        });

        it('should retrieve caller name for static calls', () => {
            const testError = new Error('Static error');
            RovoDevTelemetryProvider.logError(testError);

            expect(retrieveCallerName).toHaveBeenCalled();
            expect(Logger.rovoDevErrorInternal).toHaveBeenCalledWith(
                testError,
                'testCallerFunction',
                undefined,
                expect.any(Object),
                mockPromptId,
            );
        });

        it('should not throw when Instance is undefined', () => {
            RovoDevTelemetryProvider['Instance'] = undefined;
            const testError = new Error('No instance error');

            expect(() => {
                RovoDevTelemetryProvider.logError(testError, 'Should not crash');
            }).not.toThrow();

            expect(Logger.rovoDevErrorInternal).not.toHaveBeenCalled();
        });

        it('should pass params through to instance method', () => {
            const testError = new Error('Static error');
            RovoDevTelemetryProvider.logError(testError, 'Message', 'param1', 'param2');

            expect(Logger.rovoDevErrorInternal).toHaveBeenCalledWith(
                testError,
                'testCallerFunction',
                'Message',
                expect.any(Object),
                mockPromptId,
                'param1',
                'param2',
            );
        });
    });

    describe('metadata tracking', () => {
        it('should update metadata when session changes', () => {
            const testError = new Error('First session error');
            telemetryProvider.logError(testError);

            expect(Logger.rovoDevErrorInternal).toHaveBeenCalledWith(
                testError,
                expect.any(String),
                undefined,
                expect.objectContaining({
                    sessionId: mockSessionId,
                }),
                mockPromptId,
            );

            // Start a new session
            const newSessionId = 'new-session-999';
            const newPromptId = 'new-prompt-111';
            telemetryProvider.startNewSession(newSessionId, 'manuallyCreated');
            telemetryProvider.startNewPrompt(newPromptId);
            jest.clearAllMocks();

            const testError2 = new Error('Second session error');
            telemetryProvider.logError(testError2);

            expect(Logger.rovoDevErrorInternal).toHaveBeenCalledWith(
                testError2,
                expect.any(String),
                undefined,
                expect.objectContaining({
                    sessionId: newSessionId,
                }),
                newPromptId,
            );
        });

        it('should update promptId when prompt changes', () => {
            const testError = new Error('First prompt error');
            telemetryProvider.logError(testError);

            expect(Logger.rovoDevErrorInternal).toHaveBeenCalledWith(
                testError,
                expect.any(String),
                undefined,
                expect.any(Object),
                mockPromptId,
            );

            // Start a new prompt
            const newPromptId = 'new-prompt-999';
            telemetryProvider.startNewPrompt(newPromptId);
            jest.clearAllMocks();

            const testError2 = new Error('Second prompt error');
            telemetryProvider.logError(testError2);

            expect(Logger.rovoDevErrorInternal).toHaveBeenCalledWith(
                testError2,
                expect.any(String),
                undefined,
                expect.any(Object),
                newPromptId,
            );
        });

        it('should maintain appInstanceId across sessions', () => {
            telemetryProvider.startNewSession('session-1', 'init');
            telemetryProvider.startNewPrompt('prompt-1');
            const testError1 = new Error('Error 1');
            telemetryProvider.logError(testError1);

            expect(Logger.rovoDevErrorInternal).toHaveBeenCalledWith(
                testError1,
                expect.any(String),
                undefined,
                expect.objectContaining({
                    appInstanceId: appInstanceId,
                }),
                'prompt-1',
            );

            telemetryProvider.startNewSession('session-2', 'manuallyCreated');
            telemetryProvider.startNewPrompt('prompt-2');
            jest.clearAllMocks();

            const testError2 = new Error('Error 2');
            telemetryProvider.logError(testError2);

            expect(Logger.rovoDevErrorInternal).toHaveBeenCalledWith(
                testError2,
                expect.any(String),
                undefined,
                expect.objectContaining({
                    appInstanceId: appInstanceId,
                }),
                'prompt-2',
            );
        });

        it('should maintain rovoDevEnv across sessions', () => {
            const testError = new Error('Error');
            telemetryProvider.logError(testError);

            const firstCall = (Logger.rovoDevErrorInternal as jest.Mock).mock.calls[0];
            expect(firstCall[3].rovoDevEnv).toBe('IDE');

            telemetryProvider.startNewSession('new-session', 'restored');
            telemetryProvider.startNewPrompt('new-prompt');
            jest.clearAllMocks();

            telemetryProvider.logError(testError);
            const secondCall = (Logger.rovoDevErrorInternal as jest.Mock).mock.calls[0];
            expect(secondCall[3].rovoDevEnv).toBe('IDE');
        });
    });
});
