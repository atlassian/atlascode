import { commands, window } from 'vscode';

import { clientForSite } from '../../bitbucket/bbUtils';
import { BitbucketSite, WorkspaceRepo } from '../../bitbucket/model';
import { configuration } from '../../config/configuration';
import { Commands } from '../../constants';
import { Container } from '../../container';
import { Pipeline, PipelineTarget } from '../../pipelines/model';
import { shouldDisplay } from '../pipelines/Helpers';
import { PipelinesMonitor } from './PipelinesMonitor';

// Mock the vscode APIs we're using
jest.mock('../../bitbucket/bbUtils');
jest.mock('../../container');
jest.mock('../pipelines/Helpers');
jest.mock('../../config/configuration');
jest.mock('../../container', () => ({
    Container: {
        analyticsClient: {
            sendUIEvent: jest.fn(),
            sendTrackEvent: jest.fn(),
        },
    },
}));

describe('PipelinesMonitor', () => {
    // Set up common test objects
    let monitor: PipelinesMonitor;
    let mockRepo: WorkspaceRepo;
    let mockSite: BitbucketSite;
    let mockPipelineApi: { getRecentActivity: jest.Mock };
    let mockBbApi: { pipelines: { getRecentActivity: jest.Mock } };

    beforeEach(() => {
        jest.clearAllMocks();

        // Set up mock site and repo
        mockSite = {
            details: { isCloud: true },
            ownerSlug: 'owner',
            repoSlug: 'repo',
        } as BitbucketSite;

        mockRepo = {
            rootUri: 'repo-uri',
            mainSiteRemote: {
                site: mockSite,
            },
        } as WorkspaceRepo;

        // Set up mock pipeline API and response
        mockPipelineApi = { getRecentActivity: jest.fn() };
        mockBbApi = { pipelines: mockPipelineApi };
        (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

        // Set up the container configuration mock
        (Container.config as any) = {
            bitbucket: {
                pipelines: {
                    monitorEnabled: true,
                },
            },
        };

        // Create the monitor with our mock repo
        monitor = new PipelinesMonitor([mockRepo]);
    });

    describe('checkForNewActivity', () => {
        it('should return early if pipelines monitoring is disabled', async () => {
            // Set monitoring to disabled
            (Container.config as any).bitbucket.pipelines.monitorEnabled = false;

            await monitor.checkForNewActivity();

            // Should not have tried to get the client
            expect(clientForSite).not.toHaveBeenCalled();
        });

        it('should return early if site is undefined', async () => {
            const repoWithNoSite = {
                rootUri: 'repo-uri',
                mainSiteRemote: {
                    site: undefined,
                },
            } as WorkspaceRepo;

            monitor = new PipelinesMonitor([repoWithNoSite]);
            await monitor.checkForNewActivity();

            // Should have tried to check the site but not gone further
            expect(clientForSite).not.toHaveBeenCalled();
        });

        it('should return early if pipelines is not available for the site', async () => {
            // Mock a Bitbucket server API response (no pipelines)
            (clientForSite as jest.Mock).mockResolvedValue({ pipelines: undefined });

            await monitor.checkForNewActivity();

            // Should have gotten the client but not tried to get pipeline activity
            expect(clientForSite).toHaveBeenCalled();
            expect(mockBbApi.pipelines?.getRecentActivity).not.toHaveBeenCalled();
        });

        it('should handle the case with no previous results', async () => {
            // Mock the pipeline API response with some results
            const mockPipelines: Pipeline[] = [createMockPipeline(1)];
            mockPipelineApi.getRecentActivity.mockResolvedValue(mockPipelines);

            // Set up shouldDisplay to return true
            (shouldDisplay as jest.Mock).mockReturnValue(true);

            await monitor.checkForNewActivity();

            // Should have called the API but not shown notifications (as there are no previous results)
            expect(mockPipelineApi.getRecentActivity).toHaveBeenCalledWith(mockSite);
            expect(window.showInformationMessage).not.toHaveBeenCalled();
        });

        it('should show notification when there are new pipelines', async () => {
            // Set up two pipeline sets: "previous" and "new"
            const previousPipelines: Pipeline[] = [createMockPipeline(1)];
            const newPipelines: Pipeline[] = [
                createMockPipeline(1), // Same build number but different state
                createMockPipeline(2), // New pipeline
            ];

            // Make the first one have a different state
            newPipelines[0].state.name = 'COMPLETED';

            // Set up the mock to return the new pipelines
            mockPipelineApi.getRecentActivity.mockResolvedValue(newPipelines);

            // Set up shouldDisplay to return true
            (shouldDisplay as jest.Mock).mockReturnValue(true);

            // First set up previous results directly in the monitor
            (monitor as any)._previousResults['repo-uri'] = previousPipelines;

            // Mock the window.showInformationMessage response
            (window.showInformationMessage as jest.Mock).mockResolvedValue('View');

            await monitor.checkForNewActivity();

            // Should have shown a notification
            expect(window.showInformationMessage).toHaveBeenCalled();
            expect(commands.executeCommand).toHaveBeenCalledWith(Commands.ShowPipeline, expect.any(Object));
        });

        it('should handle multiple pipeline changes', async () => {
            // Set up test data with multiple changes
            const previousPipelines: Pipeline[] = [
                createMockPipeline(1),
                createMockPipeline(2),
                createMockPipeline(10),
            ];
            const newPipelines: Pipeline[] = [
                createMockPipeline(1), // Same
                createMockPipeline(2, 'COMPLETED'), // Same but different state
                createMockPipeline(3), // New
                createMockPipeline(4), // New
            ];

            // Set up the mock to return the new pipelines
            mockPipelineApi.getRecentActivity.mockResolvedValue(newPipelines);

            // Set up shouldDisplay to return true
            (shouldDisplay as jest.Mock).mockReturnValue(true);

            // First set up previous results directly in the monitor
            (monitor as any)._previousResults['repo-uri'] = previousPipelines;

            // Mock the window.showInformationMessage response
            (window.showInformationMessage as jest.Mock).mockResolvedValue('View Pipeline Explorer');

            await monitor.checkForNewActivity();

            // Should have shown a notification
            expect(window.showInformationMessage).toHaveBeenCalled();
            expect(commands.executeCommand).toHaveBeenCalledWith('workbench.view.extension.atlascode-drawer');
        });

        it('should filter out pipelines that should not be displayed', async () => {
            // Set up pipeline changes
            const previousPipelines: Pipeline[] = [createMockPipeline(1)];
            const newPipelines: Pipeline[] = [
                createMockPipeline(1), // Same
                createMockPipeline(2), // New
            ];

            // Make the first one have a different state
            newPipelines[0].state.name = 'COMPLETED';

            // Set up the mock to return the new pipelines
            mockPipelineApi.getRecentActivity.mockResolvedValue(newPipelines);

            // Set up shouldDisplay to return false for all pipelines
            (shouldDisplay as jest.Mock).mockReturnValue(false);

            // First set up previous results directly in the monitor
            (monitor as any)._previousResults['repo-uri'] = previousPipelines;

            await monitor.checkForNewActivity();

            // Should not have shown a notification because all pipelines are filtered
            expect(window.showInformationMessage).not.toHaveBeenCalled();
        });

        it('should handle the "Don\'t show again" action', async () => {
            // Set up pipeline changes
            const previousPipelines: Pipeline[] = [createMockPipeline(1)];
            const newPipelines: Pipeline[] = [createMockPipeline(1), createMockPipeline(2)];

            // Make the first one have a different state
            newPipelines[0].state.name = 'COMPLETED';

            // Set up the mock to return the new pipelines
            mockPipelineApi.getRecentActivity.mockResolvedValue(newPipelines);

            // Set up shouldDisplay to return true
            (shouldDisplay as jest.Mock).mockReturnValue(true);

            // First set up previous results directly in the monitor
            (monitor as any)._previousResults['repo-uri'] = previousPipelines;

            // Mock the window.showInformationMessage response for "Don't show again"
            (window.showInformationMessage as jest.Mock).mockResolvedValue("Don't show again");

            await monitor.checkForNewActivity();

            // Should have updated the configuration
            expect(configuration.updateEffective).toHaveBeenCalledWith(
                'bitbucket.pipelines.monitorEnabled',
                false,
                null,
                true,
            );
        });
    });

    describe('diffResults', () => {
        it('should return empty array if no previous results', () => {
            const diff = (monitor as any).diffResults(undefined, [createMockPipeline(1)]);
            expect(diff).toEqual([]);
        });

        it('should detect state changes in existing pipelines', () => {
            const oldPipelines = [createMockPipeline(1), createMockPipeline(2)];
            const newPipelines = [createMockPipeline(1), createMockPipeline(2)];

            // Change state of the second pipeline
            newPipelines[1].state.name = 'COMPLETED';

            const diff = (monitor as any).diffResults(oldPipelines, newPipelines);

            // Should detect the second pipeline changed
            expect(diff.length).toBe(1);
            expect(diff[0].build_number).toBe(2);
        });
    });

    describe('shouldDisplayTarget', () => {
        beforeEach(() => {
            // Reset the shouldDisplay mock
            (shouldDisplay as jest.Mock).mockReset();
        });

        it('should return true for targets with no ref_name', () => {
            const target = { type: 'pipeline_ref_target' } as PipelineTarget;
            const result = (monitor as any).shouldDisplayTarget(target);
            expect(result).toBe(true);
            expect(shouldDisplay).not.toHaveBeenCalled();
        });

        it('should call shouldDisplay for targets with ref_name', () => {
            const target = {
                type: 'pipeline_ref_target',
                ref_name: 'main',
            } as PipelineTarget;

            // Mock what shouldDisplay should return
            (shouldDisplay as jest.Mock).mockReturnValue(true);

            const result = (monitor as any).shouldDisplayTarget(target);

            expect(result).toBe(true);
            expect(shouldDisplay).toHaveBeenCalledWith(target);
        });
    });
});

// Helper function to create mock Pipeline objects
function createMockPipeline(buildNumber: number, stateName = 'IN_PROGRESS'): Pipeline {
    return {
        build_number: buildNumber,
        state: {
            name: stateName,
            type: 'pipeline_state_in_progress',
            result: {
                type: 'pipeline_state_completed_successful',
                name: 'SUCCESSFUL',
            },
        },
        target: {
            type: 'pipeline_ref_target',
            ref_name: 'main',
            selector: {
                type: 'branches',
                pattern: 'main',
            },
        },
        repository: {
            name: 'test-repo',
        },
        site: {
            details: { isCloud: true },
            ownerSlug: 'owner',
            repoSlug: 'repo',
        },
    } as Pipeline;
}
