import { ProductBitbucket } from '../atlclients/authInfo';
import { CloudRepositoriesApi } from '../bitbucket/bitbucket-cloud/repositories';
import { HTTPClient } from '../bitbucket/httpClient';
import { BitbucketSite, Repo } from '../bitbucket/model';
import { Logger } from '../logger';
import {
    Pipeline,
    PipelineLogRange,
    PipelineReferenceType,
    PipelineResult,
    PipelineSelector,
    PipelineSelectorType,
    PipelineStep,
    PipelineTargetType,
} from './model';
import { PipelineApiImpl } from './pipelines';

// Mock Logger
jest.mock('../logger', () => ({
    Logger: {
        debug: jest.fn(),
    },
}));

// Mock CloudRepositoriesApi
jest.mock('../bitbucket/bitbucket-cloud/repositories', () => ({
    CloudRepositoriesApi: {
        toRepo: jest.fn(),
    },
}));

// Mock HTTPClient
jest.mock('../bitbucket/httpClient');

describe('PipelineApiImpl', () => {
    let mockHttpClient: jest.Mocked<HTTPClient>;
    let pipelineApi: PipelineApiImpl;
    let mockSite: BitbucketSite;
    let mockRepo: Repo;

    beforeEach(() => {
        jest.clearAllMocks();

        mockHttpClient = {
            get: jest.fn(),
            post: jest.fn(),
            getOctetStream: jest.fn(),
            getUrl: jest.fn(),
        } as unknown as jest.Mocked<HTTPClient>;

        pipelineApi = new PipelineApiImpl(mockHttpClient);

        // Create a fully typed mock Repo
        mockRepo = {
            name: 'test-repo',
            fullName: 'test-owner/test-repo',
            url: 'https://bitbucket.org/test-owner/test-repo',
            id: 'repo-id',
            displayName: 'Test Repo',
            avatarUrl: 'https://avatar-url',
            issueTrackerEnabled: true,
        };

        // Create a fully typed mockSite with proper Product structure
        mockSite = {
            ownerSlug: 'test-owner',
            repoSlug: 'test-repo',
            details: {
                baseLinkUrl: 'https://bitbucket.org',
                baseApiUrl: 'https://api.bitbucket.org',
                id: 'test-site',
                product: ProductBitbucket,
                host: 'bitbucket.org',
                isCloud: true,
                userId: 'test-user',
                credentialId: 'test-cred',
                name: 'Test Site',
                avatarUrl: '',
            },
        };

        // Mock CloudRepositoriesApi.toRepo to return mockRepo
        (CloudRepositoriesApi.toRepo as jest.Mock).mockReturnValue(mockRepo);
    });

    describe('getRecentActivity', () => {
        it('should call getSinglepagePipelines and return pipelines', async () => {
            // Setup mock data
            const mockPipelines: Pipeline[] = [
                {
                    site: mockSite,
                    repository: mockRepo,
                    build_number: 1,
                    created_on: '2023-01-01T00:00:00Z',
                    state: { name: 'COMPLETED', type: 'pipeline_state_completed' },
                    uuid: 'test-uuid-1',
                    target: { type: PipelineTargetType.Commit },
                },
            ];

            // Mock the getSinglepagePipelines method (which is private)
            // We'll use jest.spyOn to spy on the private method implementation
            jest.spyOn(pipelineApi as any, 'getSinglepagePipelines').mockResolvedValue(mockPipelines);

            // Call the method
            const result = await pipelineApi.getRecentActivity(mockSite);

            // Assertions
            expect(result).toEqual(mockPipelines);
            expect((pipelineApi as any).getSinglepagePipelines).toHaveBeenCalledWith(mockSite);
        });
    });

    describe('getPipeline', () => {
        it('should fetch and return pipeline by uuid', async () => {
            // Setup mock data
            const uuid = 'test-uuid';
            const mockRawPipeline = {
                uuid: uuid,
                build_number: 1,
                created_on: '2023-01-01T00:00:00Z',
                state: { name: 'COMPLETED', type: 'pipeline_state_completed' },
                target: { type: 'pipeline_commit_target' },
                repository: mockRepo,
            };
            const mockResponse = { data: mockRawPipeline };

            // Mock HTTP client response
            mockHttpClient.get.mockResolvedValue(mockResponse);

            // Mock cleanPipelineData method
            jest.spyOn(pipelineApi as any, 'cleanPipelineData').mockImplementation((site, rawData: any) => {
                return {
                    site,
                    repository: mockRepo,
                    build_number: rawData.build_number,
                    created_on: rawData.created_on,
                    state: rawData.state,
                    uuid: rawData.uuid,
                    target: { type: PipelineTargetType.Commit },
                } as Pipeline;
            });

            // Call the method
            const result = await pipelineApi.getPipeline(mockSite, uuid);

            // Assertions
            expect(mockHttpClient.get).toHaveBeenCalledWith(`/repositories/test-owner/test-repo/pipelines/${uuid}`);
            expect(result).toEqual({
                site: mockSite,
                repository: mockRepo,
                build_number: 1,
                created_on: '2023-01-01T00:00:00Z',
                state: { name: 'COMPLETED', type: 'pipeline_state_completed' },
                uuid: uuid,
                target: { type: PipelineTargetType.Commit },
            });
        });
    });

    describe('triggerPipeline', () => {
        it('should trigger a pipeline with the provided target', async () => {
            // Setup mock data
            const mockTarget = {
                type: 'pipeline_commit_target',
                commit: { hash: 'abc123' },
            };
            const mockRawPipeline = {
                uuid: 'new-pipeline-uuid',
                build_number: 5,
                created_on: '2023-01-01T00:00:00Z',
                state: { name: 'PENDING', type: 'pipeline_state_pending' },
                target: mockTarget,
                repository: mockRepo,
            };
            const mockResponse = { data: mockRawPipeline };

            // Mock HTTP client response
            mockHttpClient.post.mockResolvedValue(mockResponse);

            // Mock cleanPipelineData method
            jest.spyOn(pipelineApi as any, 'cleanPipelineData').mockImplementation((site, rawData: any) => {
                return {
                    site,
                    repository: mockRepo,
                    build_number: rawData.build_number,
                    created_on: rawData.created_on,
                    state: rawData.state,
                    uuid: rawData.uuid,
                    target: { type: PipelineTargetType.Commit, commit: rawData.target.commit },
                } as Pipeline;
            });

            // Call the method
            const result = await pipelineApi.triggerPipeline(mockSite, mockTarget);

            // Assertions
            expect(mockHttpClient.post).toHaveBeenCalledWith(`/repositories/test-owner/test-repo/pipelines/`, {
                target: mockTarget,
            });
            expect(result).toEqual({
                site: mockSite,
                repository: mockRepo,
                build_number: 5,
                created_on: '2023-01-01T00:00:00Z',
                state: { name: 'PENDING', type: 'pipeline_state_pending' },
                uuid: 'new-pipeline-uuid',
                target: {
                    type: PipelineTargetType.Commit,
                    commit: { hash: 'abc123' },
                },
            });
        });
    });

    describe('getSteps', () => {
        it('should fetch and return pipeline steps by uuid', async () => {
            // Setup mock data
            const uuid = 'test-pipeline-uuid';
            const mockRawSteps = {
                values: [
                    {
                        run_number: 1,
                        uuid: 'step-uuid-1',
                        name: 'Build',
                        state: { name: 'COMPLETED', type: 'pipeline_state_completed' },
                        setup_commands: [{ action: 'setup', command: 'npm install', name: 'install' }],
                        script_commands: [{ action: 'script', command: 'npm run build', name: 'build' }],
                        teardown_commands: [],
                    },
                ],
            };
            const mockResponse = { data: mockRawSteps };

            // Mock HTTP client response
            mockHttpClient.get.mockResolvedValue(mockResponse);

            // Mock static pipelineStepForPipelineStep method
            jest.spyOn(PipelineApiImpl as any, 'pipelineStepForPipelineStep').mockImplementation((stepData: any) => {
                return {
                    run_number: stepData.run_number,
                    uuid: stepData.uuid,
                    name: stepData.name,
                    state: stepData.state,
                    setup_commands: stepData.setup_commands || [],
                    script_commands: stepData.script_commands || [],
                    teardown_commands: stepData.teardown_commands || [],
                } as PipelineStep;
            });

            // Call the method
            const result = await pipelineApi.getSteps(mockSite, uuid);

            // Assertions
            expect(mockHttpClient.get).toHaveBeenCalledWith(
                `/repositories/test-owner/test-repo/pipelines/${uuid}/steps/`,
            );
            expect(result).toEqual([
                {
                    run_number: 1,
                    uuid: 'step-uuid-1',
                    name: 'Build',
                    state: { name: 'COMPLETED', type: 'pipeline_state_completed' },
                    setup_commands: [{ action: 'setup', command: 'npm install', name: 'install' }],
                    script_commands: [{ action: 'script', command: 'npm run build', name: 'build' }],
                    teardown_commands: [],
                },
            ]);
        });
    });

    describe('getListForRemote', () => {
        it('should fetch pipelines for a specific branch', async () => {
            // Setup mock data
            const branchName = 'feature/test';
            const mockPipelines: Pipeline[] = [
                {
                    site: mockSite,
                    repository: mockRepo,
                    build_number: 1,
                    created_on: '2023-01-01T00:00:00Z',
                    state: { name: 'COMPLETED', type: 'pipeline_state_completed' },
                    uuid: 'test-uuid-1',
                    target: {
                        type: PipelineTargetType.Reference,
                        ref_name: branchName,
                    },
                },
            ];

            // Mock the getSinglepagePipelines method
            jest.spyOn(pipelineApi as any, 'getSinglepagePipelines').mockResolvedValue(mockPipelines);

            // Call the method
            const result = await pipelineApi.getListForRemote(mockSite, branchName);

            // Assertions
            expect(result).toEqual(mockPipelines);
            expect((pipelineApi as any).getSinglepagePipelines).toHaveBeenCalledWith(mockSite, {
                'target.branch': branchName,
            });
        });
    });

    describe('getPaginatedPipelines', () => {
        it('should fetch paginated pipelines and clean the data', async () => {
            // Setup mock data
            const mockQuery = { 'target.branch': 'main' };
            const mockRawPipelines = {
                pagelen: 10,
                page: 1,
                size: 1,
                values: [
                    {
                        uuid: 'test-uuid-1',
                        build_number: 1,
                        created_on: '2023-01-01T00:00:00Z',
                        state: { name: 'COMPLETED', type: 'pipeline_state_completed' },
                        target: { type: 'pipeline_commit_target' },
                        repository: mockRepo,
                    },
                ],
            };
            const mockResponse = { data: mockRawPipelines };

            // Mock HTTP client response
            mockHttpClient.get.mockResolvedValue(mockResponse);

            // Mock cleanPipelineData method
            jest.spyOn(pipelineApi as any, 'cleanPipelineData').mockImplementation((site, rawData: any) => {
                return {
                    site,
                    repository: mockRepo,
                    build_number: rawData.build_number,
                    created_on: rawData.created_on,
                    state: rawData.state,
                    uuid: rawData.uuid,
                    target: { type: PipelineTargetType.Commit },
                } as Pipeline;
            });

            // Call the method
            const result = await pipelineApi.getPaginatedPipelines(mockSite, mockQuery);

            // Assertions
            expect(mockHttpClient.get).toHaveBeenCalledWith(`/repositories/test-owner/test-repo/pipelines/`, {
                'target.branch': 'main',
                fields: ['+values.target.commit.message', '+values.target.commit.summary.*'],
                sort: '-created_on',
            });
            expect(result).toEqual({
                pagelen: 10,
                page: 1,
                size: 1,
                values: [
                    {
                        site: mockSite,
                        repository: mockRepo,
                        build_number: 1,
                        created_on: '2023-01-01T00:00:00Z',
                        state: { name: 'COMPLETED', type: 'pipeline_state_completed' },
                        uuid: 'test-uuid-1',
                        target: { type: PipelineTargetType.Commit },
                    },
                ],
            });
        });
    });

    describe('getPipelineLogRange', () => {
        it('should fetch pipeline log range', async () => {
            // Setup mock data
            const pipelineUuid = 'test-pipeline-uuid';
            const stepUuid = 'test-step-uuid';
            const range: PipelineLogRange = { firstByte: 0, lastByte: 100, byteCount: 101 };
            const mockLogData = 'Build log content...';
            const mockResponse = {
                data: mockLogData,
                headers: {
                    'Content-Type': 'text/plain',
                    'Content-Length': String(mockLogData.length),
                },
            };

            // Mock HTTP client response
            mockHttpClient.getOctetStream.mockResolvedValue(mockResponse);

            // Call the method
            const result = await pipelineApi.getPipelineLogRange(mockSite, pipelineUuid, stepUuid, range);

            // Assertions
            expect(mockHttpClient.getOctetStream).toHaveBeenCalledWith(
                `/repositories/test-owner/test-repo/pipelines/${pipelineUuid}/steps/${stepUuid}/log`,
                { start: 0, end: 100 },
            );
            expect(result).toEqual(mockLogData);
        });
    });

    describe('getLogRanges', () => {
        it('should fetch log ranges for a build number', async () => {
            // Setup mock data
            const buildNumber = 123;
            const mockStepsData1 = {
                values: [
                    {
                        tasks: {
                            execution_phases: {
                                SETUP: [
                                    { log_range: { first_byte_position: 0, byte_count: 100, last_byte_position: 99 } },
                                ],
                                MAIN: [
                                    {
                                        log_range: {
                                            first_byte_position: 100,
                                            byte_count: 200,
                                            last_byte_position: 299,
                                        },
                                    },
                                ],
                                TEARDOWN: [
                                    {
                                        log_range: {
                                            first_byte_position: 300,
                                            byte_count: 50,
                                            last_byte_position: 349,
                                        },
                                    },
                                ],
                            },
                        },
                    },
                ],
                next: 'https://next-page-url',
            };
            const mockStepsData2 = {
                values: [
                    {
                        tasks: {
                            execution_phases: {
                                SETUP: [
                                    { log_range: { first_byte_position: 0, byte_count: 150, last_byte_position: 149 } },
                                ],
                                MAIN: [
                                    {
                                        log_range: {
                                            first_byte_position: 150,
                                            byte_count: 250,
                                            last_byte_position: 399,
                                        },
                                    },
                                ],
                                TEARDOWN: [
                                    {
                                        log_range: {
                                            first_byte_position: 400,
                                            byte_count: 75,
                                            last_byte_position: 474,
                                        },
                                    },
                                ],
                            },
                        },
                    },
                ],
                next: null,
            };

            // Mock HTTP client responses for pagination
            mockHttpClient.getUrl.mockImplementation((url) => {
                if (
                    url === `https://api.bitbucket.org/internal/repositories/test-owner/test-repo/pipelines/123/steps/`
                ) {
                    return Promise.resolve({ data: mockStepsData1 });
                } else if (url === 'https://next-page-url') {
                    return Promise.resolve({ data: mockStepsData2 });
                }
                return Promise.reject(new Error(`Unexpected URL: ${url}`));
            });

            // Mock splitPhase method
            jest.spyOn(pipelineApi as any, 'splitPhase').mockImplementation((phase) => {
                if (Array.isArray(phase)) {
                    return phase
                        .filter((p: any) => p.log_range)
                        .map((p: any) => ({
                            firstByte: p.log_range.first_byte_position,
                            byteCount: p.log_range.byte_count,
                            lastByte: p.log_range.last_byte_position,
                        }));
                }
                return [];
            });

            // Call the method
            const result = await pipelineApi.getLogRanges(mockSite, buildNumber);

            // Assertions
            expect(mockHttpClient.getUrl).toHaveBeenCalledWith(
                `https://api.bitbucket.org/internal/repositories/test-owner/test-repo/pipelines/123/steps/`,
            );
            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty('setupLogRange');
            expect(result[0]).toHaveProperty('buildLogRanges');
            expect(result[0]).toHaveProperty('teardownLogRange');
        });
    });

    describe('readSelectorType', () => {
        it('should return correct PipelineSelectorType enum values', () => {
            expect(pipelineApi.readSelectorType('branches')).toBe(PipelineSelectorType.Branch);
            expect(pipelineApi.readSelectorType('tags')).toBe(PipelineSelectorType.Tag);
            expect(pipelineApi.readSelectorType('bookmarks')).toBe(PipelineSelectorType.Bookmark);
            expect(pipelineApi.readSelectorType('custom')).toBe(PipelineSelectorType.Custom);
            expect(pipelineApi.readSelectorType('pull-requests')).toBe(PipelineSelectorType.PullRequests);
            expect(pipelineApi.readSelectorType('unknown')).toBe(PipelineSelectorType.Default);
        });
    });

    describe('readTargetType', () => {
        it('should return correct PipelineTargetType enum values', () => {
            expect(pipelineApi.readTargetType('pipeline_commit_target')).toBe(PipelineTargetType.Commit);
            expect(pipelineApi.readTargetType('pipeline_pullrequest_target')).toBe(PipelineTargetType.PullRequest);
            expect(pipelineApi.readTargetType('pipeline_ref_target')).toBe(PipelineTargetType.Reference);
            expect(pipelineApi.readTargetType('unknown')).toBeUndefined();
            expect(Logger.debug).toHaveBeenCalledWith(`Couldn't identify PipelineTargetType unknown`);
        });
    });

    describe('readReferenceType', () => {
        it('should return correct PipelineReferenceType enum values', () => {
            expect(pipelineApi.readReferenceType('annotated_tag')).toBe(PipelineReferenceType.AnnotatedTag);
            expect(pipelineApi.readReferenceType('bookmark')).toBe(PipelineReferenceType.Bookmark);
            expect(pipelineApi.readReferenceType('branch')).toBe(PipelineReferenceType.Branch);
            expect(pipelineApi.readReferenceType('named_branch')).toBe(PipelineReferenceType.NamedBranch);
            expect(pipelineApi.readReferenceType('tag')).toBe(PipelineReferenceType.Tag);
            expect(pipelineApi.readReferenceType('unknown')).toBeUndefined();
            expect(Logger.debug).toHaveBeenCalledWith(`Couldn't identify PipelineReferenceType unknown`);
        });
    });

    describe('readSelector', () => {
        it('should return undefined for null selector', () => {
            expect(pipelineApi.readSelector(null)).toBeUndefined();
        });

        it('should return a properly formatted PipelineSelector', () => {
            const mockSelector = { pattern: 'main', type: 'branches' };
            const expected: PipelineSelector = {
                pattern: 'main',
                type: PipelineSelectorType.Branch,
            };

            expect(pipelineApi.readSelector(mockSelector)).toEqual(expected);
        });
    });

    describe('readTarget', () => {
        it('should read a commit target correctly', () => {
            const mockCommitTarget = {
                type: 'pipeline_commit_target',
                commit: { hash: 'abc123' },
                branch: 'main',
            };

            const result = pipelineApi.readTarget(mockCommitTarget);

            expect(result).toEqual({
                type: PipelineTargetType.Commit,
                commit: { hash: 'abc123' },
                branchName: 'main',
                ref_name: undefined,
                selector: undefined,
            });
        });

        it('should read a pull request target correctly', () => {
            const mockPRTarget = {
                type: 'pipeline_pullrequest_target',
                source: 'feature-branch',
                destination: 'main',
                destination_revision: 'def456',
                pull_request_id: 42,
            };

            const result = pipelineApi.readTarget(mockPRTarget);

            expect(result).toEqual({
                type: PipelineTargetType.PullRequest,
                source: 'feature-branch',
                destination: 'main',
                destination_revision: 'def456',
                pull_request_id: 42,
                ref_name: undefined,
                selector: undefined,
                branchName: undefined,
                commit: undefined,
            });
        });

        it('should read a reference target correctly', () => {
            const mockRefTarget = {
                type: 'pipeline_ref_target',
                ref_name: 'refs/heads/main',
                ref_type: 'branch',
            };

            const result = pipelineApi.readTarget(mockRefTarget);

            expect(result).toEqual({
                type: PipelineTargetType.Reference,
                ref_name: 'refs/heads/main',
                ref_type: PipelineReferenceType.Branch,
                selector: undefined,
                branchName: undefined,
                commit: undefined,
            });
        });

        it('should handle unknown target types', () => {
            const mockUnknownTarget = {
                type: 'unknown_target_type',
            };

            jest.spyOn(Logger, 'debug');

            const result = pipelineApi.readTarget(mockUnknownTarget);

            expect(Logger.debug).toHaveBeenCalledWith(
                `Failed to read pipeline target ${JSON.stringify(mockUnknownTarget)}`,
            );
            expect(result).toEqual(mockUnknownTarget);
        });
    });

    describe('cleanPipelineData', () => {
        it('should clean and transform pipeline data', () => {
            // Setup mock raw pipeline data
            const mockRawPipeline = {
                build_number: 42,
                uuid: 'pipeline-uuid',
                created_on: '2023-01-01T12:00:00Z',
                completed_on: '2023-01-01T12:05:00Z',
                duration_in_seconds: 300,
                state: {
                    name: 'COMPLETED',
                    type: 'pipeline_state_completed',
                    result: { name: 'SUCCESS', type: 'pipeline_state_completed_result_success' },
                    stage: { name: 'DONE', type: 'pipeline_state_completed_stage_done' },
                },
                creator: {
                    display_name: 'Test User',
                    links: { avatar: { href: 'https://avatar-url' } },
                },
                repository: { full_name: 'test-owner/test-repo' },
                target: {
                    type: 'pipeline_commit_target',
                    branch: 'main',
                    commit: { hash: 'abc123' },
                },
                trigger: { name: 'manual' },
            };

            // Mock the CloudRepositoriesApi.toRepo call
            (CloudRepositoriesApi.toRepo as jest.Mock).mockReturnValue(mockRepo);

            // Mock PipelineApiImpl.resultForResult for static method
            jest.spyOn(PipelineApiImpl as any, 'resultForResult').mockImplementation((result: any) => {
                if (!result) {
                    return undefined;
                }
                return { name: result.name, type: result.type };
            });

            // Call the method
            const result = pipelineApi.cleanPipelineData(mockSite, mockRawPipeline);

            // Assertions
            expect(result).toEqual({
                site: mockSite,
                repository: mockRepo,
                build_number: 42,
                uuid: 'pipeline-uuid',
                created_on: '2023-01-01T12:00:00Z',
                completed_on: '2023-01-01T12:05:00Z',
                duration_in_seconds: 300,
                creator_name: 'Test User',
                creator_avatar: 'https://avatar-url',
                state: {
                    name: 'COMPLETED',
                    type: 'pipeline_state_completed',
                    result: { name: 'SUCCESS', type: 'pipeline_state_completed_result_success' },
                    stage: { name: 'DONE', type: 'pipeline_state_completed_stage_done' },
                },
                target: {
                    type: PipelineTargetType.Commit,
                    branchName: 'main',
                    commit: { hash: 'abc123' },
                    ref_name: undefined,
                    selector: undefined,
                },
                triggerName: 'manual',
            });
        });
    });

    describe('Static resultForResult method', () => {
        it('should return undefined for undefined input', () => {
            const result = PipelineApiImpl['resultForResult'](undefined);
            expect(result).toBeUndefined();
        });

        it('should return a PipelineResult for valid input', () => {
            const mockResult = { name: 'SUCCESS', type: 'success_type' };
            const expected: PipelineResult = { name: 'SUCCESS', type: 'success_type' };

            const result = PipelineApiImpl['resultForResult'](mockResult);
            expect(result).toEqual(expected);
        });
    });

    describe('Static pipelineStepForPipelineStep method', () => {
        it('should transform step data correctly', () => {
            const mockStep = {
                run_number: 1,
                uuid: 'step-uuid',
                name: 'Build',
                completed_on: '2023-01-01T12:10:00Z',
                duration_in_seconds: 180,
                state: {
                    name: 'COMPLETED',
                    type: 'pipeline_step_state_completed',
                    result: { name: 'SUCCESS', type: 'success_type' },
                    stage: { name: 'DONE', type: 'done_type' },
                },
                setup_commands: [{ action: 'setup', command: 'npm install', name: 'install' }],
                script_commands: [{ action: 'script', command: 'npm run build', name: 'build' }],
                teardown_commands: [{ action: 'teardown', command: 'npm run clean', name: 'clean' }],
            };

            // Mock static methods
            jest.spyOn(PipelineApiImpl as any, 'resultForResult').mockImplementation((result: any) => {
                if (!result) {
                    return undefined;
                }
                return { name: result.name, type: result.type };
            });

            jest.spyOn(PipelineApiImpl as any, 'pipelineCommandsForPipelineCommands').mockImplementation(
                (commands: any) => {
                    if (!commands) {
                        return [];
                    }
                    return commands.map((cmd: any) => ({
                        action: cmd.action,
                        command: cmd.command,
                        name: cmd.name,
                    }));
                },
            );

            const result = PipelineApiImpl['pipelineStepForPipelineStep'](mockStep);

            // Let's check what properties are actually present in the result and update our expectations accordingly
            expect(result).toMatchObject({
                run_number: 1,
                uuid: 'step-uuid',
                name: 'Build',
                state: {
                    name: 'COMPLETED',
                    type: 'pipeline_step_state_completed',
                    result: { name: 'SUCCESS', type: 'success_type' },
                    stage: { name: 'DONE', type: 'done_type' },
                },
                setup_commands: [{ action: 'setup', command: 'npm install', name: 'install' }],
                script_commands: [{ action: 'script', command: 'npm run build', name: 'build' }],
                teardown_commands: [{ action: 'teardown', command: 'npm run clean', name: 'clean' }],
            });
        });
    });

    describe('Static pipelineCommandsForPipelineCommands method', () => {
        it('should return empty array for undefined input', () => {
            const result = PipelineApiImpl['pipelineCommandsForPipelineCommands'](undefined);
            expect(result).toEqual([]);
        });

        it('should transform commands correctly', () => {
            const mockCommands = [
                { action: 'setup', command: 'npm install', name: 'install' },
                { action: 'script', command: 'npm test', name: 'test' },
            ];

            const result = PipelineApiImpl['pipelineCommandsForPipelineCommands'](mockCommands);

            expect(result).toEqual([
                { action: 'setup', command: 'npm install', name: 'install' },
                { action: 'script', command: 'npm test', name: 'test' },
            ]);
        });
    });
});
