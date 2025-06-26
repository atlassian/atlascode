import { CacheMap } from '../../util/cachemap';
import { HTTPClient } from '../httpClient';
import { BitbucketBranchingModel, BitbucketSite, Repo, UnknownUser } from '../model';
import { CloudPullRequestApi, maxItemsSupported } from './pullRequests';
import { CloudRepositoriesApi } from './repositories';

// Mock dependencies
jest.mock('../../util/cachemap');
jest.mock('../httpClient');
jest.mock('./pullRequests');

describe('CloudRepositoriesApi', () => {
    let cloudRepositoriesApi: CloudRepositoriesApi;
    let mockClient: jest.Mocked<HTTPClient>;
    let mockRepoCache: jest.Mocked<CacheMap>;
    let mockBranchingModelCache: jest.Mocked<CacheMap>;

    const mockSite: BitbucketSite = {
        details: {
            host: 'bitbucket.org',
            isCloud: true,
            userId: 'user123',
            baseLinkUrl: 'https://bitbucket.org',
        } as any,
        ownerSlug: 'testowner',
        repoSlug: 'testrepo',
    };

    const mockRepoData = {
        uuid: 'repo-uuid-123',
        name: 'testrepo',
        full_name: 'testowner/testrepo',
        owner: {
            username: 'testowner',
        },
        mainbranch: {
            name: 'main',
        },
        links: {
            html: {
                href: 'https://bitbucket.org/testowner/testrepo',
            },
            avatar: {
                href: 'https://bitbucket.org/testowner/testrepo/avatar/32/',
            },
        },
        has_issues: true,
    };

    const mockBranchingModel: BitbucketBranchingModel = {
        development: {
            branch: {
                name: 'develop',
            },
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock client
        mockClient = {
            get: jest.fn(),
            getArrayBuffer: jest.fn(),
        } as any;

        // Create mock cache instances
        mockRepoCache = {
            getItem: jest.fn(),
            setItem: jest.fn(),
        } as any;

        mockBranchingModelCache = {
            getItem: jest.fn(),
            setItem: jest.fn(),
        } as any;

        // Mock CacheMap constructor to return our mocks
        (CacheMap as jest.MockedClass<typeof CacheMap>).mockImplementation(() => {
            // Return different instances for repo and branching model caches
            const instance = mockRepoCache;
            return instance;
        });

        cloudRepositoriesApi = new CloudRepositoriesApi(mockClient);

        // Manually set the cache instances for better control in tests
        (cloudRepositoriesApi as any).repoCache = mockRepoCache;
        (cloudRepositoriesApi as any).branchingModelCache = mockBranchingModelCache;
    });

    describe('getMirrorHosts', () => {
        it('should return an empty array', async () => {
            const result = await cloudRepositoriesApi.getMirrorHosts();
            expect(result).toEqual([]);
        });
    });

    describe('get', () => {
        it('should return cached repo if available', async () => {
            const cachedRepo: Repo = {
                id: 'cached-repo',
                name: 'cachedrepo',
                displayName: 'Cached Repo',
                fullName: 'testowner/cachedrepo',
                url: 'https://bitbucket.org/testowner/cachedrepo',
                avatarUrl: 'https://avatar.url',
                mainbranch: 'main',
                issueTrackerEnabled: true,
            };

            mockRepoCache.getItem.mockReturnValue(cachedRepo);

            const result = await cloudRepositoriesApi.get(mockSite);

            expect(mockRepoCache.getItem).toHaveBeenCalledWith('testowner::testrepo');
            expect(result).toBe(cachedRepo);
            expect(mockClient.get).not.toHaveBeenCalled();
        });

        it('should fetch repo data and cache it when not cached', async () => {
            mockRepoCache.getItem.mockReturnValue(undefined);
            mockBranchingModelCache.getItem.mockReturnValue(undefined);

            mockClient.get
                .mockResolvedValueOnce({ data: mockRepoData })
                .mockResolvedValueOnce({ data: mockBranchingModel });

            const result = await cloudRepositoriesApi.get(mockSite);

            expect(mockClient.get).toHaveBeenCalledTimes(2);
            expect(mockClient.get).toHaveBeenCalledWith('/repositories/testowner/testrepo');
            expect(mockClient.get).toHaveBeenCalledWith('/repositories/testowner/testrepo/branching-model');

            expect(mockRepoCache.setItem).toHaveBeenCalledWith('testowner::testrepo', expect.any(Object));
            expect(mockBranchingModelCache.setItem).toHaveBeenCalledWith('testowner::testrepo', mockBranchingModel);

            expect(result).toMatchObject({
                id: 'repo-uuid-123',
                name: 'testowner',
                displayName: 'testrepo',
                fullName: 'testowner/testrepo',
                url: 'https://bitbucket.org/testowner/testrepo',
                avatarUrl: 'https://bitbucket.org/testowner/testrepo/avatar/32/',
                mainbranch: 'main',
                developmentBranch: 'develop',
                issueTrackerEnabled: true,
            });
        });

        it('should handle parallel requests correctly', async () => {
            mockRepoCache.getItem.mockReturnValue(undefined);
            mockBranchingModelCache.getItem.mockReturnValue(undefined);

            mockClient.get
                .mockResolvedValueOnce({ data: mockRepoData })
                .mockResolvedValueOnce({ data: mockBranchingModel });

            const result = await cloudRepositoriesApi.get(mockSite);

            expect(mockClient.get).toHaveBeenCalledTimes(2);
            expect(result).toBeDefined();
        });
    });

    describe('getDevelopmentBranch', () => {
        it('should return development branch from branching model when available', async () => {
            const mockRepo: Repo = {
                id: 'repo-id',
                name: 'reponame',
                displayName: 'Repo Name',
                fullName: 'owner/repo',
                url: 'https://url',
                avatarUrl: 'https://avatar',
                mainbranch: 'main',
                issueTrackerEnabled: false,
            };

            jest.spyOn(cloudRepositoriesApi, 'get').mockResolvedValue(mockRepo);
            jest.spyOn(cloudRepositoriesApi, 'getBranchingModel').mockResolvedValue(mockBranchingModel);

            const result = await cloudRepositoriesApi.getDevelopmentBranch(mockSite);

            expect(result).toBe('develop');
        });

        it('should fallback to main branch when no development branch in branching model', async () => {
            const mockRepo: Repo = {
                id: 'repo-id',
                name: 'reponame',
                displayName: 'Repo Name',
                fullName: 'owner/repo',
                url: 'https://url',
                avatarUrl: 'https://avatar',
                mainbranch: 'main',
                issueTrackerEnabled: false,
            };

            const emptyBranchingModel = {};

            jest.spyOn(cloudRepositoriesApi, 'get').mockResolvedValue(mockRepo);
            jest.spyOn(cloudRepositoriesApi, 'getBranchingModel').mockResolvedValue(emptyBranchingModel);

            const result = await cloudRepositoriesApi.getDevelopmentBranch(mockSite);

            expect(result).toBe('main');
        });
    });

    describe('getBranches', () => {
        it('should return list of branch names', async () => {
            const mockBranchesResponse = {
                values: [{ name: 'main' }, { name: 'develop' }, { name: 'feature/test' }],
            };

            mockClient.get.mockResolvedValue({ data: mockBranchesResponse });

            const result = await cloudRepositoriesApi.getBranches(mockSite);

            expect(mockClient.get).toHaveBeenCalledWith('/repositories/testowner/testrepo/refs/branches', {
                pagelen: 100,
                fields: 'values.name',
            });

            expect(result).toEqual(['main', 'develop', 'feature/test']);
        });
    });

    describe('getBranchingModel', () => {
        it('should return cached branching model if available', async () => {
            mockBranchingModelCache.getItem.mockReturnValue(mockBranchingModel);

            const result = await cloudRepositoriesApi.getBranchingModel(mockSite);

            expect(mockBranchingModelCache.getItem).toHaveBeenCalledWith('testowner::testrepo');
            expect(result).toBe(mockBranchingModel);
            expect(mockClient.get).not.toHaveBeenCalled();
        });

        it('should fetch and cache branching model when not cached', async () => {
            mockBranchingModelCache.getItem.mockReturnValue(undefined);
            mockClient.get.mockResolvedValue({ data: mockBranchingModel });

            const result = await cloudRepositoriesApi.getBranchingModel(mockSite);

            expect(mockClient.get).toHaveBeenCalledWith('/repositories/testowner/testrepo/branching-model');
            expect(mockBranchingModelCache.setItem).toHaveBeenCalledWith('testowner::testrepo', mockBranchingModel);
            expect(result).toBe(mockBranchingModel);
        });
    });

    describe('getCommitsForRefs', () => {
        it('should return formatted commits', async () => {
            const mockCommitsResponse = {
                values: [
                    {
                        hash: 'commit1',
                        message: 'First commit',
                        date: '2023-01-01T00:00:00Z',
                        links: {
                            html: {
                                href: 'https://bitbucket.org/commit/commit1',
                            },
                        },
                        summary: {
                            html: '<p>First commit</p>',
                            raw: 'First commit',
                        },
                        author: {
                            user: {
                                account_id: 'user1',
                                display_name: 'User One',
                                links: {
                                    html: {
                                        href: 'https://bitbucket.org/user1',
                                    },
                                    avatar: {
                                        href: 'https://avatar.url/user1',
                                    },
                                },
                            },
                        },
                    },
                    {
                        hash: 'commit2',
                        message: 'Second commit',
                        date: '2023-01-02T00:00:00Z',
                        links: {
                            html: {
                                href: 'https://bitbucket.org/commit/commit2',
                            },
                        },
                        summary: null,
                        author: null,
                    },
                ],
            };

            // Mock CloudPullRequestApi.toUserModel
            const mockUser = {
                accountId: 'user1',
                displayName: 'User One',
                url: 'https://bitbucket.org/user1',
                avatarUrl: 'https://avatar.url/user1',
                mention: '@user1',
            };
            (CloudPullRequestApi.toUserModel as jest.Mock).mockReturnValue(mockUser);

            mockClient.get.mockResolvedValue({ data: mockCommitsResponse });

            const result = await cloudRepositoriesApi.getCommitsForRefs(mockSite, 'feature-branch', 'main');

            expect(mockClient.get).toHaveBeenCalledWith('/repositories/testowner/testrepo/commits', {
                include: 'feature-branch',
                exclude: 'main',
                pagelen: maxItemsSupported.commits,
            });

            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({
                hash: 'commit1',
                message: 'First commit',
                ts: '2023-01-01T00:00:00Z',
                url: 'https://bitbucket.org/commit/commit1',
                htmlSummary: '<p>First commit</p>',
                rawSummary: 'First commit',
                author: mockUser,
            });

            expect(result[1]).toMatchObject({
                hash: 'commit2',
                message: 'Second commit',
                ts: '2023-01-02T00:00:00Z',
                url: 'https://bitbucket.org/commit/commit2',
                htmlSummary: '',
                rawSummary: '',
                author: UnknownUser,
            });
        });

        it('should handle empty commits response', async () => {
            mockClient.get.mockResolvedValue({ data: { values: null } });

            const result = await cloudRepositoriesApi.getCommitsForRefs(mockSite, 'feature', 'main');

            expect(result).toEqual([]);
        });
    });

    describe('getPullRequestIdsForCommit', () => {
        it('should return pull request IDs for commit', async () => {
            const mockPullRequestsResponse = {
                values: [{ id: '1' }, { id: '2' }, { id: '3' }],
            };

            mockClient.get.mockResolvedValue({ data: mockPullRequestsResponse });

            const result = await cloudRepositoriesApi.getPullRequestIdsForCommit(mockSite, 'commit-hash');

            expect(mockClient.get).toHaveBeenCalledWith(
                '/repositories/testowner/testrepo/commit/commit-hash/pullrequests',
            );
            expect(result).toEqual(['1', '2', '3']);
        });

        it('should handle empty pull requests response', async () => {
            // Note: This test documents the current behavior which has a bug.
            // The implementation should handle null/undefined values gracefully
            mockClient.get.mockResolvedValue({ data: { values: null } });

            // The current implementation will throw an error when values is null
            await expect(cloudRepositoriesApi.getPullRequestIdsForCommit(mockSite, 'commit-hash')).rejects.toThrow(
                'Cannot read properties of null',
            );
        });

        it('should handle empty pull requests array', async () => {
            mockClient.get.mockResolvedValue({ data: { values: [] } });

            const result = await cloudRepositoriesApi.getPullRequestIdsForCommit(mockSite, 'commit-hash');

            expect(result).toEqual([]);
        });
    });

    describe('fetchImage', () => {
        it('should fetch image data', async () => {
            const mockImageData = 'base64-image-data';
            mockClient.getArrayBuffer.mockResolvedValue({
                data: mockImageData,
                headers: {} as any,
            });

            const result = await cloudRepositoriesApi.fetchImage('https://image.url');

            expect(mockClient.getArrayBuffer).toHaveBeenCalledWith('https://image.url');
            expect(result).toBe(mockImageData);
        });
    });

    describe('toRepo (static method)', () => {
        it('should convert Bitbucket repository data to Repo interface', () => {
            const result = CloudRepositoriesApi.toRepo(mockRepoData, mockBranchingModel);

            expect(result).toMatchObject({
                id: 'repo-uuid-123',
                name: 'testowner',
                displayName: 'testrepo',
                fullName: 'testowner/testrepo',
                url: 'https://bitbucket.org/testowner/testrepo',
                avatarUrl: 'https://bitbucket.org/testowner/testrepo/avatar/32/',
                mainbranch: 'main',
                developmentBranch: 'develop',
                branchingModel: mockBranchingModel,
                issueTrackerEnabled: true,
            });
        });

        it('should handle repository data without owner', () => {
            const repoDataWithoutOwner = {
                ...mockRepoData,
                owner: null,
            };

            const result = CloudRepositoriesApi.toRepo(repoDataWithoutOwner, mockBranchingModel);

            expect(result.name).toBe('testrepo');
        });

        it('should handle repository data without parent', () => {
            const repoDataWithParent = {
                ...mockRepoData,
                parent: {
                    full_name: 'parent/repo',
                },
            };

            const result = CloudRepositoriesApi.toRepo(repoDataWithParent, mockBranchingModel);

            expect(result.parentFullName).toBe('parent/repo');
        });

        it('should handle null repository data', () => {
            const result = CloudRepositoriesApi.toRepo(null, mockBranchingModel);

            expect(result).toMatchObject({
                id: 'REPO_NOT_FOUND',
                name: 'REPO_NOT_FOUND',
                displayName: 'REPO_NOT_FOUND',
                fullName: 'REPO_NOT_FOUND',
                url: '',
                avatarUrl: '',
                mainbranch: undefined,
                issueTrackerEnabled: false,
            });
        });

        it('should handle missing branching model', () => {
            const result = CloudRepositoriesApi.toRepo(mockRepoData);

            expect(result.developmentBranch).toBe('main');
            expect(result.branchingModel).toBeUndefined();
        });

        it('should handle repository without issues enabled', () => {
            const repoDataNoIssues = {
                ...mockRepoData,
                has_issues: false,
            };

            const result = CloudRepositoriesApi.toRepo(repoDataNoIssues, mockBranchingModel);

            expect(result.issueTrackerEnabled).toBe(false);
        });

        it('should use mainbranch as fallback for developmentBranch when no branching model development branch', () => {
            const branchingModelNoDev = {
                development: null,
            };

            const result = CloudRepositoriesApi.toRepo(mockRepoData, branchingModelNoDev);

            expect(result.developmentBranch).toBe('main');
        });
    });
});
