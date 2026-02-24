import { Uri } from 'vscode';

// Mock turndown before any other imports
jest.mock('turndown', () => {
    const mockTurndownService = jest.fn().mockImplementation(() => ({
        addRule: jest.fn(),
        turndown: jest.fn().mockReturnValue('mocked markdown'),
    }));
    return {
        __esModule: true,
        default: mockTurndownService,
    };
});

import { DetailedSiteInfo, ProductBitbucket } from '../atlclients/authInfo';
import { bbAPIConnectivityError } from '../constants';
import { Container } from '../container';
import { Logger } from '../logger';
import { API as GitApi, Repository } from '../typings/git';
import { CacheMap } from '../util/cachemap';
import { Time } from '../util/time';
import { PullRequestCommentController } from '../views/pullrequest/prCommentController';
import { PullRequestsExplorer } from '../views/pullrequest/pullRequestsExplorer';
import { BitbucketContext } from './bbContext';
import { clientForSite, getBitbucketCloudRemotes, getBitbucketRemotes, workspaceRepoFor } from './bbUtils';
import { BitbucketSite, PullRequest, User, WorkspaceRepo } from './model';

// Mock all other dependencies
jest.mock('../container');
jest.mock('../logger');
jest.mock('../views/pullrequest/prCommentController');
jest.mock('../views/pullrequest/pullRequestsExplorer');
jest.mock('./bbUtils');
jest.mock('../util/cachemap');

describe('BitbucketContext', () => {
    let mockGitApi: jest.Mocked<GitApi>;
    let bitbucketContext: BitbucketContext;
    let mockContainer: jest.Mocked<typeof Container>;
    let mockSiteManager: any;
    let mockClientManager: any;
    let mockRepository: jest.Mocked<Repository>;
    let mockBitbucketSite: BitbucketSite;
    let mockUser: User;
    let mockWorkspaceRepo: WorkspaceRepo;
    let mockPullRequest: PullRequest;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock VSCode context
        const mockContext = {
            subscriptions: [],
        };

        // Mock Container
        mockSiteManager = {
            onDidSitesAvailableChange: jest.fn().mockReturnValue({ dispose: jest.fn() }),
            getSitesAvailable: jest.fn().mockReturnValue([]),
            getFirstAAID: jest.fn(),
        };

        mockClientManager = {
            bbClient: jest.fn(),
        };

        mockContainer = Container as jest.Mocked<typeof Container>;
        Object.defineProperty(mockContainer, 'context', { value: mockContext, writable: true });
        Object.defineProperty(mockContainer, 'siteManager', { value: mockSiteManager, writable: true });
        Object.defineProperty(mockContainer, 'clientManager', { value: mockClientManager, writable: true });

        // Mock Git API
        mockGitApi = {
            state: 'initialized',
            repositories: [],
            onDidChangeState: jest.fn().mockReturnValue({ dispose: jest.fn() }),
            onDidOpenRepository: jest.fn().mockReturnValue({ dispose: jest.fn() }),
            onDidCloseRepository: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        } as any;
        Object.defineProperty(mockGitApi, 'repositories', { value: [], writable: true });
        Object.defineProperty(mockGitApi, 'state', { value: 'initialized', writable: true });

        // Mock Repository
        mockRepository = {
            rootUri: Uri.file('/test/repo'),
            state: {
                HEAD: { name: 'main' },
                remotes: [{ name: 'origin', fetchUrl: 'https://bitbucket.org/test/repo.git' }],
            },
            status: jest.fn().mockResolvedValue(undefined),
        } as any;

        // Mock BitbucketSite
        mockBitbucketSite = {
            details: {
                host: 'bitbucket.org',
                isCloud: true,
            } as DetailedSiteInfo,
            ownerSlug: 'testowner',
            repoSlug: 'testrepo',
        };

        // Mock User
        mockUser = {
            accountId: 'user-uuid',
            displayName: 'Test User',
            url: 'https://bitbucket.org/testuser',
            avatarUrl: 'https://bitbucket.org/avatar.png',
            mention: '@testuser',
        } as User;

        // Mock WorkspaceRepo
        mockWorkspaceRepo = {
            rootUri: '/test/repo',
            mainSiteRemote: {
                site: mockBitbucketSite,
                remote: { name: 'origin' } as any,
            },
            siteRemotes: [],
        };

        // Mock PullRequest
        mockPullRequest = {
            site: mockBitbucketSite,
            data: {
                id: '1',
                title: 'Test PR',
                state: 'OPEN',
                version: 1,
                url: 'https://bitbucket.org/test/repo/pull-requests/1',
                author: mockUser,
                participants: [],
                source: {
                    repo: {} as any,
                    branchName: 'feature',
                    commitHash: 'abc123',
                },
                destination: {
                    repo: {} as any,
                    branchName: 'main',
                    commitHash: 'def456',
                },
                htmlSummary: 'Test PR description',
                rawSummary: 'Test PR description',
                ts: Date.now(),
                updatedTs: Date.now(),
                closeSourceBranch: false,
                taskCount: 0,
                draft: false,
                siteDetails: mockBitbucketSite.details,
            },
        } as PullRequest;

        // Mock bbUtils functions
        (workspaceRepoFor as jest.Mock).mockReturnValue(mockWorkspaceRepo);
        (getBitbucketRemotes as jest.Mock).mockReturnValue([{ name: 'origin' }]);
        (getBitbucketCloudRemotes as jest.Mock).mockReturnValue([{ name: 'origin' }]);
        (clientForSite as jest.Mock).mockResolvedValue({
            pullrequests: {
                getCurrentUser: jest.fn().mockResolvedValue(mockUser),
                getRecentAllStatus: jest.fn().mockResolvedValue({ data: [mockPullRequest] }),
            },
            repositories: {
                getMirrorHosts: jest.fn().mockResolvedValue(['mirror1.com', 'mirror2.com']),
            },
        });

        // Mock CacheMap
        const mockCacheMap = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            deleteItem: jest.fn(),
            clear: jest.fn(),
            getItems: jest.fn().mockReturnValue([]),
        };
        (CacheMap as jest.Mock).mockImplementation(() => mockCacheMap);
    });

    describe('constructor', () => {
        it('should initialize BitbucketContext correctly', () => {
            bitbucketContext = new BitbucketContext(mockGitApi);

            expect(bitbucketContext).toBeInstanceOf(BitbucketContext);
            expect(PullRequestsExplorer).toHaveBeenCalledWith(bitbucketContext);
            expect(PullRequestCommentController).toHaveBeenCalledWith(mockContainer.context);
        });

        it('should set up event listeners', () => {
            bitbucketContext = new BitbucketContext(mockGitApi);

            expect(mockGitApi.onDidChangeState).toHaveBeenCalled();
            expect(mockGitApi.onDidOpenRepository).toHaveBeenCalled();
            expect(mockGitApi.onDidCloseRepository).toHaveBeenCalled();
            expect(mockSiteManager.onDidSitesAvailableChange).toHaveBeenCalled();
        });
    });

    describe('currentUser', () => {
        beforeEach(() => {
            bitbucketContext = new BitbucketContext(mockGitApi);
        });

        it('should return cached user if available', async () => {
            const mockCacheMap = bitbucketContext['_currentUsers'];
            mockCacheMap.getItem = jest.fn().mockReturnValue(mockUser);

            const result = await bitbucketContext.currentUser(mockBitbucketSite);

            expect(result).toBe(mockUser);
            expect(mockCacheMap.getItem).toHaveBeenCalledWith('bitbucket.org');
        });

        it('should fetch and cache user if not in cache', async () => {
            const mockCacheMap = bitbucketContext['_currentUsers'];
            mockCacheMap.getItem = jest.fn().mockReturnValue(undefined);
            mockCacheMap.setItem = jest.fn();

            const result = await bitbucketContext.currentUser(mockBitbucketSite);

            expect(result).toBe(mockUser);
            expect(clientForSite).toHaveBeenCalledWith(mockBitbucketSite);
            expect(mockCacheMap.setItem).toHaveBeenCalledWith('bitbucket.org', mockUser, 10 * Time.MINUTES);
        });

        it('should reject with API connectivity error if user not found', async () => {
            const mockCacheMap = bitbucketContext['_currentUsers'];
            mockCacheMap.getItem = jest.fn().mockReturnValue(undefined);

            (clientForSite as jest.Mock).mockResolvedValue({
                pullrequests: {
                    getCurrentUser: jest.fn().mockResolvedValue(null),
                },
            });

            await expect(bitbucketContext.currentUser(mockBitbucketSite)).rejects.toBe(bbAPIConnectivityError);
        });
    });

    describe('recentPullrequestsForAllRepos', () => {
        beforeEach(() => {
            bitbucketContext = new BitbucketContext(mockGitApi);
        });

        it('should return cached pull requests if available', async () => {
            const mockPullRequestCache = bitbucketContext['_pullRequestCache'];
            mockPullRequestCache.getItem = jest.fn().mockReturnValue([mockPullRequest]);

            const result = await bitbucketContext.recentPullrequestsForAllRepos();

            expect(result).toEqual([mockPullRequest]);
            expect(mockPullRequestCache.getItem).toHaveBeenCalledWith('pullrequests');
        });

        it('should fetch and cache pull requests if not in cache', async () => {
            const mockPullRequestCache = bitbucketContext['_pullRequestCache'];
            // First call returns undefined (not cached), second call returns the cached value
            mockPullRequestCache.getItem = jest.fn().mockReturnValueOnce(undefined).mockReturnValue([mockPullRequest]);
            mockPullRequestCache.setItem = jest.fn();

            // Mock getBitbucketRepositories to return our mock repo
            jest.spyOn(bitbucketContext, 'getBitbucketRepositories').mockReturnValue([mockWorkspaceRepo]);

            const result = await bitbucketContext.recentPullrequestsForAllRepos();

            expect(result).toEqual([mockPullRequest]);
            expect(mockPullRequestCache.setItem).toHaveBeenCalledWith(
                'pullrequests',
                [mockPullRequest],
                5 * Time.MINUTES,
            );
        });
    });

    describe('getAllRepositoriesRaw', () => {
        beforeEach(() => {
            Object.defineProperty(mockGitApi, 'repositories', { value: [mockRepository], writable: true });
            bitbucketContext = new BitbucketContext(mockGitApi);
        });

        it('should return all repositories from git API', () => {
            const result = bitbucketContext.getAllRepositoriesRaw();
            expect(result).toEqual([mockRepository]);
        });
    });

    describe('getAllRepositories', () => {
        beforeEach(() => {
            bitbucketContext = new BitbucketContext(mockGitApi);
        });

        it('should return all workspace repositories', () => {
            bitbucketContext['_repoMap'].set('/test/repo', mockWorkspaceRepo);

            const result = bitbucketContext.getAllRepositories();
            expect(result).toEqual([mockWorkspaceRepo]);
        });
    });

    describe('isBitbucketRepo', () => {
        beforeEach(() => {
            bitbucketContext = new BitbucketContext(mockGitApi);
        });

        it('should return true if repository has Bitbucket remotes', () => {
            (getBitbucketRemotes as jest.Mock).mockReturnValue([{ name: 'origin' }]);

            const result = bitbucketContext.isBitbucketRepo(mockRepository);
            expect(result).toBe(true);
            expect(getBitbucketRemotes).toHaveBeenCalledWith(mockRepository);
        });

        it('should return false if repository has no Bitbucket remotes', () => {
            (getBitbucketRemotes as jest.Mock).mockReturnValue([]);

            const result = bitbucketContext.isBitbucketRepo(mockRepository);
            expect(result).toBe(false);
        });
    });

    describe('isBitbucketCloudRepo', () => {
        beforeEach(() => {
            bitbucketContext = new BitbucketContext(mockGitApi);
        });

        it('should return true if repository has Bitbucket Cloud remotes', () => {
            (getBitbucketCloudRemotes as jest.Mock).mockReturnValue([{ name: 'origin' }]);

            const result = bitbucketContext.isBitbucketCloudRepo(mockRepository);
            expect(result).toBe(true);
            expect(getBitbucketCloudRemotes).toHaveBeenCalledWith(mockRepository);
        });

        it('should return false if repository has no Bitbucket Cloud remotes', () => {
            (getBitbucketCloudRemotes as jest.Mock).mockReturnValue([]);

            const result = bitbucketContext.isBitbucketCloudRepo(mockRepository);
            expect(result).toBe(false);
        });
    });

    describe('getBitbucketRepositories', () => {
        beforeEach(() => {
            bitbucketContext = new BitbucketContext(mockGitApi);
        });

        it('should return repositories with Bitbucket sites', () => {
            const repoWithSite = { ...mockWorkspaceRepo };
            const repoWithoutSite = {
                ...mockWorkspaceRepo,
                mainSiteRemote: { ...mockWorkspaceRepo.mainSiteRemote, site: undefined },
            };

            jest.spyOn(bitbucketContext, 'getAllRepositories').mockReturnValue([repoWithSite, repoWithoutSite]);

            const result = bitbucketContext.getBitbucketRepositories();
            expect(result).toEqual([repoWithSite]);
        });
    });

    describe('getBitbucketCloudRepositories', () => {
        beforeEach(() => {
            bitbucketContext = new BitbucketContext(mockGitApi);
        });

        it('should return only Bitbucket Cloud repositories', () => {
            const cloudRepo = { ...mockWorkspaceRepo };
            const serverRepo = {
                ...mockWorkspaceRepo,
                mainSiteRemote: {
                    ...mockWorkspaceRepo.mainSiteRemote,
                    site: {
                        ...mockBitbucketSite,
                        details: { ...mockBitbucketSite.details, isCloud: false },
                    },
                },
            };

            jest.spyOn(bitbucketContext, 'getAllRepositories').mockReturnValue([cloudRepo, serverRepo]);

            const result = bitbucketContext.getBitbucketCloudRepositories();
            expect(result).toEqual([cloudRepo]);
        });
    });

    describe('getRepository', () => {
        beforeEach(() => {
            bitbucketContext = new BitbucketContext(mockGitApi);
        });

        it('should return repository by URI', () => {
            const testUri = Uri.file('/test/repo');
            bitbucketContext['_repoMap'].set(testUri.toString(), mockWorkspaceRepo);

            const result = bitbucketContext.getRepository(testUri);
            expect(result).toBe(mockWorkspaceRepo);
        });

        it('should return undefined if repository not found', () => {
            const testUri = Uri.file('/nonexistent/repo');

            const result = bitbucketContext.getRepository(testUri);
            expect(result).toBeUndefined();
        });
    });

    describe('getRepositoryScm', () => {
        beforeEach(() => {
            Object.defineProperty(mockGitApi, 'repositories', { value: [mockRepository], writable: true });
            bitbucketContext = new BitbucketContext(mockGitApi);
        });

        it('should return SCM repository by URI string', () => {
            const result = bitbucketContext.getRepositoryScm(mockRepository.rootUri.toString());
            expect(result).toBe(mockRepository);
        });

        it('should return undefined if SCM repository not found', () => {
            const result = bitbucketContext.getRepositoryScm('/nonexistent/repo');
            expect(result).toBeUndefined();
        });
    });

    describe('getMirrors', () => {
        beforeEach(() => {
            bitbucketContext = new BitbucketContext(mockGitApi);
        });

        it('should return mirrors for hostname', () => {
            const mockMirrorsCache = bitbucketContext['_mirrorsCache'];
            mockMirrorsCache.getItem = jest.fn().mockReturnValue(['mirror1.com', 'mirror2.com']);

            const result = bitbucketContext.getMirrors('bitbucket.org');
            expect(result).toEqual(['mirror1.com', 'mirror2.com']);
            expect(mockMirrorsCache.getItem).toHaveBeenCalledWith('bitbucket.org');
        });

        it('should return empty array if no mirrors found', () => {
            const mockMirrorsCache = bitbucketContext['_mirrorsCache'];
            mockMirrorsCache.getItem = jest.fn().mockReturnValue(null);

            const result = bitbucketContext.getMirrors('bitbucket.org');
            expect(result).toEqual([]);
        });
    });

    describe('refreshRepos', () => {
        beforeEach(() => {
            Object.defineProperty(mockGitApi, 'repositories', { value: [mockRepository], writable: true });
            mockSiteManager.getSitesAvailable.mockReturnValue([mockBitbucketSite.details]);
        });

        it('should not refresh if git API is uninitialized', async () => {
            Object.defineProperty(mockGitApi, 'state', { value: 'uninitialized', writable: true });
            bitbucketContext = new BitbucketContext(mockGitApi);

            // The constructor calls refreshRepos, but it should return early
            expect(mockSiteManager.getSitesAvailable).not.toHaveBeenCalled();
        });

        it('should refresh repositories and clear caches', async () => {
            bitbucketContext = new BitbucketContext(mockGitApi);
            const mockPullRequestCache = bitbucketContext['_pullRequestCache'];
            const mockRepoMap = bitbucketContext['_repoMap'];

            // Spy on cache clearing
            jest.spyOn(mockPullRequestCache, 'clear');
            jest.spyOn(mockRepoMap, 'clear');

            // Call refreshRepos manually to test
            await bitbucketContext['refreshRepos']();

            expect(mockPullRequestCache.clear).toHaveBeenCalled();
            expect(mockRepoMap.clear).toHaveBeenCalled();
            expect(mockSiteManager.getSitesAvailable).toHaveBeenCalledWith(ProductBitbucket);
        });

        it('should handle repositories without HEAD state', async () => {
            const repoWithoutHead = {
                ...mockRepository,
                state: { ...mockRepository.state, HEAD: undefined },
            };
            Object.defineProperty(mockGitApi, 'repositories', { value: [repoWithoutHead], writable: true });

            bitbucketContext = new BitbucketContext(mockGitApi);

            // Wait for async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(repoWithoutHead.status).toHaveBeenCalled();
            expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('JS-1324 Forcing updateModelState'));
        });

        it('should handle repositories without remotes', async () => {
            const repoWithoutRemotes = {
                ...mockRepository,
                state: { ...mockRepository.state, remotes: [] },
            };
            Object.defineProperty(mockGitApi, 'repositories', { value: [repoWithoutRemotes], writable: true });

            bitbucketContext = new BitbucketContext(mockGitApi);

            // Wait for async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(Logger.warn).toHaveBeenCalledWith(expect.stringContaining('JS-1324 no remotes found'));
        });

        it('should handle mirror hosts fetch failure gracefully', async () => {
            mockClientManager.bbClient.mockRejectedValue(new Error('Network error'));

            bitbucketContext = new BitbucketContext(mockGitApi);

            // Wait for async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(Logger.debug).toHaveBeenCalledWith('Failed to fetch mirror sites');
        });

        it('should skip repositories with null/undefined state', async () => {
            const repoWithNullState = {
                ...mockRepository,
                state: null,
            };
            Object.defineProperty(mockGitApi, 'repositories', { value: [repoWithNullState], writable: true });

            bitbucketContext = new BitbucketContext(mockGitApi);

            // Wait for async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(Logger.debug).toHaveBeenCalledWith(
                expect.stringContaining('Skipping repository with uninitialized state'),
            );
            expect(repoWithNullState.status).not.toHaveBeenCalled();
        });

        it('should skip repositories with undefined state', async () => {
            const repoWithUndefinedState = {
                ...mockRepository,
                state: undefined,
            };
            Object.defineProperty(mockGitApi, 'repositories', { value: [repoWithUndefinedState], writable: true });

            bitbucketContext = new BitbucketContext(mockGitApi);

            // Wait for async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(Logger.debug).toHaveBeenCalledWith(
                expect.stringContaining('Skipping repository with uninitialized state'),
            );
        });

        it('should handle status() call failures gracefully', async () => {
            const repoWithFailingStatus = {
                ...mockRepository,
                state: { HEAD: undefined, remotes: [] },
                status: jest.fn().mockRejectedValue(new Error('Repository not initialized')),
            };
            Object.defineProperty(mockGitApi, 'repositories', {
                value: [repoWithFailingStatus],
                writable: true,
            });

            bitbucketContext = new BitbucketContext(mockGitApi);

            // Wait for async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('Failed to get status for'));
            expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('Repository not initialized'));
        });

        it('should continue processing other repos when one has uninitialized state', async () => {
            const repoWithNullState = {
                ...mockRepository,
                rootUri: Uri.file('/test/bad-repo'),
                state: null,
            };
            const goodRepo = {
                ...mockRepository,
                rootUri: Uri.file('/test/good-repo'),
                state: {
                    HEAD: { name: 'main' },
                    remotes: [{ name: 'origin', fetchUrl: 'https://bitbucket.org/test/good.git' }],
                },
                status: jest.fn().mockResolvedValue(undefined),
            };

            Object.defineProperty(mockGitApi, 'repositories', {
                value: [repoWithNullState, goodRepo],
                writable: true,
            });

            bitbucketContext = new BitbucketContext(mockGitApi);

            // Wait for async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(Logger.debug).toHaveBeenCalledWith(
                expect.stringContaining('Skipping repository with uninitialized state'),
            );
            expect(workspaceRepoFor).toHaveBeenCalledWith(goodRepo);
        });
    });

    describe('updateUsers', () => {
        beforeEach(() => {
            bitbucketContext = new BitbucketContext(mockGitApi);
        });

        it('should remove users not in sites list', () => {
            const mockCurrentUsers = bitbucketContext['_currentUsers'];
            (mockCurrentUsers.getItems as jest.Mock).mockReturnValue([
                { key: 'site1.com', value: mockUser },
                { key: 'site2.com', value: mockUser },
            ]);

            const sites: DetailedSiteInfo[] = [{ host: 'site1.com' } as DetailedSiteInfo];

            bitbucketContext['updateUsers'](sites);

            expect(mockCurrentUsers.deleteItem).toHaveBeenCalledWith('site2.com');
        });

        it('should fire context change event when users are removed', () => {
            const mockCurrentUsers = bitbucketContext['_currentUsers'];
            (mockCurrentUsers.getItems as jest.Mock).mockReturnValue([{ key: 'old-site.com', value: mockUser }]);

            const fireEventSpy = jest.spyOn(bitbucketContext['_onDidChangeBitbucketContext'], 'fire');

            bitbucketContext['updateUsers']([]);

            expect(fireEventSpy).toHaveBeenCalled();
        });
    });

    describe('dispose', () => {
        beforeEach(() => {
            bitbucketContext = new BitbucketContext(mockGitApi);
        });

        it('should dispose all resources', () => {
            const mockDisposable = bitbucketContext['_disposable'];
            const mockPullRequestsExplorer = bitbucketContext['_pullRequestsExplorer'];
            const mockEventEmitter = bitbucketContext['_onDidChangeBitbucketContext'];

            jest.spyOn(mockDisposable, 'dispose');
            jest.spyOn(mockPullRequestsExplorer, 'dispose');
            jest.spyOn(mockEventEmitter, 'dispose');

            bitbucketContext.dispose();

            expect(mockDisposable.dispose).toHaveBeenCalled();
            expect(mockPullRequestsExplorer.dispose).toHaveBeenCalled();
            expect(mockEventEmitter.dispose).toHaveBeenCalled();
        });
    });

    describe('disposeForNow', () => {
        beforeEach(() => {
            bitbucketContext = new BitbucketContext(mockGitApi);
        });

        it('should dispose pull requests explorer and event emitter', () => {
            const mockPullRequestsExplorer = bitbucketContext['_pullRequestsExplorer'];
            const mockEventEmitter = bitbucketContext['_onDidChangeBitbucketContext'];

            jest.spyOn(mockPullRequestsExplorer, 'dispose');
            jest.spyOn(mockEventEmitter, 'dispose');

            bitbucketContext.disposeForNow();

            expect(mockPullRequestsExplorer.dispose).toHaveBeenCalled();
            expect(mockEventEmitter.dispose).toHaveBeenCalled();
        });
    });

    describe('events', () => {
        beforeEach(() => {
            bitbucketContext = new BitbucketContext(mockGitApi);
        });

        it('should expose onDidChangeBitbucketContext event', () => {
            expect(bitbucketContext.onDidChangeBitbucketContext).toBeDefined();
        });

        it('should fire context change event when sites change', () => {
            const mockSiteChange = mockSiteManager.onDidSitesAvailableChange.mock.calls[0][0];
            jest.spyOn(bitbucketContext['_onDidChangeBitbucketContext'], 'fire');

            // Spy on private methods using prototype
            const updateUsersSpy = jest.spyOn(BitbucketContext.prototype as any, 'updateUsers').mockImplementation();
            const refreshReposSpy = jest.spyOn(BitbucketContext.prototype as any, 'refreshRepos').mockImplementation();

            mockSiteChange({ product: ProductBitbucket, sites: [] });

            expect(updateUsersSpy).toHaveBeenCalled();
            expect(refreshReposSpy).toHaveBeenCalled();

            updateUsersSpy.mockRestore();
            refreshReposSpy.mockRestore();
        });
    });
});
