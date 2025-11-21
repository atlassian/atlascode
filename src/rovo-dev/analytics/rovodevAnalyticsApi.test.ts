import * as analytics from './rovodevAnalyticsApi';
import { RovoDevEnv } from './rovodevAnalyticsTypes';

jest.mock('src/container', () => ({
    Container: {
        analyticsClient: {
            sendTrackEvent: jest.fn(),
        },
    },
}));

import { Container } from 'src/container';

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

describe('Rovodev Analytics API', () => {
    it('should send track event through Container', async () => {
        const analyticsApi = new analytics.RovodevAnalyticsApi();
        const mockEvent = { type: 'test', data: 'value' };
        await analyticsApi.sendTrackEvent(mockEvent);

        expect(Container.analyticsClient.sendTrackEvent).toHaveBeenCalledWith(mockEvent);
    });

    // Rovo Dev event tests
    describe('Rovo Dev events', () => {
        const appInstanceId = 'test-app-session-id';
        const mockSessionId = 'test-session-id';
        const mockPromptId = 'test-prompt-id';

        beforeEach(() => {
            setProcessPlatform('win32');
            mockedData.getFirstAAID_value = 'some-user-id';
        });

        it.each(RovoDevEnvironments)(
            'should create rovoDevNewSessionActionEvent with session information',
            async (rovoDevEnv) => {
                const isManuallyCreated = true;
                const event = await analytics.rovoDevNewSessionActionEvent(
                    rovoDevEnv,
                    appInstanceId,
                    mockSessionId,
                    isManuallyCreated,
                );

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
                const event = await analytics.rovoDevPromptSentEvent(
                    rovoDevEnv,
                    appInstanceId,
                    mockSessionId,
                    mockPromptId,
                    true,
                );

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
                const event = await analytics.rovoDevTechnicalPlanningShownEvent(
                    rovoDevEnv,
                    appInstanceId,
                    mockSessionId,
                    mockPromptId,
                    stepsCount,
                    filesCount,
                    questionsCount,
                );

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
                const event = await analytics.rovoDevFilesSummaryShownEvent(
                    rovoDevEnv,
                    appInstanceId,
                    mockSessionId,
                    mockPromptId,
                    filesCount,
                );

                expect(event.trackEvent.action).toEqual('rovoDevFilesSummaryShown');
                expect(event.trackEvent.actionSubject).toEqual('atlascode');
                expect(event.trackEvent.attributes.rovoDevEnv).toEqual(rovoDevEnv);
                expect(event.trackEvent.attributes.appInstanceId).toEqual(appInstanceId);
                expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
                expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
                expect(event.trackEvent.attributes.filesCount).toEqual(filesCount);
            },
        );

        it.each(RovoDevEnvironments)(
            'should create rovoDevFileChangedActionEvent for undo action',
            async (rovoDevEnv) => {
                const action = 'undo';
                const filesCount = 3;
                const event = await analytics.rovoDevFileChangedActionEvent(
                    rovoDevEnv,
                    appInstanceId,
                    mockSessionId,
                    mockPromptId,
                    action,
                    filesCount,
                );

                expect(event.trackEvent.action).toEqual('rovoDevFileChangedAction');
                expect(event.trackEvent.actionSubject).toEqual('atlascode');
                expect(event.trackEvent.attributes.rovoDevEnv).toEqual(rovoDevEnv);
                expect(event.trackEvent.attributes.appInstanceId).toEqual(appInstanceId);
                expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
                expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
                expect(event.trackEvent.attributes.action).toEqual(action);
                expect(event.trackEvent.attributes.filesCount).toEqual(filesCount);
            },
        );

        it.each(RovoDevEnvironments)(
            'should create rovoDevFileChangedActionEvent for keep action',
            async (rovoDevEnv) => {
                const action = 'keep';
                const filesCount = 2;
                const event = await analytics.rovoDevFileChangedActionEvent(
                    rovoDevEnv,
                    appInstanceId,
                    mockSessionId,
                    mockPromptId,
                    action,
                    filesCount,
                );

                expect(event.trackEvent.action).toEqual('rovoDevFileChangedAction');
                expect(event.trackEvent.actionSubject).toEqual('atlascode');
                expect(event.trackEvent.attributes.rovoDevEnv).toEqual(rovoDevEnv);
                expect(event.trackEvent.attributes.appInstanceId).toEqual(appInstanceId);
                expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
                expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
                expect(event.trackEvent.attributes.action).toEqual(action);
                expect(event.trackEvent.attributes.filesCount).toEqual(filesCount);
            },
        );

        it.each(RovoDevEnvironments)('should create rovoDevStopActionEvent when successful', async (rovoDevEnv) => {
            const event = await analytics.rovoDevStopActionEvent(
                rovoDevEnv,
                appInstanceId,
                mockSessionId,
                mockPromptId,
            );

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
            const event = await analytics.rovoDevStopActionEvent(
                rovoDevEnv,
                appInstanceId,
                mockSessionId,
                mockPromptId,
                failed,
            );

            expect(event.trackEvent.action).toEqual('rovoDevStopAction');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.rovoDevEnv).toEqual(rovoDevEnv);
            expect(event.trackEvent.attributes.appInstanceId).toEqual(appInstanceId);
            expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
            expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
            expect(event.trackEvent.attributes.failed).toEqual(failed);
        });

        it.each(RovoDevEnvironments)(
            'should create rovoDevGitPushActionEvent when PR is created',
            async (rovoDevEnv) => {
                const prCreated = true;
                const event = await analytics.rovoDevGitPushActionEvent(
                    rovoDevEnv,
                    appInstanceId,
                    mockSessionId,
                    mockPromptId,
                    prCreated,
                );

                expect(event.trackEvent.action).toEqual('rovoDevGitPushAction');
                expect(event.trackEvent.actionSubject).toEqual('atlascode');
                expect(event.trackEvent.attributes.rovoDevEnv).toEqual(rovoDevEnv);
                expect(event.trackEvent.attributes.appInstanceId).toEqual(appInstanceId);
                expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
                expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
                expect(event.trackEvent.attributes.prCreated).toEqual(prCreated);
            },
        );

        it.each(RovoDevEnvironments)(
            'should create rovoDevGitPushActionEvent when PR is not created',
            async (rovoDevEnv) => {
                const prCreated = false;
                const event = await analytics.rovoDevGitPushActionEvent(
                    rovoDevEnv,
                    appInstanceId,
                    mockSessionId,
                    mockPromptId,
                    prCreated,
                );

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
            const event = await analytics.rovoDevDetailsExpandedEvent(
                rovoDevEnv,
                appInstanceId,
                mockSessionId,
                mockPromptId,
            );

            expect(event.trackEvent.action).toEqual('rovoDevDetailsExpanded');
            expect(event.trackEvent.actionSubject).toEqual('atlascode');
            expect(event.trackEvent.attributes.rovoDevEnv).toEqual(rovoDevEnv);
            expect(event.trackEvent.attributes.appInstanceId).toEqual(appInstanceId);
            expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
            expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
        });

        it.each(RovoDevEnvironments)('should create rovoDevCreatePrButtonClickedEvent', async (rovoDevEnv) => {
            const event = await analytics.rovoDevCreatePrButtonClickedEvent(
                rovoDevEnv,
                appInstanceId,
                mockSessionId,
                mockPromptId,
            );

            expect(event.trackEvent.action).toEqual('clicked');
            expect(event.trackEvent.actionSubject).toEqual('rovoDevCreatePrButton');
            expect(event.trackEvent.attributes.rovoDevEnv).toEqual(rovoDevEnv);
            expect(event.trackEvent.attributes.appInstanceId).toEqual(appInstanceId);
            expect(event.trackEvent.attributes.sessionId).toEqual(mockSessionId);
            expect(event.trackEvent.attributes.promptId).toEqual(mockPromptId);
        });
    });
});
