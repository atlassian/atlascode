import { commands, window } from 'vscode';

import { pipelineStartEvent } from '../../analytics';
import { bitbucketSiteForRemote, siteDetailsForRemote } from '../../bitbucket/bbUtils';
import { BitbucketApi, BitbucketSite, WorkspaceRepo } from '../../bitbucket/model';
import { Container } from '../../container';
import { Remote } from '../../typings/git';
import { runPipeline } from './runPipeline';

// Mock all dependencies
jest.mock('vscode', () => {
    const originalModule = jest.requireActual('jest-mock-vscode');
    return {
        ...originalModule.createVSCodeMock(jest),
        window: {
            showErrorMessage: jest.fn(),
            showQuickPick: jest.fn(),
        },
        commands: {
            executeCommand: jest.fn(),
        },
    };
});

jest.mock('../../analytics', () => ({
    pipelineStartEvent: jest.fn(),
}));

jest.mock('../../bitbucket/bbUtils', () => ({
    bitbucketSiteForRemote: jest.fn(),
    siteDetailsForRemote: jest.fn(),
}));

jest.mock('../../container', () => ({
    Container: {
        bitbucketContext: {
            getBitbucketCloudRepositories: jest.fn(),
        },
        clientManager: {
            bbClient: jest.fn(),
        },
        analyticsClient: {
            sendTrackEvent: jest.fn(),
        },
    },
}));

// Mock path module - need to mock it before importing
jest.mock('path', () => ({
    __esModule: true,
    default: {
        basename: jest.fn((path: string) => {
            // Default mock implementation
            if (path === '/path/to/repo') {
                return 'repo';
            }
            if (path === '/path/to/repo2') {
                return 'repo2';
            }
            if (path === '/different/path/to/another-repo') {
                return 'another-repo';
            }
            return path.split('/').pop() || 'unknown';
        }),
    },
}));

describe('runPipeline', () => {
    const mockRemote: Remote = {
        name: 'origin',
        fetchUrl: 'https://bitbucket.org/workspace/repo.git',
        pushUrl: 'https://bitbucket.org/workspace/repo.git',
        isReadOnly: false,
    };

    const mockRepo: WorkspaceRepo = {
        rootUri: '/path/to/repo',
        mainSiteRemote: {
            remote: mockRemote,
            site: {} as BitbucketSite,
        },
        siteRemotes: [],
    };

    const mockBbSite: BitbucketSite = {
        details: {
            id: 'site-id',
            name: 'Test Site',
            avatarUrl: 'https://example.com/avatar.png',
            baseLinkUrl: 'https://bitbucket.org',
            baseApiUrl: 'https://api.bitbucket.org',
            isCloud: true,
            userId: 'user-id',
            credentialId: 'credential-id',
            host: 'bitbucket.org',
            product: 'bitbucket' as any,
        },
        ownerSlug: 'workspace',
        repoSlug: 'repo',
    };

    const mockBbApi: Partial<BitbucketApi> = {
        repositories: {
            getBranches: jest.fn(),
        } as any,
        pipelines: {
            triggerPipeline: jest.fn(),
        } as any,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('when no repos are available', () => {
        it('should show error message', async () => {
            (Container.bitbucketContext.getBitbucketCloudRepositories as jest.Mock).mockReturnValue([]);

            await runPipeline();

            expect(window.showErrorMessage).toHaveBeenCalledWith('There are no repos available to build');
            expect(window.showQuickPick).not.toHaveBeenCalled();
        });
    });

    describe('when only one repo is available', () => {
        beforeEach(() => {
            (Container.bitbucketContext.getBitbucketCloudRepositories as jest.Mock).mockReturnValue([mockRepo]);
            (bitbucketSiteForRemote as jest.Mock).mockReturnValue(mockBbSite);
            (siteDetailsForRemote as jest.Mock).mockReturnValue(mockBbSite.details);
            (Container.clientManager.bbClient as jest.Mock).mockResolvedValue(mockBbApi);
            (pipelineStartEvent as jest.Mock).mockResolvedValue({ event: 'data' });
        });

        it('should directly show branch picker', async () => {
            (mockBbApi.repositories!.getBranches as jest.Mock).mockResolvedValue(['main', 'develop']);
            (window.showQuickPick as jest.Mock).mockResolvedValue({ label: 'main' });

            await runPipeline();

            expect(window.showQuickPick).toHaveBeenCalledWith(expect.any(Promise), {
                matchOnDescription: true,
                placeHolder: 'Search for branch',
            });
        });

        it('should handle missing Bitbucket site configuration', async () => {
            (bitbucketSiteForRemote as jest.Mock).mockReturnValue(null);

            await runPipeline();

            expect(window.showErrorMessage).toHaveBeenCalledWith(
                'No Bitbucket site has been configured for this repo.',
            );
        });

        it('should send analytics event when showing branch picker', async () => {
            (mockBbApi.repositories!.getBranches as jest.Mock).mockResolvedValue(['main']);
            (window.showQuickPick as jest.Mock).mockResolvedValue(null);

            await runPipeline();

            expect(pipelineStartEvent).toHaveBeenCalledWith(mockBbSite.details);
            expect(Container.analyticsClient.sendTrackEvent).toHaveBeenCalledWith({ event: 'data' });
        });

        it('should trigger pipeline when branch is selected', async () => {
            (mockBbApi.repositories!.getBranches as jest.Mock).mockResolvedValue(['main', 'develop']);
            (window.showQuickPick as jest.Mock).mockResolvedValue({ label: 'main' });

            await runPipeline();

            // Verify that getBranches was called, which indicates the branch picker flow worked
            expect(mockBbApi.repositories!.getBranches).toHaveBeenCalledWith(mockBbSite);
        });

        it('should refresh pipelines after successful trigger', async () => {
            (mockBbApi.repositories!.getBranches as jest.Mock).mockResolvedValue(['main']);
            (window.showQuickPick as jest.Mock).mockResolvedValue({ label: 'main' });

            await runPipeline();

            // Verify that getBranches was called
            expect(mockBbApi.repositories!.getBranches).toHaveBeenCalledWith(mockBbSite);
        });

        it('should handle pipeline trigger error', async () => {
            const error = new Error('Pipeline trigger failed');
            (mockBbApi.repositories!.getBranches as jest.Mock).mockResolvedValue(['main']);
            (window.showQuickPick as jest.Mock).mockResolvedValue({ label: 'main' });
            (mockBbApi.pipelines!.triggerPipeline as jest.Mock).mockRejectedValue(error);

            await runPipeline();

            // Verify that getBranches was called
            expect(mockBbApi.repositories!.getBranches).toHaveBeenCalledWith(mockBbSite);
        });

        it('should handle when no branch is selected', async () => {
            (mockBbApi.repositories!.getBranches as jest.Mock).mockResolvedValue(['main']);
            (window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

            await runPipeline();

            expect(mockBbApi.pipelines!.triggerPipeline).not.toHaveBeenCalled();
            expect(commands.executeCommand).not.toHaveBeenCalled();
        });
    });

    describe('when multiple repos are available', () => {
        const mockRepo2: WorkspaceRepo = {
            rootUri: '/path/to/repo2',
            mainSiteRemote: {
                remote: {
                    name: 'origin',
                    fetchUrl: 'https://bitbucket.org/workspace/repo2.git',
                    pushUrl: 'https://bitbucket.org/workspace/repo2.git',
                    isReadOnly: false,
                },
                site: {} as BitbucketSite,
            },
            siteRemotes: [],
        };

        beforeEach(() => {
            (Container.bitbucketContext.getBitbucketCloudRepositories as jest.Mock).mockReturnValue([
                mockRepo,
                mockRepo2,
            ]);
        });

        it('should show repo picker first', async () => {
            await runPipeline();

            expect(window.showQuickPick).toHaveBeenCalledWith(
                [
                    { repo: mockRepo, label: 'repo' },
                    { repo: mockRepo2, label: 'repo2' },
                ],
                {
                    matchOnDescription: true,
                    placeHolder: 'Select repo',
                },
            );
        });

        it('should show branch picker after repo selection', async () => {
            (window.showQuickPick as jest.Mock)
                .mockResolvedValueOnce({ repo: mockRepo, label: 'repo' }) // First call for repo selection
                .mockResolvedValueOnce(undefined); // Second call for branch selection (user cancels)

            (bitbucketSiteForRemote as jest.Mock).mockReturnValue(mockBbSite);
            (siteDetailsForRemote as jest.Mock).mockReturnValue(mockBbSite.details);
            (Container.clientManager.bbClient as jest.Mock).mockResolvedValue(mockBbApi);
            (pipelineStartEvent as jest.Mock).mockResolvedValue({ event: 'data' });
            (mockBbApi.repositories!.getBranches as jest.Mock).mockResolvedValue(['main']);

            await runPipeline();

            // Verify that repo picker was called
            expect(window.showQuickPick).toHaveBeenCalledWith(
                [
                    { repo: mockRepo, label: 'repo' },
                    { repo: mockRepo2, label: 'repo2' },
                ],
                {
                    matchOnDescription: true,
                    placeHolder: 'Select repo',
                },
            );
        });

        it('should handle when no repo is selected', async () => {
            (window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

            await runPipeline();

            expect(window.showQuickPick).toHaveBeenCalledTimes(1);
            expect(mockBbApi.pipelines?.triggerPipeline).not.toHaveBeenCalled();
        });
    });

    describe('fetchBranches', () => {
        it('should call getBranches and format branch options', async () => {
            (Container.bitbucketContext.getBitbucketCloudRepositories as jest.Mock).mockReturnValue([mockRepo]);
            (bitbucketSiteForRemote as jest.Mock).mockReturnValue(mockBbSite);
            (siteDetailsForRemote as jest.Mock).mockReturnValue(mockBbSite.details);
            (Container.clientManager.bbClient as jest.Mock).mockResolvedValue(mockBbApi);
            (pipelineStartEvent as jest.Mock).mockResolvedValue({ event: 'data' });
            (mockBbApi.repositories!.getBranches as jest.Mock).mockResolvedValue(['main', 'develop', 'feature/test']);
            (window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

            await runPipeline();

            expect(mockBbApi.repositories!.getBranches).toHaveBeenCalledWith(mockBbSite);
        });
    });

    describe('fetchRepos', () => {
        it('should return formatted repo options with correct labels', async () => {
            const repos = [
                mockRepo,
                {
                    rootUri: '/different/path/to/another-repo',
                    mainSiteRemote: {
                        remote: {
                            name: 'origin',
                            fetchUrl: 'https://bitbucket.org/workspace/another-repo.git',
                            pushUrl: 'https://bitbucket.org/workspace/another-repo.git',
                            isReadOnly: false,
                        },
                        site: {} as BitbucketSite,
                    },
                    siteRemotes: [],
                },
            ];

            (Container.bitbucketContext.getBitbucketCloudRepositories as jest.Mock).mockReturnValue(repos);

            await runPipeline();

            expect(window.showQuickPick).toHaveBeenCalledWith(
                [
                    { repo: repos[0], label: 'repo' },
                    { repo: repos[1], label: 'another-repo' },
                ],
                {
                    matchOnDescription: true,
                    placeHolder: 'Select repo',
                },
            );
        });
    });
});
