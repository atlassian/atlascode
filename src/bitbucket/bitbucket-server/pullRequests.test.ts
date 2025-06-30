import { AxiosResponse } from 'axios';

import { DetailedSiteInfo, ProductBitbucket } from '../../atlclients/authInfo';
import { Container } from '../../container';
import { CacheMap } from '../../util/cachemap';
import { HTTPClient } from '../httpClient';
import { BitbucketSite, FileStatus, PullRequest, User, WorkspaceRepo } from '../model';
import { ServerPullRequestApi } from './pullRequests';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();
const mockGetRaw = jest.fn();
const mockGenerateUrl = jest.fn();

jest.mock('../httpClient', () => ({
    HTTPClient: jest.fn().mockImplementation(() => ({
        get: mockGet,
        post: mockPost,
        put: mockPut,
        delete: mockDelete,
        getRaw: mockGetRaw,
        generateUrl: mockGenerateUrl,
    })),
}));

// Mock dependencies
jest.mock('../../container');
jest.mock('../../util/cachemap');
jest.mock('../bbUtils', () => ({
    clientForSite: jest.fn(),
    encodePathParts: jest.fn((path: string) => path),
}));

describe('ServerPullRequestApi', () => {
    let api: ServerPullRequestApi;
    let mockClient: HTTPClient;
    let mockSite: BitbucketSite;
    let mockWorkspaceRepo: WorkspaceRepo;
    let mockUser: User;
    let mockPullRequest: PullRequest;
    let mockContainer: jest.Mocked<typeof Container>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockClient = new HTTPClient('', '', '', async (errJson: AxiosResponse) => Error('some error'));
        api = new ServerPullRequestApi(mockClient);

        // Mock CacheMap
        const mockCacheMap = {
            getItem: jest.fn(),
            setItem: jest.fn(),
        };
        (CacheMap as jest.MockedClass<typeof CacheMap>).mockImplementation(() => mockCacheMap as any);

        // Mock Container
        mockContainer = Container as jest.Mocked<typeof Container>;
        (mockContainer as any).bitbucketContext = {
            currentUser: jest.fn(),
        };

        // Setup mock data
        const mockSiteDetails: DetailedSiteInfo = {
            product: ProductBitbucket,
            baseLinkUrl: 'https://bitbucket.example.com',
            baseApiUrl: 'https://bitbucket.example.com/rest',
            userId: 'testuser',
            id: 'site-id',
            name: 'Test Site',
            avatarUrl: 'https://bitbucket.example.com/avatar.png',
            isCloud: false,
            credentialId: 'cred-id',
            host: 'bitbucket.example.com',
        };

        mockSite = {
            details: mockSiteDetails,
            ownerSlug: 'testproject',
            repoSlug: 'testrepo',
        };

        mockUser = {
            accountId: 'testuser',
            displayName: 'Test User',
            userName: 'testuser',
            emailAddress: 'test@example.com',
            url: 'https://bitbucket.example.com/users/testuser',
            avatarUrl: 'https://bitbucket.example.com/avatar.png',
            mention: '@testuser',
        };

        mockWorkspaceRepo = {
            rootUri: '/path/to/repo',
            mainSiteRemote: {
                site: mockSite,
                remote: {
                    name: 'origin',
                    fetchUrl: 'https://bitbucket.example.com/testproject/testrepo.git',
                    pushUrl: 'https://bitbucket.example.com/testproject/testrepo.git',
                    isReadOnly: false,
                },
            },
            siteRemotes: [],
        };

        mockPullRequest = {
            site: mockSite,
            workspaceRepo: mockWorkspaceRepo,
            data: {
                siteDetails: mockSiteDetails,
                id: '123',
                version: 1,
                url: 'https://bitbucket.example.com/projects/testproject/repos/testrepo/pull-requests/123',
                author: mockUser,
                participants: [],
                source: {
                    repo: {
                        id: '1',
                        name: 'testrepo',
                        displayName: 'Test Repo',
                        fullName: 'testproject/testrepo',
                        url: 'https://bitbucket.example.com/projects/testproject/repos/testrepo',
                        avatarUrl: '',
                        mainbranch: 'main',
                        issueTrackerEnabled: false,
                    },
                    branchName: 'feature-branch',
                    commitHash: 'abc123',
                },
                destination: {
                    repo: {
                        id: '1',
                        name: 'testrepo',
                        displayName: 'Test Repo',
                        fullName: 'testproject/testrepo',
                        url: 'https://bitbucket.example.com/projects/testproject/repos/testrepo',
                        avatarUrl: '',
                        mainbranch: 'main',
                        issueTrackerEnabled: false,
                    },
                    branchName: 'main',
                    commitHash: 'def456',
                },
                title: 'Test Pull Request',
                htmlSummary: '<p>Test summary</p>',
                rawSummary: 'Test summary',
                ts: '2023-01-01T00:00:00Z',
                updatedTs: '2023-01-01T00:00:00Z',
                state: 'OPEN',
                closeSourceBranch: false,
                taskCount: 0,
                buildStatuses: [],
                draft: false,
            },
        };
    });

    describe('get', () => {
        it('should get with v8 API if no 404s', async () => {
            mockGet.mockImplementation((url, queryParams?) => {
                if (
                    url.includes(
                        '/rest/api/1.0/projects/testproject/repos/testrepo/pull-requests/PR-1/blocker-comments?count=true',
                    )
                ) {
                    return Promise.resolve(getTaskCountDataV8);
                }
                if (
                    url.includes('/rest/api/1.0/projects/testproject/repos/testrepo/pull-requests/PR-1') &&
                    queryParams?.['markup'] === true
                ) {
                    return Promise.resolve({ data: getPullRequestData });
                }

                return Promise.reject(new Error('Not Found'));
            });

            await api.get(mockSite, 'PR-1');

            expect(mockGet).toHaveBeenCalledWith(
                '/rest/api/1.0/projects/testproject/repos/testrepo/pull-requests/PR-1/blocker-comments?count=true',
            );
        });

        it('should fall back to v0 API on 404 for task count', async () => {
            mockGet.mockImplementation((url, queryParams?) => {
                if (
                    url.includes(
                        '/rest/api/1.0/projects/testproject/repos/testrepo/pull-requests/PR-1/blocker-comments?count=true',
                    )
                ) {
                    const error: any = new Error('Not Found');
                    error.message = { 'status-code': 404 };
                    throw error;
                }
                if (url.includes('/rest/api/1.0/projects/testproject/repos/testrepo/pull-requests/PR-1/tasks/count')) {
                    return Promise.resolve({ data: 3 });
                }
                if (
                    url.includes('/rest/api/1.0/projects/testproject/repos/testrepo/pull-requests/PR-1') &&
                    queryParams?.['markup'] === true
                ) {
                    return Promise.resolve({ data: getPullRequestData });
                }

                return Promise.reject(new Error('Not Found'));
            });

            const result = await api.get(mockSite, 'PR-1');

            expect(mockGet).toHaveBeenCalledWith(
                '/rest/api/1.0/projects/testproject/repos/testrepo/pull-requests/PR-1/tasks/count',
            );
            expect(result.data.taskCount).toBe(3);
        });
    });

    describe('getList', () => {
        it('should return pull requests for a workspace repo', async () => {
            const mockResponse = {
                data: {
                    values: [getPullRequestData],
                    isLastPage: true,
                },
            };

            mockGet.mockResolvedValue(mockResponse);

            const result = await api.getList(mockWorkspaceRepo);

            expect(mockGet).toHaveBeenCalledWith('/rest/api/1.0/projects/testproject/repos/testrepo/pull-requests', {
                markup: true,
                avatarSize: 64,
            });
            expect(result.data).toHaveLength(1);
        });

        it('should return empty data when site is not available', async () => {
            const workspaceRepoWithoutSite = {
                ...mockWorkspaceRepo,
                mainSiteRemote: { ...mockWorkspaceRepo.mainSiteRemote, site: undefined },
            };

            const result = await api.getList(workspaceRepoWithoutSite);

            expect(result.data).toEqual([]);
            expect(mockGet).not.toHaveBeenCalled();
        });

        it('should handle pagination with next page', async () => {
            const mockResponse = {
                data: {
                    values: [getPullRequestData],
                    isLastPage: false,
                    nextPageStart: 25,
                },
            };

            mockGet.mockResolvedValue(mockResponse);
            mockGenerateUrl.mockReturnValue('http://example.com/next-page');

            const result = await api.getList(mockWorkspaceRepo);

            expect(result.next).toBe('http://example.com/next-page');
            expect(mockGenerateUrl).toHaveBeenCalled();
        });
    });

    describe('getListCreatedByMe', () => {
        it('should call getList with author filter', async () => {
            const mockCurrentUser = jest.fn().mockResolvedValue({ userName: 'testuser' });
            (mockContainer as any).bitbucketContext.currentUser = mockCurrentUser;

            const getListSpy = jest.spyOn(api, 'getList').mockResolvedValue({
                workspaceRepo: mockWorkspaceRepo,
                site: mockSite,
                data: [],
            });

            await api.getListCreatedByMe(mockWorkspaceRepo);

            expect(getListSpy).toHaveBeenCalledWith(mockWorkspaceRepo, {
                'username.1': 'testuser',
                'role.1': 'AUTHOR',
            });
        });
    });

    describe('getListToReview', () => {
        it('should call getList with reviewer filter', async () => {
            const mockCurrentUser = jest.fn().mockResolvedValue({ userName: 'testuser' });
            (mockContainer as any).bitbucketContext.currentUser = mockCurrentUser;

            const getListSpy = jest.spyOn(api, 'getList').mockResolvedValue({
                workspaceRepo: mockWorkspaceRepo,
                site: mockSite,
                data: [],
            });

            await api.getListToReview(mockWorkspaceRepo);

            expect(getListSpy).toHaveBeenCalledWith(mockWorkspaceRepo, {
                'username.1': 'testuser',
                'role.1': 'REVIEWER',
                'approved.1': false,
            });
        });
    });

    describe('getListMerged', () => {
        it('should call getList with merged state filter', async () => {
            const getListSpy = jest.spyOn(api, 'getList').mockResolvedValue({
                workspaceRepo: mockWorkspaceRepo,
                site: mockSite,
                data: [],
            });

            await api.getListMerged(mockWorkspaceRepo);

            expect(getListSpy).toHaveBeenCalledWith(mockWorkspaceRepo, {
                state: 'MERGED',
            });
        });
    });

    describe('getListDeclined', () => {
        it('should call getList with declined state filter', async () => {
            const getListSpy = jest.spyOn(api, 'getList').mockResolvedValue({
                workspaceRepo: mockWorkspaceRepo,
                site: mockSite,
                data: [],
            });

            await api.getListDeclined(mockWorkspaceRepo);

            expect(getListSpy).toHaveBeenCalledWith(mockWorkspaceRepo, {
                state: 'DECLINED',
            });
        });
    });

    describe('getMergeStrategies', () => {
        it('should return merge strategies for a pull request', async () => {
            const mockResponse = {
                data: {
                    mergeConfig: {
                        strategies: [
                            { id: 'merge', name: 'Merge commit' },
                            { id: 'squash', name: 'Squash' },
                        ],
                        defaultStrategy: { id: 'merge' },
                    },
                },
            };

            mockGet.mockResolvedValue(mockResponse);

            const result = await api.getMergeStrategies(mockPullRequest);

            expect(mockGet).toHaveBeenCalledWith(
                '/rest/api/1.0/projects/testproject/repos/testrepo/settings/pull-requests',
                {
                    markup: true,
                    avatarSize: 64,
                },
            );
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                label: 'Merge commit',
                value: 'merge',
                isDefault: true,
            });
        });
    });

    describe('getTasks', () => {
        it('should return tasks from the API', async () => {
            // Mock successful response for v8 API (blocker-comments)
            mockGet.mockImplementation((url) => {
                if (url.includes('/blocker-comments')) {
                    return Promise.resolve({
                        data: {
                            values: [
                                {
                                    id: 'task1',
                                    text: 'Fix this',
                                    state: 'OPEN',
                                    author: { slug: 'testuser', displayName: 'Test User' },
                                    createdDate: '2023-01-01T00:00:00Z',
                                    updatedDate: '2023-01-01T00:00:00Z',
                                    version: 1,
                                    permittedOperations: { editable: true, deletable: true },
                                },
                            ],
                        },
                    });
                }
                return Promise.reject(new Error('Not Found'));
            });

            const result = await api.getTasks(mockPullRequest);

            expect(result).toHaveLength(1);
            expect(result[0].content).toBe('Fix this');
            expect(result[0].isComplete).toBe(false);
        });
    });

    describe('getChangedFiles', () => {
        it('should return file diffs for a pull request', async () => {
            const mockResponse = {
                data: {
                    diffs: [
                        {
                            source: { toString: 'src/old-file.ts' },
                            destination: { toString: 'src/new-file.ts' },
                            hunks: [
                                {
                                    sourceSpan: 10,
                                    destinationSpan: 12,
                                    segments: [
                                        {
                                            type: 'ADDED',
                                            lines: [
                                                { source: 5, destination: 5 },
                                                { source: 6, destination: 6 },
                                            ],
                                        },
                                        {
                                            type: 'CONTEXT',
                                            lines: [{ source: 8, destination: 8 }],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                    isLastPage: true,
                },
            };

            mockGet.mockResolvedValue(mockResponse);

            const result = await api.getChangedFiles(mockPullRequest);

            expect(mockGet).toHaveBeenCalledWith(
                '/rest/api/1.0/projects/testproject/repos/testrepo/pull-requests/123/diff',
                {
                    markup: true,
                    avatarSize: 64,
                },
            );
            expect(result).toHaveLength(1);
            expect(result[0].status).toBe(FileStatus.RENAMED);
        });
    });

    describe('getConflictedFiles', () => {
        it('should return empty array for server implementation', async () => {
            const result = await api.getConflictedFiles(mockPullRequest);
            expect(result).toEqual([]);
        });
    });

    describe('updateApproval', () => {
        it('should update approval status and map NEEDS_WORK to CHANGES_REQUESTED', async () => {
            const mockResponse = {
                data: {
                    status: 'NEEDS_WORK',
                },
            };

            mockPut.mockResolvedValue(mockResponse);

            const result = await api.updateApproval(mockPullRequest, 'CHANGES_REQUESTED');

            expect(mockPut).toHaveBeenCalledWith(
                '/rest/api/1.0/projects/testproject/repos/testrepo/pull-requests/123/participants/testuser',
                {
                    status: 'NEEDS_WORK',
                },
            );
            expect(result).toBe('CHANGES_REQUESTED');
        });
    });

    describe('merge', () => {
        it('should merge a pull request with strategy', async () => {
            const mockResponse = {
                data: {
                    ...getPullRequestData,
                    state: 'MERGED',
                    version: 2,
                },
            };

            mockPost.mockResolvedValue(mockResponse);
            jest.spyOn(api as any, 'getTaskCount').mockResolvedValue(0);

            const result = await api.merge(mockPullRequest, false, 'squash', 'Custom commit message');

            expect(mockPost).toHaveBeenCalledWith(
                '/rest/api/1.0/projects/testproject/repos/testrepo/pull-requests/123/merge',
                {
                    autoSubject: false,
                    strategyId: 'squash',
                    message: 'Custom commit message',
                },
                {
                    version: 1,
                    markup: true,
                    avatarSize: 64,
                },
            );
            expect(result.data.state).toBe('MERGED');
        });
    });

    describe('postComment', () => {
        it('should post a comment with inline information', async () => {
            const mockResponse = {
                data: {
                    id: 'comment2',
                    text: 'New comment',
                    author: { slug: 'testuser', displayName: 'Test User' },
                    createdDate: '2023-01-01T00:00:00Z',
                    permittedOperations: { editable: true, deletable: true },
                },
            };

            mockPost.mockResolvedValue(mockResponse);

            const result = await api.postComment(
                mockSite,
                '123',
                'New comment',
                '',
                { path: 'src/file.ts', to: 10 },
                undefined,
                'ADDED',
            );

            expect(mockPost).toHaveBeenCalledWith(
                '/rest/api/1.0/projects/testproject/repos/testrepo/pull-requests/123/comments',
                {
                    parent: undefined,
                    text: 'New comment',
                    anchor: {
                        line: 10,
                        lineType: 'ADDED',
                        fileType: 'TO',
                        path: 'src/file.ts',
                    },
                },
                {
                    markup: true,
                    avatarSize: 64,
                },
            );
            expect(result.id).toBe('comment2');
        });
    });

    describe('getFileContent', () => {
        it('should fetch file content', async () => {
            const mockResponse = {
                data: 'file content',
            };

            mockGetRaw.mockResolvedValue(mockResponse);

            const result = await api.getFileContent(mockSite, 'abc123', 'src/file.ts');

            expect(mockGetRaw).toHaveBeenCalledWith(
                '/rest/api/1.0/projects/testproject/repos/testrepo/raw/src/file.ts',
                {
                    at: 'abc123',
                },
            );
            expect(result).toBe('file content');
        });
    });

    describe('static methods', () => {
        describe('toUser', () => {
            it('should convert API data to User model', () => {
                const userData = {
                    slug: 'testuser',
                    displayName: 'Test User',
                    emailAddress: 'test@example.com',
                    name: 'testuser',
                    links: { self: [{ href: 'http://example.com/users/testuser' }] },
                    avatarUrl: '/avatar.png',
                };

                const result = ServerPullRequestApi.toUser(mockSite.details, userData);

                expect(result).toEqual({
                    accountId: 'testuser',
                    displayName: 'Test User',
                    emailAddress: 'test@example.com',
                    userName: 'testuser',
                    url: 'http://example.com/users/testuser',
                    avatarUrl: 'https://bitbucket.example.com/avatar.png',
                    mention: '@testuser',
                });
            });

            it('should use slug as userName fallback', () => {
                const userData = {
                    slug: 'testuser',
                    displayName: 'Test User',
                    emailAddress: 'test@example.com',
                    // name property missing
                    links: { self: [{ href: 'http://example.com/users/testuser' }] },
                    avatarUrl: '/avatar.png',
                };

                const result = ServerPullRequestApi.toUser(mockSite.details, userData);

                expect(result.userName).toBe('testuser');
            });
        });

        describe('patchAvatarUrl', () => {
            it('should prepend base URL to relative avatar URLs', () => {
                const result = ServerPullRequestApi.patchAvatarUrl('https://example.com', '/avatar.png');
                expect(result).toBe('https://example.com/avatar.png');
            });

            it('should not modify absolute avatar URLs', () => {
                const result = ServerPullRequestApi.patchAvatarUrl(
                    'https://example.com',
                    'https://cdn.example.com/avatar.png',
                );
                expect(result).toBe('https://cdn.example.com/avatar.png');
            });
        });
    });

    describe('nextPage', () => {
        it('should fetch next page of pull requests', async () => {
            const mockPaginatedPullRequests = {
                workspaceRepo: mockWorkspaceRepo,
                site: mockSite,
                data: [],
                next: 'http://example.com/next-page',
            };

            const mockResponse = {
                data: {
                    values: [getPullRequestData],
                },
            };

            mockGet.mockResolvedValue(mockResponse);

            const result = await api.nextPage(mockPaginatedPullRequests);

            expect(mockGet).toHaveBeenCalledWith('http://example.com/next-page');
            expect(result.data).toHaveLength(1);
            expect(result.next).toBeUndefined();
        });

        it('should return same object when no next page', async () => {
            const mockPaginatedPullRequests = {
                workspaceRepo: mockWorkspaceRepo,
                site: mockSite,
                data: [],
                next: undefined,
            };

            const result = await api.nextPage(mockPaginatedPullRequests);

            expect(mockGet).not.toHaveBeenCalled();
            expect(result).toEqual({
                ...mockPaginatedPullRequests,
                next: undefined,
            });
        });
    });

    describe('getById', () => {
        it('should fetch a pull request by numeric ID', async () => {
            const mockResponse = {
                data: getPullRequestData,
            };

            mockGet.mockResolvedValue(mockResponse);

            const result = await api.getById(mockSite, 123);

            expect(mockGet).toHaveBeenCalledWith(
                '/rest/api/1.0/projects/testproject/repos/testrepo/pull-requests/123',
                {
                    markup: true,
                    avatarSize: 64,
                },
            );
            expect(result.data.id).toBe(1);
        });
    });

    describe('postTask', () => {
        it('should use v8 API when no errors occur', async () => {
            // Mock clientForSite to return a repositories API
            const mockClientForSite = require('../bbUtils').clientForSite;
            mockClientForSite.mockResolvedValue({
                repositories: {
                    get: jest.fn().mockResolvedValue({ id: '1', name: 'testrepo' }),
                },
            });

            mockPost.mockResolvedValue({
                data: {
                    id: 'task1',
                    text: 'Fix this',
                    state: 'OPEN',
                    author: { slug: 'testuser', displayName: 'Test User' },
                    createdDate: '2023-01-01T00:00:00Z',
                    updatedDate: '2023-01-01T00:00:00Z',
                    version: 1,
                    permittedOperations: { editable: true, deletable: true },
                },
            });

            const result = await api.postTask(mockSite, '123', 'Fix this', 'comment1');

            expect(result.content).toBe('Fix this');
            expect(result.isComplete).toBe(false);
            expect(mockPost).toHaveBeenCalledTimes(1);
        });

        it('should use v8 API when available', async () => {
            const mockClientForSite = require('../bbUtils').clientForSite;
            mockClientForSite.mockResolvedValue({
                repositories: {
                    get: jest.fn().mockResolvedValue({ id: '1', name: 'testrepo' }),
                },
            });

            mockPost.mockResolvedValue({
                data: {
                    id: 'task1',
                    text: 'Fix this',
                    state: 'OPEN',
                    author: { slug: 'testuser', displayName: 'Test User' },
                    createdDate: '2023-01-01T00:00:00Z',
                    updatedDate: '2023-01-01T00:00:00Z',
                    version: 1,
                    permittedOperations: { editable: true, deletable: true },
                },
            });

            const result = await api.postTask(mockSite, '123', 'Fix this', 'comment1');

            expect(mockPost).toHaveBeenCalledWith(
                '/rest/api/latest/projects/testproject/repos/testrepo/pull-requests/123/comments',
                {
                    id: 'comment1',
                    state: 'OPEN',
                    version: 1,
                    severity: 'BLOCKER',
                    text: 'Fix this',
                    properties: {},
                },
            );
            expect(result.content).toBe('Fix this');
        });
    });

    describe('editTask', () => {
        const mockTask = {
            commentId: 'comment1',
            creator: mockUser,
            created: '2023-01-01T00:00:00Z',
            updated: '2023-01-01T00:00:00Z',
            isComplete: false,
            editable: true,
            deletable: true,
            id: 'task1',
            content: 'Fix this',
            version: 1,
        };

        it('should update task when no errors occur', async () => {
            mockPut.mockResolvedValue({
                data: {
                    id: 'task1',
                    text: 'Updated fix',
                    state: 'RESOLVED',
                    author: { slug: 'testuser', displayName: 'Test User' },
                    createdDate: '2023-01-01T00:00:00Z',
                    updatedDate: '2023-01-01T00:00:00Z',
                    version: 2,
                    permittedOperations: { editable: true, deletable: true },
                },
            });

            const updatedTask = { ...mockTask, content: 'Updated fix', isComplete: true };
            const result = await api.editTask(mockSite, '123', updatedTask);

            expect(result.content).toBe('Updated fix');
            expect(result.isComplete).toBe(true);
            expect(mockPut).toHaveBeenCalledTimes(1);
        });

        it('should use v8 API when available', async () => {
            mockPut.mockResolvedValue({
                data: {
                    id: 'task1',
                    text: 'Updated fix',
                    state: 'RESOLVED',
                    author: { slug: 'testuser', displayName: 'Test User' },
                    createdDate: '2023-01-01T00:00:00Z',
                    updatedDate: '2023-01-01T00:00:00Z',
                    version: 2,
                    permittedOperations: { editable: true, deletable: true },
                },
            });

            const updatedTask = { ...mockTask, content: 'Updated fix', isComplete: true };
            const result = await api.editTask(mockSite, '123', updatedTask);

            expect(mockPut).toHaveBeenCalledWith(
                '/rest/api/1.0/projects/testproject/repos/testrepo/pull-requests/123/comments/comment1',
                {
                    id: 'task1',
                    state: 'RESOLVED',
                    version: 1,
                    severity: 'BLOCKER',
                    text: 'Updated fix',
                    properties: {},
                },
            );
            expect(result.content).toBe('Updated fix');
            expect(result.isComplete).toBe(true); // RESOLVED state maps to isComplete: true
        });
    });

    describe('deleteTask', () => {
        const mockTask = {
            commentId: 'comment1',
            creator: mockUser,
            created: '2023-01-01T00:00:00Z',
            updated: '2023-01-01T00:00:00Z',
            isComplete: false,
            editable: true,
            deletable: true,
            id: 'task1',
            content: 'Fix this',
            version: 1,
        };

        it('should delete task when no errors occur', async () => {
            mockDelete.mockResolvedValue({});

            await api.deleteTask(mockSite, '123', mockTask);

            expect(mockDelete).toHaveBeenCalledTimes(1);
        });

        it('should use v8 API when available', async () => {
            mockDelete.mockResolvedValue({});

            await api.deleteTask(mockSite, '123', mockTask);

            expect(mockDelete).toHaveBeenCalledWith(
                '/rest/api/1.0/projects/testproject/repos/testrepo/pull-requests/123/comments/comment1',
                {},
                { version: 1 },
            );
        });
    });

    describe('convertDataToTask_v8', () => {
        it('should convert v8 task data correctly', () => {
            const taskData = {
                id: 'task1',
                text: 'Fix this issue',
                state: 'OPEN',
                author: { slug: 'testuser', displayName: 'Test User' },
                createdDate: '2023-01-01T00:00:00Z',
                updatedDate: '2023-01-02T00:00:00Z',
                version: 2,
                permittedOperations: { editable: true, deletable: true },
            };

            const result = api.convertDataToTask_v8(taskData, mockSite);

            expect(result).toEqual({
                commentId: 'task1',
                creator: {
                    accountId: 'testuser',
                    displayName: 'Test User',
                    userName: 'testuser',
                    emailAddress: undefined,
                    url: undefined,
                    avatarUrl: undefined,
                    mention: '@testuser',
                },
                created: '2023-01-01T00:00:00Z',
                updated: '2023-01-02T00:00:00Z',
                isComplete: false,
                editable: true,
                deletable: true,
                id: 'task1',
                content: 'Fix this issue',
                version: 2,
            });
        });

        it('should handle completed tasks', () => {
            const taskData = {
                id: 'task1',
                text: 'Fix this issue',
                state: 'RESOLVED',
                author: { slug: 'testuser', displayName: 'Test User' },
                createdDate: '2023-01-01T00:00:00Z',
                updatedDate: '2023-01-02T00:00:00Z',
                version: 2,
                permittedOperations: { editable: false, deletable: false },
            };

            const result = api.convertDataToTask_v8(taskData, mockSite);

            expect(result.isComplete).toBe(true);
            expect(result.editable).toBe(false);
            expect(result.deletable).toBe(false);
        });

        it('should handle missing author', () => {
            const taskData = {
                id: 'task1',
                text: 'Fix this issue',
                state: 'OPEN',
                author: { slug: '', displayName: '', emailAddress: undefined },
                createdDate: '2023-01-01T00:00:00Z',
                updatedDate: '2023-01-02T00:00:00Z',
                version: 2,
                permittedOperations: { editable: true, deletable: true },
            };

            const result = api.convertDataToTask_v8(taskData, mockSite);

            expect(result.creator).toEqual({
                accountId: '',
                displayName: '',
                emailAddress: undefined,
                url: undefined,
                avatarUrl: undefined,
                mention: '@',
                userName: '',
            });
        });
    });

    describe('convertDataToTask', () => {
        it('should convert v0 task data correctly', () => {
            const taskData = {
                id: 'task1',
                text: 'Fix this issue',
                state: 'OPEN',
                author: { slug: 'testuser', displayName: 'Test User' },
                createdDate: '2023-01-01T00:00:00Z',
                anchor: { id: 'comment1' },
                permittedOperations: { editable: true, deletable: true },
            };

            const result = api.convertDataToTask(taskData, mockSite);

            expect(result).toEqual({
                commentId: 'comment1',
                creator: {
                    accountId: 'testuser',
                    displayName: 'Test User',
                    userName: 'testuser',
                    emailAddress: undefined,
                    url: undefined,
                    avatarUrl: undefined,
                    mention: '@testuser',
                },
                created: '2023-01-01T00:00:00Z',
                updated: '2023-01-01T00:00:00Z', // Same as created for v0
                isComplete: false,
                editable: true,
                deletable: true,
                id: 'task1',
                content: 'Fix this issue',
            });
        });

        it('should handle completed tasks in v0 format', () => {
            const taskData = {
                id: 'task1',
                text: 'Fix this issue',
                state: 'RESOLVED',
                author: { slug: 'testuser', displayName: 'Test User' },
                createdDate: '2023-01-01T00:00:00Z',
                anchor: { id: 'comment1' },
                permittedOperations: { editable: false, deletable: false },
            };

            const result = api.convertDataToTask(taskData, mockSite);

            expect(result.isComplete).toBe(true);
            expect(result.editable).toBe(false);
            expect(result.deletable).toBe(false);
        });

        it('should handle task ownership correctly', () => {
            const taskData = {
                id: 'task1',
                text: 'Fix this issue',
                state: 'OPEN',
                author: { slug: 'otheruser', displayName: 'Other User' },
                createdDate: '2023-01-01T00:00:00Z',
                anchor: { id: 'comment1' },
                permittedOperations: { editable: true, deletable: true },
            };

            const result = api.convertDataToTask(taskData, mockSite);

            // Since the author is 'otheruser' but site.details.userId is 'testuser',
            // editable and deletable should be false
            expect(result.editable).toBe(false);
            expect(result.deletable).toBe(false);
        });
    });

    describe('getCurrentUser', () => {
        it('should fetch current user data', async () => {
            const mockResponse = {
                data: {
                    slug: 'testuser',
                    displayName: 'Test User',
                    emailAddress: 'test@example.com',
                    name: 'testuser',
                    links: { self: [{ href: 'http://example.com/users/testuser' }] },
                    avatarUrl: '/avatar.png',
                },
            };

            mockGet.mockResolvedValue(mockResponse);

            const result = await api.getCurrentUser(mockSite.details);

            expect(mockGet).toHaveBeenCalledWith('/rest/api/1.0/users/testuser', {
                markup: true,
                avatarSize: 64,
            });
            expect(result.accountId).toBe('testuser');
            expect(result.displayName).toBe('Test User');
            expect(result.userName).toBe('testuser');
            expect(result.emailAddress).toBe('test@example.com');
            expect(result.url).toBe('http://example.com/users/testuser');
            expect(result.avatarUrl).toBe('https://bitbucket.example.com/avatar.png');
            expect(result.mention).toBe('@testuser');
        });

        it('should handle user data without name property', async () => {
            const mockResponse = {
                data: {
                    slug: 'testuser',
                    displayName: 'Test User',
                    emailAddress: 'test@example.com',
                    // name property missing - should fallback to slug
                    links: { self: [{ href: 'http://example.com/users/testuser' }] },
                    avatarUrl: '/avatar.png',
                },
            };

            mockGet.mockResolvedValue(mockResponse);

            const result = await api.getCurrentUser(mockSite.details);

            expect(result.userName).toBe('testuser'); // Should fallback to slug
        });

        it('should handle missing links', async () => {
            const mockResponse = {
                data: {
                    slug: 'testuser',
                    displayName: 'Test User',
                    emailAddress: 'test@example.com',
                    name: 'testuser',
                    // links missing
                    avatarUrl: '/avatar.png',
                },
            };

            mockGet.mockResolvedValue(mockResponse);

            const result = await api.getCurrentUser(mockSite.details);

            expect(result.url).toBeUndefined();
        });
    });

    // ...existing code...
});

const getTaskCountDataV8 = {
    data: {
        OPEN: 5,
    },
    headers: {},
};

const getPullRequestData = {
    id: 1,
    version: 4,
    title: 'a change',
    description: 'some words\\\n\\\nI can change the description\\\n\\\nChange me',
    state: 'OPEN',
    open: true,
    closed: false,
    draft: false,
    createdDate: 1739222096918,
    updatedDate: 1739329991386,
    fromRef: {
        id: 'refs/heads/testing-3',
        displayId: 'testing-3',
        latestCommit: 'b70a6199c92a978bf9a4862e1b96c9301400cbfa',
        type: 'BRANCH',
        repository: {
            slug: 'testing-axon',
            id: 1,
            name: 'testing-axon',
            hierarchyId: '451f980d695b670538b0',
            scmId: 'git',
            state: 'AVAILABLE',
            statusMessage: 'Available',
            forkable: true,
            project: {
                key: 'AX',
                id: 1,
                name: 'axon-test',
                public: false,
                type: 'NORMAL',
                links: {
                    self: [
                        {
                            href: 'https://instenv-452647-24mv.instenv.internal.atlassian.com/projects/AX',
                        },
                    ],
                },
                avatarUrl: '/projects/AX/avatar.png?s=64&v=1735870958971',
            },
            public: false,
            archived: false,
            links: {
                clone: [
                    {
                        href: 'https://instenv-452647-24mv.instenv.internal.atlassian.com/scm/ax/testing-axon.git',
                        name: 'http',
                    },
                    {
                        href: 'ssh://git@instenv-452647-24mv-alt-3a61ca65736a0f8b.elb.us-east-1.amazonaws.com:7999/ax/testing-axon.git',
                        name: 'ssh',
                    },
                ],
                self: [
                    {
                        href: 'https://instenv-452647-24mv.instenv.internal.atlassian.com/projects/AX/repos/testing-axon/browse',
                    },
                ],
            },
        },
    },
    toRef: {
        id: 'refs/heads/main',
        displayId: 'main',
        latestCommit: 'de320695ae3092a489bcb31da5a8c8bb75d833a1',
        type: 'BRANCH',
        repository: {
            slug: 'testing-axon',
            id: 1,
            name: 'testing-axon',
            hierarchyId: '451f980d695b670538b0',
            scmId: 'git',
            state: 'AVAILABLE',
            statusMessage: 'Available',
            forkable: true,
            project: {
                key: 'AX',
                id: 1,
                name: 'axon-test',
                public: false,
                type: 'NORMAL',
                links: {
                    self: [
                        {
                            href: 'https://instenv-452647-24mv.instenv.internal.atlassian.com/projects/AX',
                        },
                    ],
                },
                avatarUrl: '/projects/AX/avatar.png?s=64&v=1735870958971',
            },
            public: false,
            archived: false,
            links: {
                clone: [
                    {
                        href: 'https://instenv-452647-24mv.instenv.internal.atlassian.com/scm/ax/testing-axon.git',
                        name: 'http',
                    },
                    {
                        href: 'ssh://git@instenv-452647-24mv-alt-3a61ca65736a0f8b.elb.us-east-1.amazonaws.com:7999/ax/testing-axon.git',
                        name: 'ssh',
                    },
                ],
                self: [
                    {
                        href: 'https://instenv-452647-24mv.instenv.internal.atlassian.com/projects/AX/repos/testing-axon/browse',
                    },
                ],
            },
        },
    },
    locked: false,
    author: {
        user: {
            name: 'admin',
            emailAddress: 'admin@admin.com',
            active: true,
            displayName: 'Ansible Admin',
            id: 2,
            slug: 'admin',
            type: 'NORMAL',
            links: {
                self: [
                    {
                        href: 'https://instenv-452647-24mv.instenv.internal.atlassian.com/users/admin',
                    },
                ],
            },
            avatarUrl: 'https://secure.gravatar.com/avatar/64e1b8d34f425d19e1ee2ea7236d3028.jpg?s=64&d=mm',
        },
        role: 'AUTHOR',
        approved: false,
        status: 'UNAPPROVED',
    },
    reviewers: [],
    participants: [],
    links: {
        self: [
            {
                href: 'https://instenv-452647-24mv.instenv.internal.atlassian.com/projects/AX/repos/testing-axon/pull-requests/1',
            },
        ],
    },
    descriptionAsHtml: '<p>some words<br />\n<br />\nI can change the description<br />\n<br />\nChange me</p>\n',
};
