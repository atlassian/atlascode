import { ProductBitbucket } from '../../atlclients/authInfo';
import { HTTPClient } from '../httpClient';
import { BitbucketBranchingModel, BitbucketSite, Repo } from '../model';
import { ServerRepositoriesApi } from './repositories';

// Mock HTTPClient
jest.mock('../httpClient');

// Mock CacheMap
jest.mock('../../util/cachemap', () => ({
    CacheMap: jest.fn().mockImplementation(() => ({
        getItem: jest.fn(),
        setItem: jest.fn(),
    })),
}));

// Mock ServerPullRequestApi
jest.mock('./pullRequests', () => ({
    ServerPullRequestApi: {
        toUser: jest.fn(),
    },
}));

describe('ServerRepositoriesApi', () => {
    let mockHttpClient: jest.Mocked<HTTPClient>;
    let repositoriesApi: ServerRepositoriesApi;
    let mockSite: BitbucketSite;

    beforeEach(() => {
        jest.clearAllMocks();

        mockHttpClient = {
            get: jest.fn(),
            getArrayBuffer: jest.fn(),
        } as any;

        repositoriesApi = new ServerRepositoriesApi(mockHttpClient);

        mockSite = {
            details: {
                baseLinkUrl: 'https://bitbucket.example.com',
                baseApiUrl: 'https://bitbucket.example.com',
                id: 'test-site',
                product: ProductBitbucket,
                host: 'bitbucket.example.com',
                isCloud: false,
                userId: 'test-user',
                credentialId: 'test-cred',
                name: 'Test Site',
                avatarUrl: '',
            },
            ownerSlug: 'PROJECT_KEY',
            repoSlug: 'repo-name',
        };
    });

    describe('getMirrorHosts', () => {
        it('should return mirror hosts when successful', async () => {
            const mockResponse = {
                data: {
                    values: [{ baseUrl: 'https://mirror1.example.com' }, { baseUrl: 'https://mirror2.example.com' }],
                },
            };
            mockHttpClient.get.mockResolvedValue(mockResponse);

            const result = await repositoriesApi.getMirrorHosts();

            expect(mockHttpClient.get).toHaveBeenCalledWith('/rest/mirroring/1.0/mirrorServers?limit=100');
            expect(result).toEqual(['mirror1.example.com', 'mirror2.example.com']);
        });

        it('should return empty array when request fails', async () => {
            mockHttpClient.get.mockRejectedValue(new Error('Network error'));

            const result = await repositoriesApi.getMirrorHosts();

            expect(result).toEqual([]);
        });
    });

    describe('get', () => {
        it('should return cached repo if available', async () => {
            const cachedRepo: Repo = {
                id: 'cached-repo',
                name: 'cached-repo',
                displayName: 'Cached Repo',
                fullName: 'PROJECT_KEY/cached-repo',
                url: 'https://bitbucket.example.com/projects/PROJECT_KEY/repos/cached-repo',
                avatarUrl: '',
                mainbranch: 'main',
                issueTrackerEnabled: false,
            };

            const mockRepoCache = repositoriesApi['repoCache'];
            mockRepoCache.getItem = jest.fn().mockReturnValue(cachedRepo);

            const result = await repositoriesApi.get(mockSite);

            expect(mockRepoCache.getItem).toHaveBeenCalledWith('PROJECT_KEY::repo-name');
            expect(result).toBe(cachedRepo);
            expect(mockHttpClient.get).not.toHaveBeenCalled();
        });

        it('should fetch and cache repo when not in cache', async () => {
            const mockRepoData = {
                data: {
                    id: 'repo-id',
                    slug: 'repo-name',
                    name: 'Repository Name',
                    project: { key: 'PROJECT_KEY' },
                    links: {
                        self: [{ href: 'https://bitbucket.example.com/projects/PROJECT_KEY/repos/repo-name/browse' }],
                    },
                    avatarUrl: '/projects/PROJECT_KEY/repos/repo-name/avatar.png',
                },
            };

            const mockDefaultBranch = {
                data: { id: 'refs/heads/main' },
            };

            const mockBranchingModel: BitbucketBranchingModel = {
                type: 'branching_model',
                branch_types: [],
                development: {
                    branch: { name: 'develop' },
                },
            };

            const mockRepoCache = repositoriesApi['repoCache'];
            const mockBranchingModelCache = repositoriesApi['branchingModelCache'];

            mockRepoCache.getItem = jest.fn().mockReturnValue(undefined);
            mockBranchingModelCache.getItem = jest.fn().mockReturnValue(mockBranchingModel);
            mockRepoCache.setItem = jest.fn();

            mockHttpClient.get.mockImplementation((url) => {
                if (url.includes('/repos/repo-name/branches/default')) {
                    return Promise.resolve(mockDefaultBranch);
                } else if (url.includes('/repos/repo-name')) {
                    return Promise.resolve(mockRepoData);
                }
                return Promise.reject(new Error('Unexpected URL'));
            });

            const result = await repositoriesApi.get(mockSite);

            expect(mockHttpClient.get).toHaveBeenCalledWith('/rest/api/1.0/projects/PROJECT_KEY/repos/repo-name');
            expect(mockHttpClient.get).toHaveBeenCalledWith(
                '/rest/api/1.0/projects/PROJECT_KEY/repos/repo-name/branches/default',
            );
            expect(mockRepoCache.setItem).toHaveBeenCalled();
            expect(result.id).toBe('repo-id');
            expect(result.name).toBe('repo-name');
            expect(result.displayName).toBe('Repository Name');
            expect(result.fullName).toBe('PROJECT_KEY/repo-name');
            expect(result.mainbranch).toBe('refs/heads/main');
            expect(result.branchingModel).toBe(mockBranchingModel);
        });
    });

    describe('getDevelopmentBranch', () => {
        it('should return development branch name from branching model', async () => {
            const mockBranchingModel: BitbucketBranchingModel = {
                type: 'branching_model',
                branch_types: [],
                development: {
                    branch: { name: 'develop' },
                },
            };

            const mockBranchingModelCache = repositoriesApi['branchingModelCache'];
            mockBranchingModelCache.getItem = jest.fn().mockReturnValue(mockBranchingModel);

            const result = await repositoriesApi.getDevelopmentBranch(mockSite);

            expect(result).toBe('develop');
        });

        it('should return undefined when no development branch', async () => {
            const mockBranchingModel: BitbucketBranchingModel = {
                type: 'branching_model',
                branch_types: [],
            };

            const mockBranchingModelCache = repositoriesApi['branchingModelCache'];
            mockBranchingModelCache.getItem = jest.fn().mockReturnValue(mockBranchingModel);

            const result = await repositoriesApi.getDevelopmentBranch(mockSite);

            expect(result).toBeUndefined();
        });
    });

    describe('getBranches', () => {
        it('should return list of branch names', async () => {
            const mockResponse = {
                data: {
                    values: [{ displayId: 'main' }, { displayId: 'develop' }, { displayId: 'feature/test' }],
                },
            };
            mockHttpClient.get.mockResolvedValue(mockResponse);

            const result = await repositoriesApi.getBranches(mockSite);

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                '/rest/api/1.0/projects/PROJECT_KEY/repos/repo-name/branches',
                { limit: 100 },
            );
            expect(result).toEqual(['main', 'develop', 'feature/test']);
        });
    });

    describe('getBranchingModel', () => {
        it('should return cached branching model if available', async () => {
            const cachedModel: BitbucketBranchingModel = {
                type: 'branching_model',
                branch_types: [],
                development: { branch: { name: 'develop' } },
            };

            const mockBranchingModelCache = repositoriesApi['branchingModelCache'];
            mockBranchingModelCache.getItem = jest.fn().mockReturnValue(cachedModel);

            const result = await repositoriesApi.getBranchingModel(mockSite);

            expect(mockBranchingModelCache.getItem).toHaveBeenCalledWith('PROJECT_KEY::repo-name');
            expect(result).toBe(cachedModel);
            expect(mockHttpClient.get).not.toHaveBeenCalled();
        });

        it('should fetch and cache branching model when not in cache', async () => {
            const mockResponse = {
                data: {
                    types: [
                        { displayName: 'Feature', prefix: 'feature/' },
                        { displayName: 'Hotfix', prefix: 'hotfix/' },
                    ],
                    development: { displayId: 'develop' },
                },
            };

            const mockBranchingModelCache = repositoriesApi['branchingModelCache'];
            mockBranchingModelCache.getItem = jest.fn().mockReturnValue(undefined);
            mockBranchingModelCache.setItem = jest.fn();
            mockHttpClient.get.mockResolvedValue(mockResponse);

            const result = await repositoriesApi.getBranchingModel(mockSite);

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                '/rest/branch-utils/1.0/projects/PROJECT_KEY/repos/repo-name/branchmodel',
            );
            expect(mockBranchingModelCache.setItem).toHaveBeenCalled();
            expect(result).toEqual({
                type: 'branching_model',
                branch_types: [
                    { kind: 'Feature', prefix: 'feature/' },
                    { kind: 'Hotfix', prefix: 'hotfix/' },
                ],
                development: {
                    branch: { name: 'develop' },
                },
            });
        });

        it('should handle missing development branch', async () => {
            const mockResponse = {
                data: {
                    types: [],
                },
            };

            const mockBranchingModelCache = repositoriesApi['branchingModelCache'];
            mockBranchingModelCache.getItem = jest.fn().mockReturnValue(undefined);
            mockBranchingModelCache.setItem = jest.fn();
            mockHttpClient.get.mockResolvedValue(mockResponse);

            const result = await repositoriesApi.getBranchingModel(mockSite);

            expect(result.development).toBeUndefined();
        });
    });

    describe('getCommitsForRefs', () => {
        it('should return formatted commits', async () => {
            const { ServerPullRequestApi } = require('./pullRequests');
            const mockUser = {
                accountId: 'user-id',
                displayName: 'John Doe',
                url: 'https://bitbucket.example.com/users/john',
                avatarUrl: '',
                mention: '@john',
            };
            ServerPullRequestApi.toUser.mockReturnValue(mockUser);

            const mockResponse = {
                data: {
                    values: [
                        {
                            id: 'commit-hash-1',
                            message: 'First commit',
                            authorTimestamp: '2023-06-01T10:00:00Z',
                            author: {
                                name: 'John Doe',
                                emailAddress: 'john@example.com',
                            },
                            summary: {
                                html: '<p>First commit summary</p>',
                                raw: 'First commit summary',
                            },
                        },
                        {
                            id: 'commit-hash-2',
                            message: 'Second commit',
                            authorTimestamp: '2023-06-02T10:00:00Z',
                            author: {
                                name: 'Jane Doe',
                                emailAddress: 'jane@example.com',
                            },
                        },
                    ],
                },
            };
            mockHttpClient.get.mockResolvedValue(mockResponse);

            const result = await repositoriesApi.getCommitsForRefs(mockSite, 'feature-branch', 'main');

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                '/rest/api/1.0/projects/PROJECT_KEY/repos/repo-name/commits',
                {
                    until: 'feature-branch',
                    since: 'main',
                },
            );
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                hash: 'commit-hash-1',
                message: 'First commit',
                ts: '2023-06-01T10:00:00Z',
                url: undefined,
                htmlSummary: '<p>First commit summary</p>',
                rawSummary: 'First commit summary',
                author: mockUser,
            });
            expect(result[1]).toEqual({
                hash: 'commit-hash-2',
                message: 'Second commit',
                ts: '2023-06-02T10:00:00Z',
                url: undefined,
                htmlSummary: undefined,
                rawSummary: undefined,
                author: mockUser,
            });
        });

        it('should handle empty commits response', async () => {
            const mockResponse = {
                data: {
                    values: [],
                },
            };
            mockHttpClient.get.mockResolvedValue(mockResponse);

            const result = await repositoriesApi.getCommitsForRefs(mockSite, 'feature-branch', 'main');

            expect(result).toEqual([]);
        });
    });

    describe('getPullRequestIdsForCommit', () => {
        it('should return pull request IDs for a commit', async () => {
            const mockResponse = {
                data: {
                    values: [{ id: '123' }, { id: '456' }],
                },
            };
            mockHttpClient.get.mockResolvedValue(mockResponse);

            const result = await repositoriesApi.getPullRequestIdsForCommit(mockSite, 'commit-hash');

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                '/rest/api/1.0/projects/PROJECT_KEY/repos/repo-name/commits/commit-hash/pull-requests',
            );
            expect(result).toEqual(['123', '456']);
        });

        it('should handle empty pull requests response', async () => {
            const mockResponse = {
                data: {
                    values: [],
                },
            };
            mockHttpClient.get.mockResolvedValue(mockResponse);

            const result = await repositoriesApi.getPullRequestIdsForCommit(mockSite, 'commit-hash');

            expect(result).toEqual([]);
        });
    });

    describe('fetchImage', () => {
        it('should fetch image data', async () => {
            const mockImageData = 'binary-image-data';
            mockHttpClient.getArrayBuffer.mockResolvedValue({
                data: mockImageData,
                headers: {},
            });

            const result = await repositoriesApi.fetchImage('https://example.com/image.png');

            expect(mockHttpClient.getArrayBuffer).toHaveBeenCalledWith('https://example.com/image.png');
            expect(result).toBe(mockImageData);
        });
    });

    describe('patchAvatarUrl', () => {
        it('should prepend base URL to relative avatar URL', () => {
            const baseUrl = 'https://bitbucket.example.com';
            const avatarUrl = '/projects/PROJECT_KEY/repos/repo-name/avatar.png';

            const result = ServerRepositoriesApi.patchAvatarUrl(baseUrl, avatarUrl);

            expect(result).toBe('https://bitbucket.example.com/projects/PROJECT_KEY/repos/repo-name/avatar.png');
        });

        it('should return absolute avatar URL unchanged', () => {
            const baseUrl = 'https://bitbucket.example.com';
            const avatarUrl = 'https://cdn.example.com/avatar.png';

            const result = ServerRepositoriesApi.patchAvatarUrl(baseUrl, avatarUrl);

            expect(result).toBe('https://cdn.example.com/avatar.png');
        });

        it('should handle empty avatar URL', () => {
            const baseUrl = 'https://bitbucket.example.com';
            const avatarUrl = '';

            const result = ServerRepositoriesApi.patchAvatarUrl(baseUrl, avatarUrl);

            expect(result).toBe('');
        });
    });

    describe('toRepo', () => {
        it('should convert Bitbucket Server repo data to Repo object', () => {
            const mockBbRepo = {
                id: 'repo-id',
                slug: 'repo-slug',
                name: 'Repository Name',
                project: { key: 'PROJECT_KEY' },
                links: {
                    self: [{ href: 'https://bitbucket.example.com/projects/PROJECT_KEY/repos/repo-slug/browse' }],
                },
                avatarUrl: '/projects/PROJECT_KEY/repos/repo-slug/avatar.png',
            };

            const mockBranchingModel: BitbucketBranchingModel = {
                type: 'branching_model',
                branch_types: [],
                development: { branch: { name: 'develop' } },
            };

            const result = ServerRepositoriesApi.toRepo(mockSite, mockBbRepo, 'main', mockBranchingModel);

            expect(result).toEqual({
                id: 'repo-id',
                name: 'repo-slug',
                displayName: 'Repository Name',
                fullName: 'PROJECT_KEY/repo-slug',
                parentFullName: undefined,
                url: 'https://bitbucket.example.com/projects/PROJECT_KEY/repos/repo-slug',
                avatarUrl: 'https://bitbucket.example.com/projects/PROJECT_KEY/repos/repo-slug/avatar.png',
                mainbranch: 'main',
                branchingModel: mockBranchingModel,
                issueTrackerEnabled: false,
            });
        });

        it('should handle repo with origin (fork)', () => {
            const mockBbRepo = {
                id: 'repo-id',
                slug: 'repo-slug',
                name: 'Repository Name',
                project: { key: 'PROJECT_KEY' },
                origin: {
                    project: { key: 'ORIGIN_PROJECT' },
                    slug: 'origin-repo',
                },
                links: {
                    self: [{ href: 'https://bitbucket.example.com/projects/PROJECT_KEY/repos/repo-slug' }],
                },
                avatarUrl: '/projects/PROJECT_KEY/repos/repo-slug/avatar.png',
            };

            const result = ServerRepositoriesApi.toRepo(mockSite, mockBbRepo, 'main');

            expect(result.parentFullName).toBe('ORIGIN_PROJECT/origin-repo');
        });

        it('should return placeholder repo when bbRepo is null/undefined', () => {
            const result = ServerRepositoriesApi.toRepo(mockSite, null, 'main');

            expect(result).toEqual({
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

        it('should strip /browse suffix from URL', () => {
            const mockBbRepo = {
                id: 'repo-id',
                slug: 'repo-slug',
                name: 'Repository Name',
                project: { key: 'PROJECT_KEY' },
                links: {
                    self: [{ href: 'https://bitbucket.example.com/projects/PROJECT_KEY/repos/repo-slug/browse' }],
                },
                avatarUrl: '/avatar.png',
            };

            const result = ServerRepositoriesApi.toRepo(mockSite, mockBbRepo, 'main');

            expect(result.url).toBe('https://bitbucket.example.com/projects/PROJECT_KEY/repos/repo-slug');
        });

        it('should handle empty self links array', () => {
            const mockBbRepo = {
                id: 'repo-id',
                slug: 'repo-slug',
                name: 'Repository Name',
                project: { key: 'PROJECT_KEY' },
                links: {
                    self: [],
                },
                avatarUrl: '/avatar.png',
            };

            // This test expects the code to throw an error when accessing undefined[0].href
            expect(() => {
                ServerRepositoriesApi.toRepo(mockSite, mockBbRepo, 'main');
            }).toThrow();
        });
    });
});
