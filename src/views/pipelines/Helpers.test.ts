import { Uri } from 'vscode';

import { Pipeline, PipelineSelectorType, PipelineTarget, Status } from '../../pipelines/model';
import {
    descriptionForState,
    filtersActive,
    generatePipelineTitle,
    iconUriForPipeline,
    shouldDisplay,
} from './Helpers';

// Mock Container
jest.mock('../../container', () => ({
    Container: {
        config: {
            bitbucket: {
                pipelines: {
                    hideFiltered: false,
                    branchFilters: [],
                },
            },
        },
    },
}));

// Mock Resources
jest.mock('../../resources', () => ({
    Resources: {
        icons: {
            get: jest.fn(),
        },
    },
}));

// Mock statusForState function
jest.mock('../../pipelines/model', () => ({
    ...jest.requireActual('../../pipelines/model'),
    statusForState: jest.fn(),
}));

import { Container } from '../../container';
import { statusForState } from '../../pipelines/model';
import { Resources } from '../../resources';

const mockStatusForState = statusForState as jest.MockedFunction<typeof statusForState>;
const mockResourcesIconsGet = Resources.icons.get as jest.MockedFunction<typeof Resources.icons.get>;

describe('Helpers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset Container config to default state
        Container.config.bitbucket.pipelines.hideFiltered = false;
        Container.config.bitbucket.pipelines.branchFilters = [];
    });

    describe('shouldDisplay', () => {
        it('should return true when hideFiltered is false', () => {
            Container.config.bitbucket.pipelines.hideFiltered = false;
            const target: PipelineTarget = {
                type: 'pipeline_ref_target' as any,
                ref_name: 'main',
            };

            const result = shouldDisplay(target);

            expect(result).toBe(true);
        });

        it('should return false when hideFiltered is true and no branch name is available', () => {
            Container.config.bitbucket.pipelines.hideFiltered = true;
            const target: PipelineTarget = {
                type: 'pipeline_ref_target' as any,
            };

            const result = shouldDisplay(target);

            expect(result).toBe(false);
        });

        it('should return false when target is undefined and hideFiltered is true', () => {
            Container.config.bitbucket.pipelines.hideFiltered = true;

            const result = shouldDisplay(undefined);

            expect(result).toBe(false);
        });

        it('should filter by ref_name when available', () => {
            Container.config.bitbucket.pipelines.hideFiltered = true;
            Container.config.bitbucket.pipelines.branchFilters = ['main', 'develop'];
            const target: PipelineTarget = {
                type: 'pipeline_ref_target' as any,
                ref_name: 'main',
            };

            const result = shouldDisplay(target);

            expect(result).toBe(true);
        });

        it('should filter by source and destination when ref_name is not available', () => {
            Container.config.bitbucket.pipelines.hideFiltered = true;
            Container.config.bitbucket.pipelines.branchFilters = ['feature'];
            const target: PipelineTarget = {
                type: 'pipeline_pullrequest_target' as any,
                source: 'feature-branch',
                destination: 'main',
            };

            const result = shouldDisplay(target);

            expect(result).toBe(true);
        });

        it('should return false when branch name does not match filters', () => {
            Container.config.bitbucket.pipelines.hideFiltered = true;
            Container.config.bitbucket.pipelines.branchFilters = ['main', 'develop'];
            const target: PipelineTarget = {
                type: 'pipeline_ref_target' as any,
                ref_name: 'feature-test',
            };

            const result = shouldDisplay(target);

            expect(result).toBe(false);
        });

        it('should ignore empty filters', () => {
            Container.config.bitbucket.pipelines.hideFiltered = true;
            Container.config.bitbucket.pipelines.branchFilters = ['main', '', 'develop', ''];
            const target: PipelineTarget = {
                type: 'pipeline_ref_target' as any,
                ref_name: 'main',
            };

            const result = shouldDisplay(target);

            expect(result).toBe(true);
        });

        it('should escape special regex characters in filters', () => {
            Container.config.bitbucket.pipelines.hideFiltered = true;
            Container.config.bitbucket.pipelines.branchFilters = ['feature/*'];
            const target: PipelineTarget = {
                type: 'pipeline_ref_target' as any,
                ref_name: 'feature/*',
            };

            const result = shouldDisplay(target);

            expect(result).toBe(true);
        });
    });

    describe('filtersActive', () => {
        it('should return true when hideFiltered is true', () => {
            Container.config.bitbucket.pipelines.hideFiltered = true;

            const result = filtersActive();

            expect(result).toBe(true);
        });

        it('should return false when hideFiltered is false', () => {
            Container.config.bitbucket.pipelines.hideFiltered = false;

            const result = filtersActive();

            expect(result).toBe(false);
        });
    });

    describe('descriptionForState', () => {
        const mockPipeline: Pipeline = {
            site: {} as any,
            repository: { name: 'test-repo' } as any,
            build_number: 123,
            created_on: '2023-01-01T00:00:00Z',
            uuid: 'test-uuid',
            target: {
                type: 'pipeline_ref_target' as any,
                ref_name: 'main',
            },
            state: {
                name: 'COMPLETED',
                type: 'pipeline_state_completed',
                result: {
                    name: 'SUCCESSFUL',
                    type: 'pipeline_state_completed_successful',
                },
            },
        };

        it('should return correct description for successful pipeline', () => {
            const pipeline = {
                ...mockPipeline,
                state: {
                    name: 'COMPLETED',
                    type: 'pipeline_state_completed',
                    result: {
                        name: 'SUCCESSFUL',
                        type: 'pipeline_state_completed_successful',
                    },
                },
            };

            const result = descriptionForState(pipeline, false);

            expect(result).toContain('was successful');
            expect(result).toContain('test-repo: Pipeline #123');
        });

        it('should return correct description for failed pipeline', () => {
            const pipeline = {
                ...mockPipeline,
                state: {
                    name: 'COMPLETED',
                    type: 'pipeline_state_completed',
                    result: {
                        name: 'FAILED',
                        type: 'pipeline_state_completed_failed',
                    },
                },
            };

            const result = descriptionForState(pipeline, false);

            expect(result).toContain('has failed');
        });

        it('should return correct description for error pipeline', () => {
            const pipeline = {
                ...mockPipeline,
                state: {
                    name: 'COMPLETED',
                    type: 'pipeline_state_completed',
                    result: {
                        name: 'ERROR',
                        type: 'pipeline_state_completed_error',
                    },
                },
            };

            const result = descriptionForState(pipeline, false);

            expect(result).toContain('has failed');
        });

        it('should return correct description for stopped pipeline', () => {
            const pipeline = {
                ...mockPipeline,
                state: {
                    name: 'COMPLETED',
                    type: 'pipeline_state_completed',
                    result: {
                        name: 'STOPPED',
                        type: 'pipeline_state_completed_stopped',
                    },
                },
            };

            const result = descriptionForState(pipeline, false);

            expect(result).toContain('has been stopped');
        });

        it('should return correct description for in progress pipeline', () => {
            const pipeline = {
                ...mockPipeline,
                state: {
                    name: 'IN_PROGRESS',
                    type: 'pipeline_state_in_progress',
                },
            };

            const result = descriptionForState(pipeline, false);

            expect(result).toContain('is building');
        });

        it('should return correct description for pending pipeline', () => {
            const pipeline = {
                ...mockPipeline,
                state: {
                    name: 'PENDING',
                    type: 'pipeline_state_pending',
                },
            };

            const result = descriptionForState(pipeline, false);

            expect(result).toContain('is pending');
        });

        it('should return fallback description for unknown state', () => {
            const pipeline = {
                ...mockPipeline,
                state: {
                    name: 'UNKNOWN',
                    type: 'unknown_state',
                },
            };

            const result = descriptionForState(pipeline, false);

            expect(result).toContain('has done something');
        });

        it('should exclude pipeline prefix when requested', () => {
            const result = descriptionForState(mockPipeline, false, true);

            expect(result).not.toContain('test-repo: Pipeline');
            expect(result).toContain('#123');
        });
    });

    describe('generatePipelineTitle', () => {
        const mockPipeline: Pipeline = {
            site: {} as any,
            repository: { name: 'test-repo' } as any,
            build_number: 123,
            created_on: '2023-01-01T00:00:00Z',
            uuid: 'test-uuid',
            target: {
                type: 'pipeline_ref_target' as any,
                ref_name: 'main',
            },
            state: {} as any,
        };

        it('should generate title with commit message when available', () => {
            const pipeline = {
                ...mockPipeline,
                target: {
                    ...mockPipeline.target,
                    commit: {
                        type: 'commit',
                        message: 'Fix bug in pipeline\n\nDetailed description here',
                        hash: 'abc123',
                        links: {},
                        summary: {} as any,
                    },
                },
            };

            const result = generatePipelineTitle(pipeline, true);

            expect(result).toBe('test-repo: Pipeline #123 Fix bug in pipeline on branch main');
        });

        it('should generate title with full commit message when not truncating', () => {
            const pipeline = {
                ...mockPipeline,
                target: {
                    ...mockPipeline.target,
                    commit: {
                        type: 'commit',
                        message: 'Fix bug in pipeline\n\nDetailed description here',
                        hash: 'abc123',
                        links: {},
                        summary: {} as any,
                    },
                },
            };

            const result = generatePipelineTitle(pipeline, false);

            expect(result).toBe(
                'test-repo: Pipeline #123 Fix bug in pipeline\n\nDetailed description here on branch main',
            );
        });

        it('should generate title for custom pipeline with pattern', () => {
            const pipeline = {
                ...mockPipeline,
                target: {
                    ...mockPipeline.target,
                    selector: {
                        type: PipelineSelectorType.Custom,
                        pattern: 'custom-build',
                    },
                },
            };

            const result = generatePipelineTitle(pipeline, false);

            expect(result).toBe('test-repo: Pipeline #123 custom-build(custom) on branch main');
        });

        it('should generate title for custom pipeline without branch', () => {
            const pipeline = {
                ...mockPipeline,
                target: {
                    ...mockPipeline.target,
                    ref_name: undefined,
                    selector: {
                        type: PipelineSelectorType.Custom,
                        pattern: 'custom-build',
                    },
                },
            };

            const result = generatePipelineTitle(pipeline, false);

            expect(result).toBe('test-repo: Pipeline #123 custom-build(custom)');
        });

        it('should generate title for manual trigger with pattern and branch', () => {
            const pipeline = {
                ...mockPipeline,
                triggerName: 'MANUAL',
                target: {
                    ...mockPipeline.target,
                    selector: {
                        type: PipelineSelectorType.Branch,
                        pattern: 'feature-*',
                    },
                },
            };

            const result = generatePipelineTitle(pipeline, false);

            expect(result).toBe('test-repo: Pipeline #123(manual) feature-* on branch main');
        });

        it('should generate title for manual trigger with branch only', () => {
            const pipeline = {
                ...mockPipeline,
                triggerName: 'MANUAL',
            };

            const result = generatePipelineTitle(pipeline, false);

            expect(result).toBe('test-repo: Pipeline #123(manual) on branch main');
        });

        it('should generate title for manual trigger without branch', () => {
            const pipeline = {
                ...mockPipeline,
                triggerName: 'MANUAL',
                target: {
                    ...mockPipeline.target,
                    ref_name: undefined,
                },
            };

            const result = generatePipelineTitle(pipeline, false);

            expect(result).toBe('test-repo: Pipeline #123(manual)');
        });

        it('should generate title with branch when no special conditions', () => {
            const result = generatePipelineTitle(mockPipeline, false);

            expect(result).toBe('test-repo: Pipeline #123 on branch main');
        });

        it('should generate fallback title with only build number', () => {
            const pipeline = {
                ...mockPipeline,
                target: {
                    ...mockPipeline.target,
                    ref_name: undefined,
                },
            };

            const result = generatePipelineTitle(pipeline, false);

            expect(result).toBe('test-repo: Pipeline #123');
        });

        it('should exclude pipeline prefix when requested', () => {
            const result = generatePipelineTitle(mockPipeline, false, true);

            expect(result).toBe('#123 on branch main');
            expect(result).not.toContain('test-repo: Pipeline');
        });

        it('should use source branch when ref_name is not available', () => {
            const pipeline = {
                ...mockPipeline,
                target: {
                    ...mockPipeline.target,
                    ref_name: undefined,
                    source: 'feature-branch',
                },
            };

            const result = generatePipelineTitle(pipeline, false);

            expect(result).toBe('test-repo: Pipeline #123 on branch feature-branch');
        });

        it('should trim commit message whitespace', () => {
            const pipeline = {
                ...mockPipeline,
                target: {
                    ...mockPipeline.target,
                    commit: {
                        type: 'commit',
                        message: 'Fix bug in pipeline   \n\n   ',
                        hash: 'abc123',
                        links: {},
                        summary: {} as any,
                    },
                },
            };

            const result = generatePipelineTitle(pipeline, true);

            expect(result).toBe('test-repo: Pipeline #123 Fix bug in pipeline on branch main');
        });
    });

    describe('iconUriForPipeline', () => {
        const mockPipeline: Pipeline = {
            site: {} as any,
            repository: { name: 'test-repo' } as any,
            build_number: 123,
            created_on: '2023-01-01T00:00:00Z',
            uuid: 'test-uuid',
            target: {} as any,
            state: {} as any,
        };

        const mockUri = { toString: () => 'mock-uri' } as Uri;

        beforeEach(() => {
            mockResourcesIconsGet.mockReturnValue(mockUri);
        });

        it('should return pending icon for pending status', () => {
            mockStatusForState.mockReturnValue(Status.Pending);

            const result = iconUriForPipeline(mockPipeline);

            expect(mockStatusForState).toHaveBeenCalledWith(mockPipeline.state);
            expect(mockResourcesIconsGet).toHaveBeenCalledWith('pending');
            expect(result).toBe(mockUri);
        });

        it('should return building icon for in progress status', () => {
            mockStatusForState.mockReturnValue(Status.InProgress);

            const result = iconUriForPipeline(mockPipeline);

            expect(mockResourcesIconsGet).toHaveBeenCalledWith('building');
            expect(result).toBe(mockUri);
        });

        it('should return paused icon for paused status', () => {
            mockStatusForState.mockReturnValue(Status.Paused);

            const result = iconUriForPipeline(mockPipeline);

            expect(mockResourcesIconsGet).toHaveBeenCalledWith('paused');
            expect(result).toBe(mockUri);
        });

        it('should return stopped icon for stopped status', () => {
            mockStatusForState.mockReturnValue(Status.Stopped);

            const result = iconUriForPipeline(mockPipeline);

            expect(mockResourcesIconsGet).toHaveBeenCalledWith('stopped');
            expect(result).toBe(mockUri);
        });

        it('should return success icon for successful status', () => {
            mockStatusForState.mockReturnValue(Status.Successful);

            const result = iconUriForPipeline(mockPipeline);

            expect(mockResourcesIconsGet).toHaveBeenCalledWith('success');
            expect(result).toBe(mockUri);
        });

        it('should return failed icon for error status', () => {
            mockStatusForState.mockReturnValue(Status.Error);

            const result = iconUriForPipeline(mockPipeline);

            expect(mockResourcesIconsGet).toHaveBeenCalledWith('failed');
            expect(result).toBe(mockUri);
        });

        it('should return failed icon for failed status', () => {
            mockStatusForState.mockReturnValue(Status.Failed);

            const result = iconUriForPipeline(mockPipeline);

            expect(mockResourcesIconsGet).toHaveBeenCalledWith('failed');
            expect(result).toBe(mockUri);
        });

        it('should return undefined for unknown status', () => {
            mockStatusForState.mockReturnValue(Status.Unknown);

            const result = iconUriForPipeline(mockPipeline);

            expect(result).toBeUndefined();
        });

        it('should return undefined for not run status', () => {
            mockStatusForState.mockReturnValue(Status.NotRun);

            const result = iconUriForPipeline(mockPipeline);

            expect(result).toBeUndefined();
        });
    });
});
