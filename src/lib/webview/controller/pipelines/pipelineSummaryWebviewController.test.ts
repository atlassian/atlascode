import { Logger } from 'src/logger';

import { ProductBitbucket } from '../../../../atlclients/authInfo';
import {
    Pipeline,
    PipelineCommand,
    PipelineLogReference,
    PipelineLogStage,
    PipelineState,
    PipelineStep,
} from '../../../../pipelines/model';
import { AnalyticsApi } from '../../../analyticsApi';
import { CommonActionType } from '../../../ipc/fromUI/common';
import { PipelineSummaryAction, PipelineSummaryActionType } from '../../../ipc/fromUI/pipelineSummary';
import { PipelineSummaryMessageType } from '../../../ipc/toUI/pipelineSummary';
import { MessagePoster } from '../webviewController';
import { PipelinesSummaryActionApi } from './pipelinesSummaryActionApi';
import { PipelineSummaryWebviewController } from './pipelineSummaryWebviewController';

// Mock dependencies
jest.mock('../../../analyticsApi');
jest.mock('src/logger');

describe('PipelineSummaryWebviewController', () => {
    let controller: PipelineSummaryWebviewController;
    let mockMessagePoster: jest.MockedFunction<MessagePoster>;
    let mockApi: jest.Mocked<PipelinesSummaryActionApi>;
    let mockLogger: jest.Mocked<Logger>;
    let mockAnalytics: jest.Mocked<AnalyticsApi>;
    let mockPipeline: Pipeline;
    let mockSteps: PipelineStep[];

    beforeEach(() => {
        mockMessagePoster = jest.fn();
        mockApi = {
            refresh: jest.fn(),
            fetchSteps: jest.fn(),
            fetchLogRange: jest.fn(),
            rerunPipeline: jest.fn(),
        };
        mockLogger = {
            error: jest.fn(),
            info: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
        } as any;
        mockAnalytics = {
            firePipelineRerunEvent: jest.fn(),
        } as any;

        // Mock pipeline data
        mockPipeline = {
            site: {
                details: {
                    id: 'test-site',
                    name: 'Test Site',
                    avatarUrl: 'https://test.bitbucket.org/avatar.png',
                    host: 'test.bitbucket.org',
                    baseLinkUrl: 'https://test.bitbucket.org',
                    baseApiUrl: 'https://test.bitbucket.org/api',
                    product: ProductBitbucket,
                    isCloud: true,
                    userId: 'test-user-id',
                    credentialId: 'test-credential-id',
                },
                ownerSlug: 'test-user',
                repoSlug: 'test-repo',
            },
            repository: {
                id: 'repo-id',
                name: 'test-repo',
                displayName: 'Test Repository',
                fullName: 'test-user/test-repo',
                url: 'https://test.bitbucket.org/test-user/test-repo',
                avatarUrl: 'https://test.bitbucket.org/repo-avatar.png',
                issueTrackerEnabled: false,
            },
            build_number: 123,
            created_on: '2023-01-01T00:00:00Z',
            state: {
                name: 'SUCCESSFUL',
                type: 'pipeline_state_completed',
            } as PipelineState,
            uuid: 'pipeline-uuid',
            target: {
                type: 'pipeline_commit_target',
                commit: {
                    hash: 'abc123',
                },
            },
        } as Pipeline;

        // Mock pipeline steps
        mockSteps = [
            {
                run_number: 1,
                uuid: 'step-uuid-1',
                name: 'Build',
                setup_commands: [],
                script_commands: [
                    {
                        command: 'npm install',
                        name: 'Install dependencies',
                        log_range: { firstByte: 0, lastByte: 100, byteCount: 100 },
                    } as PipelineCommand,
                ],
                teardown_commands: [],
                duration_in_seconds: 60,
                setup_log_range: { firstByte: 0, lastByte: 50, byteCount: 50 },
                teardown_log_range: { firstByte: 200, lastByte: 250, byteCount: 50 },
            } as PipelineStep,
        ];

        controller = new PipelineSummaryWebviewController(
            mockMessagePoster,
            mockApi,
            mockLogger,
            mockAnalytics,
            mockPipeline,
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with provided dependencies', () => {
            expect(controller).toBeInstanceOf(PipelineSummaryWebviewController);
            expect(controller.requiredFeatureFlags).toEqual([]);
            expect(controller.requiredExperiments).toEqual([]);
        });

        it('should initialize without pipeline', () => {
            const controllerWithoutPipeline = new PipelineSummaryWebviewController(
                mockMessagePoster,
                mockApi,
                mockLogger,
                mockAnalytics,
            );
            expect(controllerWithoutPipeline).toBeInstanceOf(PipelineSummaryWebviewController);
        });
    });

    describe('title', () => {
        it('should return pipeline specific title when pipeline exists', () => {
            const title = controller.title();
            expect(title).toBe('Pipeline 123');
        });

        it('should return generic title when no pipeline', () => {
            const controllerWithoutPipeline = new PipelineSummaryWebviewController(
                mockMessagePoster,
                mockApi,
                mockLogger,
                mockAnalytics,
            );
            const title = controllerWithoutPipeline.title();
            expect(title).toBe('Bitbucket Pipeline');
        });
    });

    describe('screenDetails', () => {
        it('should return correct screen details', () => {
            const details = controller.screenDetails();
            expect(details).toEqual({
                id: 'pipelineSummaryScreen',
                site: mockPipeline.site.details,
                product: ProductBitbucket,
            });
        });

        it('should handle missing pipeline', () => {
            const controllerWithoutPipeline = new PipelineSummaryWebviewController(
                mockMessagePoster,
                mockApi,
                mockLogger,
                mockAnalytics,
            );
            const details = controllerWithoutPipeline.screenDetails();
            expect(details).toEqual({
                id: 'pipelineSummaryScreen',
                site: undefined,
                product: ProductBitbucket,
            });
        });
    });

    describe('onShown', () => {
        it('should not throw when called', () => {
            expect(() => controller.onShown()).not.toThrow();
        });
    });

    describe('onMessageReceived', () => {
        describe('CommonActionType.Refresh', () => {
            it('should refresh pipeline when pipeline exists', async () => {
                const refreshedPipeline = { ...mockPipeline, build_number: 124 };
                mockApi.refresh.mockResolvedValue(refreshedPipeline);

                const refreshMessage: PipelineSummaryAction = {
                    type: CommonActionType.Refresh,
                };

                await controller.onMessageReceived(refreshMessage);

                expect(mockApi.refresh).toHaveBeenCalledWith(mockPipeline);
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PipelineSummaryMessageType.Update,
                    pipeline: refreshedPipeline,
                });
            });

            it('should not refresh when no pipeline exists', async () => {
                const controllerWithoutPipeline = new PipelineSummaryWebviewController(
                    mockMessagePoster,
                    mockApi,
                    mockLogger,
                    mockAnalytics,
                );

                const refreshMessage: PipelineSummaryAction = {
                    type: CommonActionType.Refresh,
                };

                await controllerWithoutPipeline.onMessageReceived(refreshMessage);

                expect(mockApi.refresh).not.toHaveBeenCalled();
            });

            it('should handle refresh failure gracefully', async () => {
                mockApi.refresh.mockResolvedValue(undefined as any);

                const refreshMessage: PipelineSummaryAction = {
                    type: CommonActionType.Refresh,
                };

                await controller.onMessageReceived(refreshMessage);

                expect(mockApi.refresh).toHaveBeenCalledWith(mockPipeline);
                expect(mockMessagePoster).not.toHaveBeenCalled();
            });
        });

        describe('PipelineSummaryActionType.FetchLogRange', () => {
            beforeEach(async () => {
                // Set up steps in controller
                mockApi.fetchSteps.mockResolvedValue(mockSteps);
                await controller.update(mockPipeline);
                jest.clearAllMocks(); // Clear the messages from update
            });

            it('should fetch and attach setup logs', async () => {
                const logReference: PipelineLogReference = {
                    stepIndex: 0,
                    stage: PipelineLogStage.SETUP,
                };

                const fetchLogMessage: PipelineSummaryAction = {
                    type: PipelineSummaryActionType.FetchLogRange,
                    uuid: 'step-uuid-1',
                    reference: logReference,
                };

                const mockLogs = 'Setup log content';
                mockApi.fetchLogRange.mockResolvedValue(mockLogs);

                await controller.onMessageReceived(fetchLogMessage);

                expect(mockApi.fetchLogRange).toHaveBeenCalledWith(
                    mockPipeline.site,
                    mockPipeline.uuid,
                    'step-uuid-1',
                    { firstByte: 0, lastByte: 50, byteCount: 50 },
                );

                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PipelineSummaryMessageType.StepsUpdate,
                    steps: expect.arrayContaining([
                        expect.objectContaining({
                            setup_logs: mockLogs,
                        }),
                    ]),
                });
            });

            it('should fetch and attach teardown logs', async () => {
                const logReference: PipelineLogReference = {
                    stepIndex: 0,
                    stage: PipelineLogStage.TEARDOWN,
                };

                const fetchLogMessage: PipelineSummaryAction = {
                    type: PipelineSummaryActionType.FetchLogRange,
                    uuid: 'step-uuid-1',
                    reference: logReference,
                };

                const mockLogs = 'Teardown log content';
                mockApi.fetchLogRange.mockResolvedValue(mockLogs);

                await controller.onMessageReceived(fetchLogMessage);

                expect(mockApi.fetchLogRange).toHaveBeenCalledWith(
                    mockPipeline.site,
                    mockPipeline.uuid,
                    'step-uuid-1',
                    { firstByte: 200, lastByte: 250, byteCount: 50 },
                );

                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PipelineSummaryMessageType.StepsUpdate,
                    steps: expect.arrayContaining([
                        expect.objectContaining({
                            teardown_logs: mockLogs,
                        }),
                    ]),
                });
            });

            it('should fetch and attach build command logs', async () => {
                const logReference: PipelineLogReference = {
                    stepIndex: 0,
                    stage: PipelineLogStage.BUILD,
                    commandIndex: 0,
                };

                const fetchLogMessage: PipelineSummaryAction = {
                    type: PipelineSummaryActionType.FetchLogRange,
                    uuid: 'step-uuid-1',
                    reference: logReference,
                };

                const mockLogs = 'Build command log content';
                mockApi.fetchLogRange.mockResolvedValue(mockLogs);

                await controller.onMessageReceived(fetchLogMessage);

                expect(mockApi.fetchLogRange).toHaveBeenCalledWith(
                    mockPipeline.site,
                    mockPipeline.uuid,
                    'step-uuid-1',
                    { firstByte: 0, lastByte: 100, byteCount: 100 },
                );

                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PipelineSummaryMessageType.StepsUpdate,
                    steps: expect.arrayContaining([
                        expect.objectContaining({
                            script_commands: expect.arrayContaining([
                                expect.objectContaining({
                                    logs: mockLogs,
                                }),
                            ]),
                        }),
                    ]),
                });
            });

            it('should handle missing pipeline', async () => {
                const controllerWithoutPipeline = new PipelineSummaryWebviewController(
                    mockMessagePoster,
                    mockApi,
                    mockLogger,
                    mockAnalytics,
                );

                const logReference: PipelineLogReference = {
                    stepIndex: 0,
                    stage: PipelineLogStage.SETUP,
                };

                const fetchLogMessage: PipelineSummaryAction = {
                    type: PipelineSummaryActionType.FetchLogRange,
                    uuid: 'step-uuid-1',
                    reference: logReference,
                };

                await controllerWithoutPipeline.onMessageReceived(fetchLogMessage);

                expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Error));
                expect(mockApi.fetchLogRange).not.toHaveBeenCalled();
            });

            it('should handle invalid step index', async () => {
                const logReference: PipelineLogReference = {
                    stepIndex: 999, // Invalid index
                    stage: PipelineLogStage.SETUP,
                };

                const fetchLogMessage: PipelineSummaryAction = {
                    type: PipelineSummaryActionType.FetchLogRange,
                    uuid: 'step-uuid-1',
                    reference: logReference,
                };

                const mockLogs = 'Log content';
                mockApi.fetchLogRange.mockResolvedValue(mockLogs);

                await controller.onMessageReceived(fetchLogMessage);

                expect(mockApi.fetchLogRange).toHaveBeenCalledWith(
                    mockPipeline.site,
                    mockPipeline.uuid,
                    'step-uuid-1',
                    { firstByte: 0, lastByte: 0, byteCount: 0 }, // Default range
                );
            });

            it('should handle invalid command index for build stage', async () => {
                const logReference: PipelineLogReference = {
                    stepIndex: 0,
                    stage: PipelineLogStage.BUILD,
                    commandIndex: 999, // Invalid index
                };

                const fetchLogMessage: PipelineSummaryAction = {
                    type: PipelineSummaryActionType.FetchLogRange,
                    uuid: 'step-uuid-1',
                    reference: logReference,
                };

                const mockLogs = 'Log content';
                mockApi.fetchLogRange.mockResolvedValue(mockLogs);

                await controller.onMessageReceived(fetchLogMessage);

                expect(mockApi.fetchLogRange).toHaveBeenCalledWith(
                    mockPipeline.site,
                    mockPipeline.uuid,
                    'step-uuid-1',
                    { firstByte: 0, lastByte: 0, byteCount: 0 }, // Default range
                );
            });
        });

        describe('PipelineSummaryActionType.ReRunPipeline', () => {
            it('should rerun pipeline and fire analytics event', async () => {
                const rerunMessage: PipelineSummaryAction = {
                    type: PipelineSummaryActionType.ReRunPipeline,
                };

                await controller.onMessageReceived(rerunMessage);

                expect(mockAnalytics.firePipelineRerunEvent).toHaveBeenCalledWith(
                    mockPipeline.site.details,
                    'summaryWebview',
                );
                expect(mockApi.rerunPipeline).toHaveBeenCalledWith(mockPipeline);
            });

            it('should handle missing pipeline', async () => {
                const controllerWithoutPipeline = new PipelineSummaryWebviewController(
                    mockMessagePoster,
                    mockApi,
                    mockLogger,
                    mockAnalytics,
                );

                const rerunMessage: PipelineSummaryAction = {
                    type: PipelineSummaryActionType.ReRunPipeline,
                };

                await controllerWithoutPipeline.onMessageReceived(rerunMessage);

                expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Error));
                expect(mockAnalytics.firePipelineRerunEvent).not.toHaveBeenCalled();
                expect(mockApi.rerunPipeline).not.toHaveBeenCalled();
            });
        });
    });

    describe('update', () => {
        it('should update pipeline and fetch steps', async () => {
            const newPipeline = { ...mockPipeline, build_number: 124 };
            mockApi.fetchSteps.mockResolvedValue(mockSteps);

            await controller.update(newPipeline);

            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: PipelineSummaryMessageType.Update,
                pipeline: newPipeline,
            });

            expect(mockApi.fetchSteps).toHaveBeenCalledWith(
                newPipeline.site,
                newPipeline.uuid,
                newPipeline.build_number,
            );

            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: PipelineSummaryMessageType.StepsUpdate,
                steps: mockSteps,
            });
        });

        it('should handle fetchSteps failure', async () => {
            const newPipeline = { ...mockPipeline, build_number: 124 };
            mockApi.fetchSteps.mockRejectedValue(new Error('API Error'));

            await expect(controller.update(newPipeline)).rejects.toThrow('API Error');

            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: PipelineSummaryMessageType.Update,
                pipeline: newPipeline,
            });

            expect(mockApi.fetchSteps).toHaveBeenCalledWith(
                newPipeline.site,
                newPipeline.uuid,
                newPipeline.build_number,
            );
        });
    });

    describe('private methods behavior', () => {
        beforeEach(async () => {
            mockApi.fetchSteps.mockResolvedValue(mockSteps);
            await controller.update(mockPipeline);
            jest.clearAllMocks();
        });

        it('should handle rangeForReference with default command index', async () => {
            const logReference: PipelineLogReference = {
                stepIndex: 0,
                stage: PipelineLogStage.BUILD,
                // commandIndex is undefined, should default to 0
            };

            const fetchLogMessage: PipelineSummaryAction = {
                type: PipelineSummaryActionType.FetchLogRange,
                uuid: 'step-uuid-1',
                reference: logReference,
            };

            mockApi.fetchLogRange.mockResolvedValue('logs');

            await controller.onMessageReceived(fetchLogMessage);

            expect(mockApi.fetchLogRange).toHaveBeenCalledWith(mockPipeline.site, mockPipeline.uuid, 'step-uuid-1', {
                firstByte: 0,
                lastByte: 100,
                byteCount: 100,
            });
        });

        it('should attach logs to correct script command', async () => {
            // Add a second command to test targeting specific command
            const stepsWithMultipleCommands = [
                {
                    ...mockSteps[0],
                    script_commands: [
                        ...mockSteps[0].script_commands,
                        {
                            command: 'npm test',
                            name: 'Run tests',
                            log_range: { firstByte: 100, lastByte: 200, byteCount: 100 },
                        } as PipelineCommand,
                    ],
                },
            ];

            mockApi.fetchSteps.mockResolvedValue(stepsWithMultipleCommands);
            await controller.update(mockPipeline);
            jest.clearAllMocks();

            const logReference: PipelineLogReference = {
                stepIndex: 0,
                stage: PipelineLogStage.BUILD,
                commandIndex: 1, // Target second command
            };

            const fetchLogMessage: PipelineSummaryAction = {
                type: PipelineSummaryActionType.FetchLogRange,
                uuid: 'step-uuid-1',
                reference: logReference,
            };

            const mockLogs = 'Test command logs';
            mockApi.fetchLogRange.mockResolvedValue(mockLogs);

            await controller.onMessageReceived(fetchLogMessage);

            expect(mockApi.fetchLogRange).toHaveBeenCalledWith(mockPipeline.site, mockPipeline.uuid, 'step-uuid-1', {
                firstByte: 100,
                lastByte: 200,
                byteCount: 100,
            });

            // Verify logs were attached to the second command
            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: PipelineSummaryMessageType.StepsUpdate,
                steps: expect.arrayContaining([
                    expect.objectContaining({
                        script_commands: expect.arrayContaining([
                            expect.objectContaining({
                                command: 'npm test',
                                logs: mockLogs,
                            }),
                        ]),
                    }),
                ]),
            });
        });
    });
});
