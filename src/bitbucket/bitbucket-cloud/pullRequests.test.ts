import { CancelToken } from 'axios';
import PQueue from 'p-queue/dist';

import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { configuration } from '../../config/configuration';
import { Logger } from '../../logger';
import { CacheMap } from '../../util/cachemap';
import { HTTPClient } from '../httpClient';
import {
    BitbucketSite,
    CreatePullRequestData,
    FileStatus,
    PaginatedPullRequests,
    PullRequest,
    User,
    WorkspaceRepo,
} from '../model';
import { CloudPullRequestApi, maxItemsSupported } from './pullRequests';
import { CloudRepositoriesApi } from './repositories';

// Mock dependencies
jest.mock('../../config/configuration');
jest.mock('../../logger');
jest.mock('../../util/cachemap');
jest.mock('../httpClient');
jest.mock('./repositories');
jest.mock('p-queue/dist');

describe('CloudPullRequestApi', () => {
    let api: CloudPullRequestApi;
    let mockHttpClient: jest.Mocked<HTTPClient>;
    let mockCacheMap: jest.Mocked<CacheMap>;
    let mockQueue: jest.Mocked<PQueue>;

    const mockSite: BitbucketSite = {
        details: {
            id: 'test-site-id',
            name: 'Test Site',
            host: 'bitbucket.org',
            avatarUrl: 'https://avatar.url',
            baseLinkUrl: 'https://bitbucket.org',
            baseApiUrl: 'https://api.bitbucket.org',
            product: { name: 'Bitbucket', key: 'bitbucket' },
            isCloud: true,
            userId: 'test-user-id',
            credentialId: 'test-credential-id',
        } as DetailedSiteInfo,
        ownerSlug: 'test-owner',
        repoSlug: 'test-repo',
    };

    const mockWorkspaceRepo: WorkspaceRepo = {
        rootUri: '/test/repo',
        mainSiteRemote: {
            site: mockSite,
            remote: {
                name: 'origin',
                fetchUrl: 'https://bitbucket.org/test-owner/test-repo.git',
                isReadOnly: false,
            },
        },
        siteRemotes: [],
    };

    const mockUser: User = {
        accountId: 'test-account-id',
        displayName: 'Test User',
        userName: 'testuser',
        emailAddress: 'test@example.com',
        url: 'https://bitbucket.org/testuser',
        avatarUrl: 'https://bitbucket.org/avatar.png',
        mention: '@[Test User](account_id:test-account-id)',
    };

    const mockPullRequest: PullRequest = {
        site: mockSite,
        workspaceRepo: mockWorkspaceRepo,
        data: {
            siteDetails: mockSite.details,
            id: '123',
            version: 1,
            url: 'https://bitbucket.org/test-owner/test-repo/pull-requests/123',
            author: mockUser,
            participants: [],
            source: {
                repo: {
                    id: 'test-repo-id',
                    name: 'test-repo',
                    displayName: 'Test Repo',
                    fullName: 'test-owner/test-repo',
                    url: 'https://bitbucket.org/test-owner/test-repo',
                    avatarUrl: '',
                    issueTrackerEnabled: true,
                },
                branchName: 'feature-branch',
                commitHash: 'abc123',
            },
            destination: {
                repo: {
                    id: 'test-repo-id-2',
                    name: 'test-repo',
                    displayName: 'Test Repo',
                    fullName: 'test-owner/test-repo',
                    url: 'https://bitbucket.org/test-owner/test-repo',
                    avatarUrl: '',
                    issueTrackerEnabled: true,
                },
                branchName: 'main',
                commitHash: 'def456',
            },
            title: 'Test PR',
            htmlSummary: '<p>Test summary</p>',
            rawSummary: 'Test summary',
            ts: '2023-01-01T00:00:00Z',
            updatedTs: '2023-01-01T12:00:00Z',
            state: 'OPEN',
            closeSourceBranch: false,
            taskCount: 0,
            draft: false,
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockHttpClient = {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
            getRaw: jest.fn(),
            getUrl: jest.fn(),
            getArrayBuffer: jest.fn(),
            getOctetStream: jest.fn(),
            generateUrl: jest.fn(),
        } as unknown as jest.Mocked<HTTPClient>;

        mockCacheMap = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            getItems: jest.fn(),
            updateItem: jest.fn(),
            deleteItem: jest.fn(),
            clear: jest.fn(),
        } as unknown as jest.Mocked<CacheMap>;

        mockQueue = {
            add: jest.fn().mockImplementation((fn) => fn()),
            concurrency: 1,
        } as unknown as jest.Mocked<PQueue>;

        (CacheMap as jest.MockedClass<typeof CacheMap>).mockImplementation(() => mockCacheMap);
        (PQueue as jest.MockedClass<typeof PQueue>).mockImplementation(() => mockQueue);

        api = new CloudPullRequestApi(mockHttpClient);

        // Mock the private methods that cause issues
        jest.spyOn(api as any, 'getRecentPullRequestsParticipants').mockResolvedValue([]);
        jest.spyOn(api as any, 'getTeamMembers').mockResolvedValue([]);
    });

    describe('constructor', () => {
        it('should initialize with HTTP client and create caches and queue', () => {
            expect(api).toBeInstanceOf(CloudPullRequestApi);
            expect(CacheMap).toHaveBeenCalledTimes(3); // defaultReviewersCache, teamMembersCache, fileContentCache
            expect(PQueue).toHaveBeenCalledWith({ concurrency: 1 });
        });
    });

    describe('getCurrentUser', () => {
        it('should fetch and convert current user data', async () => {
            const mockApiResponse = {
                data: {
                    account_id: 'test-id',
                    display_name: 'Test User',
                    links: {
                        avatar: { href: 'https://avatar.url' },
                        html: { href: 'https://user.url' },
                    },
                },
            };

            mockHttpClient.get.mockResolvedValue(mockApiResponse);

            const result = await api.getCurrentUser(mockSite.details);

            expect(mockHttpClient.get).toHaveBeenCalledWith('/user');
            expect(result).toEqual({
                accountId: 'test-id',
                avatarUrl: 'https://avatar.url',
                emailAddress: undefined,
                userName: undefined,
                displayName: 'Test User',
                url: 'https://user.url',
                mention: '@[Test User](account_id:test-id)',
            });
        });
    });

    describe('toUserModel', () => {
        it('should convert API user data to User model', () => {
            const input = {
                account_id: 'test-id',
                display_name: 'Test User',
                links: {
                    avatar: { href: 'https://avatar.url' },
                    html: { href: 'https://user.url' },
                },
            };

            const result = CloudPullRequestApi.toUserModel(input);

            expect(result).toEqual({
                accountId: 'test-id',
                avatarUrl: 'https://avatar.url',
                emailAddress: undefined,
                userName: undefined,
                displayName: 'Test User',
                url: 'https://user.url',
                mention: '@[Test User](account_id:test-id)',
            });
        });

        it('should handle missing data with defaults', () => {
            const input = {};

            const result = CloudPullRequestApi.toUserModel(input);

            expect(result).toEqual({
                accountId: 'unknown',
                avatarUrl: '',
                emailAddress: undefined,
                userName: undefined,
                displayName: 'Unknown User',
                url: '',
                mention: '@[Unknown User](account_id:unknown)',
            });
        });
    });

    describe('getList', () => {
        it('should fetch and convert pull requests', async () => {
            const mockApiResponse = {
                data: {
                    values: [
                        {
                            id: '123',
                            title: 'Test PR',
                            author: { account_id: 'author-id', display_name: 'Author' },
                            participants: [],
                            source: {
                                repository: { full_name: 'owner/repo' },
                                branch: { name: 'feature' },
                                commit: { hash: 'abc123' },
                            },
                            destination: {
                                repository: { full_name: 'owner/repo' },
                                branch: { name: 'main' },
                                commit: { hash: 'def456' },
                            },
                            state: 'OPEN',
                            created_on: '2023-01-01T00:00:00Z',
                            updated_on: '2023-01-01T12:00:00Z',
                            links: { html: { href: 'https://pr.url' } },
                        },
                    ],
                    next: 'https://api.bitbucket.org/next',
                },
            };

            mockHttpClient.get.mockResolvedValue(mockApiResponse);

            const result = await api.getList(mockWorkspaceRepo);

            expect(mockHttpClient.get).toHaveBeenCalledWith('/repositories/test-owner/test-repo/pullrequests', {
                pagelen: 25,
                fields: '+values.participants,+values.rendered.*',
            });
            expect(result.data).toHaveLength(1);
            expect(result.next).toBe('https://api.bitbucket.org/next');
        });

        it('should return empty data when no site is available', async () => {
            const workspaceRepoWithoutSite = {
                ...mockWorkspaceRepo,
                mainSiteRemote: { ...mockWorkspaceRepo.mainSiteRemote, site: undefined },
            };

            const result = await api.getList(workspaceRepoWithoutSite);

            expect(result.data).toEqual([]);
            expect(mockHttpClient.get).not.toHaveBeenCalled();
        });

        it('should pass query parameters correctly', async () => {
            mockHttpClient.get.mockResolvedValue({ data: { values: [] } });

            await api.getList(mockWorkspaceRepo, {
                pagelen: 50,
                sort: '-created_on',
                q: 'state="OPEN"',
            });

            expect(mockHttpClient.get).toHaveBeenCalledWith('/repositories/test-owner/test-repo/pullrequests', {
                pagelen: 50,
                sort: '-created_on',
                q: 'state="OPEN"',
                fields: '+values.participants,+values.rendered.*',
            });
        });
    });

    describe('getListCreatedByMe', () => {
        it('should fetch PRs created by current user', async () => {
            mockHttpClient.get.mockResolvedValue({ data: { values: [] } });

            await api.getListCreatedByMe(mockWorkspaceRepo);

            expect(mockHttpClient.get).toHaveBeenCalledWith('/repositories/test-owner/test-repo/pullrequests', {
                pagelen: 25,
                fields: '+values.participants,+values.rendered.*',
                q: 'state="OPEN" and author.account_id="test-user-id"',
            });
        });
    });

    describe('getListToReview', () => {
        it('should fetch PRs to review and filter reviewed ones when config is false', async () => {
            const mockApiResponse = {
                data: {
                    values: [
                        {
                            id: '123',
                            participants: [{ user: { account_id: 'test-user-id' }, state: 'approved' }],
                            // ...other required fields
                            author: { account_id: 'author-id', display_name: 'Author' },
                            source: {
                                repository: { full_name: 'owner/repo' },
                                branch: { name: 'feature' },
                                commit: { hash: 'abc123' },
                            },
                            destination: {
                                repository: { full_name: 'owner/repo' },
                                branch: { name: 'main' },
                                commit: { hash: 'def456' },
                            },
                            state: 'OPEN',
                            created_on: '2023-01-01T00:00:00Z',
                            updated_on: '2023-01-01T12:00:00Z',
                            links: { html: { href: 'https://pr.url' } },
                        },
                    ],
                },
            };

            mockHttpClient.get.mockResolvedValue(mockApiResponse);
            (configuration.get as jest.Mock).mockReturnValue(false);

            const result = await api.getListToReview(mockWorkspaceRepo);

            expect(result.data).toHaveLength(0); // Filtered out because user has APPROVED status
        });

        it('should include all PRs when showReviewedPullRequests config is true', async () => {
            mockHttpClient.get.mockResolvedValue({ data: { values: [] } });
            (configuration.get as jest.Mock).mockReturnValue(true);

            await api.getListToReview(mockWorkspaceRepo);

            expect(configuration.get).toHaveBeenCalledWith('bitbucket.explorer.showReviewedPullRequests');
        });
    });

    describe('getListMerged', () => {
        it('should fetch merged PRs', async () => {
            mockHttpClient.get.mockResolvedValue({ data: { values: [] } });

            await api.getListMerged(mockWorkspaceRepo);

            expect(mockHttpClient.get).toHaveBeenCalledWith('/repositories/test-owner/test-repo/pullrequests', {
                pagelen: 25,
                fields: '+values.participants,+values.rendered.*',
                q: 'state="MERGED"',
            });
        });
    });

    describe('getListDeclined', () => {
        it('should fetch declined PRs', async () => {
            mockHttpClient.get.mockResolvedValue({ data: { values: [] } });

            await api.getListDeclined(mockWorkspaceRepo);

            expect(mockHttpClient.get).toHaveBeenCalledWith('/repositories/test-owner/test-repo/pullrequests', {
                pagelen: 25,
                fields: '+values.participants,+values.rendered.*',
                q: 'state="DECLINED"',
            });
        });
    });

    describe('nextPage', () => {
        it('should fetch next page of PRs', async () => {
            const paginatedPRs: PaginatedPullRequests = {
                workspaceRepo: mockWorkspaceRepo,
                site: mockSite,
                data: [],
                next: 'https://api.bitbucket.org/next',
            };

            mockHttpClient.get.mockResolvedValue({
                data: {
                    values: [],
                    next: 'https://api.bitbucket.org/next2',
                },
            });

            const result = await api.nextPage(paginatedPRs);

            expect(mockHttpClient.get).toHaveBeenCalledWith('https://api.bitbucket.org/next');
            expect(result.next).toBe('https://api.bitbucket.org/next2');
        });

        it('should return undefined next when no next page', async () => {
            const paginatedPRs: PaginatedPullRequests = {
                workspaceRepo: mockWorkspaceRepo,
                site: mockSite,
                data: [],
                next: undefined,
            };

            const result = await api.nextPage(paginatedPRs);

            expect(result.next).toBeUndefined();
            expect(mockHttpClient.get).not.toHaveBeenCalled();
        });
    });

    describe('get', () => {
        it('should fetch a specific PR by ID', async () => {
            const mockApiResponse = {
                data: {
                    id: '123',
                    title: 'Test PR',
                    author: { account_id: 'author-id', display_name: 'Author' },
                    participants: [],
                    source: {
                        repository: { full_name: 'owner/repo' },
                        branch: { name: 'feature' },
                        commit: { hash: 'abc123' },
                    },
                    destination: {
                        repository: { full_name: 'owner/repo' },
                        branch: { name: 'main' },
                        commit: { hash: 'def456' },
                    },
                    state: 'OPEN',
                    created_on: '2023-01-01T00:00:00Z',
                    updated_on: '2023-01-01T12:00:00Z',
                    links: { html: { href: 'https://pr.url' } },
                },
            };

            mockHttpClient.get.mockResolvedValue(mockApiResponse);

            const result = await api.get(mockSite, '123', mockWorkspaceRepo);

            expect(mockHttpClient.get).toHaveBeenCalledWith('/repositories/test-owner/test-repo/pullrequests/123');
            expect(result.data.id).toBe('123');
        });
    });

    describe('getMergeStrategies', () => {
        it('should fetch merge strategies for a PR', async () => {
            const mockApiResponse = {
                data: {
                    destination: {
                        branch: {
                            merge_strategies: ['merge_commit', 'squash', 'fast_forward'],
                            default_merge_strategy: 'squash',
                        },
                    },
                },
            };

            mockHttpClient.get.mockResolvedValue(mockApiResponse);

            const result = await api.getMergeStrategies(mockPullRequest);

            expect(mockHttpClient.get).toHaveBeenCalledWith('/repositories/test-owner/test-repo/pullrequests/123', {
                fields: 'destination.branch.merge_strategies,destination.branch.default_merge_strategy',
            });
            expect(result).toEqual([
                { label: 'Merge commit', value: 'merge_commit', isDefault: false },
                { label: 'Squash', value: 'squash', isDefault: true },
                { label: 'Fast forward', value: 'fast_forward', isDefault: false },
            ]);
        });
    });

    describe('getConflictedFiles', () => {
        it('should fetch conflicted files for TOPIC diff type', async () => {
            const prTypeResponse = { data: { diff_type: 'TOPIC' } };
            const conflictResponse = { data: [{ path: 'file1.txt' }, { path: 'file2.txt' }] };

            mockHttpClient.get.mockResolvedValueOnce(prTypeResponse).mockResolvedValueOnce(conflictResponse);

            const result = await api.getConflictedFiles(mockPullRequest);

            expect(result).toEqual(['file1.txt', 'file2.txt']);
            expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
        });

        it('should return empty array for non-TOPIC diff type', async () => {
            const prTypeResponse = { data: { diff_type: 'REGULAR' } };

            mockHttpClient.get.mockResolvedValueOnce(prTypeResponse);

            const result = await api.getConflictedFiles(mockPullRequest);

            expect(result).toEqual([]);
            expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
        });

        it('should handle API errors gracefully', async () => {
            mockHttpClient.get.mockRejectedValue(new Error('API Error'));

            const result = await api.getConflictedFiles(mockPullRequest);

            expect(result).toEqual([]);
            expect(Logger.error).toHaveBeenCalled();
        });
    });

    describe('getChangedFiles', () => {
        it('should fetch changed files for a PR', async () => {
            const mockApiResponse = {
                data: {
                    values: [
                        {
                            old: { path: 'old-file.txt' },
                            new: { path: 'new-file.txt' },
                            lines_added: 10,
                            lines_removed: 5,
                            status: 'modified',
                        },
                    ],
                    next: undefined,
                },
            };

            mockHttpClient.get.mockResolvedValue(mockApiResponse);

            const result = await api.getChangedFiles(mockPullRequest);

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/pullrequests/123/diffstat',
            );
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                linesAdded: 10,
                linesRemoved: 5,
                status: FileStatus.MODIFIED,
                oldPath: 'old-file.txt',
                newPath: 'new-file.txt',
            });
        });

        it('should handle pagination for changed files', async () => {
            const firstPageResponse = {
                data: {
                    values: [{ status: 'added', lines_added: 5, lines_removed: 0 }],
                    next: 'https://api.bitbucket.org/next',
                },
            };
            const secondPageResponse = {
                data: {
                    values: [{ status: 'removed', lines_added: 0, lines_removed: 3 }],
                    next: undefined,
                },
            };

            mockHttpClient.get.mockResolvedValueOnce(firstPageResponse).mockResolvedValueOnce(secondPageResponse);

            const result = await api.getChangedFiles(mockPullRequest);

            expect(result).toHaveLength(2);
            expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
        });

        it('should use spec parameter when provided', async () => {
            mockHttpClient.get.mockResolvedValue({ data: { values: [] } });

            await api.getChangedFiles(mockPullRequest, 'abc123..def456');

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/diffstat/abc123..def456',
            );
        });

        it('should handle API errors gracefully', async () => {
            mockHttpClient.get.mockRejectedValue(new Error('API Error'));

            const result = await api.getChangedFiles(mockPullRequest);

            expect(result).toEqual([]);
            expect(Logger.error).toHaveBeenCalled();
        });
    });

    describe('mapStatusWordsToFileStatus', () => {
        it('should map status words to FileStatus enum correctly', () => {
            const api = new CloudPullRequestApi(mockHttpClient);

            expect(api['mapStatusWordsToFileStatus']('added')).toBe(FileStatus.ADDED);
            expect(api['mapStatusWordsToFileStatus']('removed')).toBe(FileStatus.DELETED);
            expect(api['mapStatusWordsToFileStatus']('modified')).toBe(FileStatus.MODIFIED);
            expect(api['mapStatusWordsToFileStatus']('renamed')).toBe(FileStatus.RENAMED);
            expect(api['mapStatusWordsToFileStatus']('merge conflict')).toBe(FileStatus.CONFLICT);
            expect(api['mapStatusWordsToFileStatus']('unknown')).toBe(FileStatus.UNKNOWN);
        });
    });

    describe('getCommits', () => {
        it('should fetch commits for a PR', async () => {
            const mockApiResponse = {
                data: {
                    values: [
                        {
                            hash: 'abc123',
                            message: 'Test commit',
                            date: '2023-01-01T00:00:00Z',
                            links: { html: { href: 'https://commit.url' } },
                            summary: { html: '<p>Summary</p>', raw: 'Summary' },
                            author: {
                                user: {
                                    account_id: 'author-id',
                                    display_name: 'Author',
                                },
                            },
                            parents: [{ hash: 'parent123' }],
                        },
                    ],
                    next: undefined,
                },
            };

            mockHttpClient.get.mockResolvedValue(mockApiResponse);

            const result = await api.getCommits(mockPullRequest);

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/pullrequests/123/commits',
                { pagelen: maxItemsSupported.commits },
            );
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                hash: 'abc123',
                message: 'Test commit',
                ts: '2023-01-01T00:00:00Z',
                url: 'https://commit.url',
                htmlSummary: '<p>Summary</p>',
                rawSummary: 'Summary',
                parentHashes: ['parent123'],
            });
        });

        it('should handle pagination for commits', async () => {
            const firstPageResponse = {
                data: {
                    values: [
                        {
                            hash: 'abc123',
                            message: 'Commit 1',
                            date: '2023-01-01T00:00:00Z',
                            links: { html: { href: 'url1' } },
                            author: { user: {} },
                            parents: [],
                        },
                    ],
                    next: 'https://api.bitbucket.org/next',
                },
            };
            const secondPageResponse = {
                data: {
                    values: [
                        {
                            hash: 'def456',
                            message: 'Commit 2',
                            date: '2023-01-02T00:00:00Z',
                            links: { html: { href: 'url2' } },
                            author: { user: {} },
                            parents: [],
                        },
                    ],
                    next: undefined,
                },
            };

            mockHttpClient.get.mockResolvedValueOnce(firstPageResponse).mockResolvedValueOnce(secondPageResponse);

            const result = await api.getCommits(mockPullRequest);

            expect(result).toHaveLength(2);
            expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
        });

        it('should return empty array when no commits', async () => {
            mockHttpClient.get.mockResolvedValue({ data: {} });

            const result = await api.getCommits(mockPullRequest);

            expect(result).toEqual([]);
        });
    });

    describe('deleteComment', () => {
        it('should delete a PR comment', async () => {
            await api.deleteComment(mockSite, '123', 'comment-456');

            expect(mockHttpClient.delete).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/pullrequests/123/comments/comment-456',
                {},
            );
        });

        it('should delete a commit comment when commitHash is provided', async () => {
            await api.deleteComment(mockSite, '123', 'comment-456', 'commit-hash');

            expect(mockHttpClient.delete).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/commit/commit-hash/comments/comment-456',
                {},
            );
        });
    });

    describe('editComment', () => {
        it('should edit a PR comment', async () => {
            const mockApiResponse = {
                data: {
                    id: 'comment-456',
                    content: { html: '<p>Edited content</p>', raw: 'Edited content' },
                    created_on: '2023-01-01T00:00:00Z',
                    updated_on: '2023-01-01T12:00:00Z',
                    user: { account_id: 'user-id', display_name: 'User' },
                },
            };

            mockHttpClient.put.mockResolvedValue(mockApiResponse);

            const result = await api.editComment(mockSite, '123', 'Edited content', 'comment-456');

            expect(mockHttpClient.put).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/pullrequests/123/comments/comment-456',
                { content: { raw: 'Edited content' } },
            );
            expect(result.id).toBe('comment-456');
        });

        it('should edit a commit comment when commitHash is provided', async () => {
            const mockApiResponse = { data: { id: 'comment-456', content: {}, user: {} } };
            mockHttpClient.put.mockResolvedValue(mockApiResponse);

            await api.editComment(mockSite, '123', 'Edited content', 'comment-456', 'commit-hash');

            expect(mockHttpClient.put).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/commit/commit-hash/comments/comment-456',
                { content: { raw: 'Edited content' } },
            );
        });
    });

    describe('updateApproval', () => {
        it('should approve a PR', async () => {
            const result = await api.updateApproval(mockPullRequest, 'APPROVED');

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/pullrequests/123/approve',
                {},
            );
            expect(result).toBe('APPROVED');
        });

        it('should request changes on a PR', async () => {
            const result = await api.updateApproval(mockPullRequest, 'CHANGES_REQUESTED');

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/pullrequests/123/request-changes',
                {},
            );
            expect(result).toBe('CHANGES_REQUESTED');
        });

        it('should remove changes request', async () => {
            const result = await api.updateApproval(mockPullRequest, 'NO_CHANGES_REQUESTED');

            expect(mockHttpClient.delete).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/pullrequests/123/request-changes',
                {},
            );
            expect(result).toBe('UNAPPROVED');
        });

        it('should unapprove a PR', async () => {
            const result = await api.updateApproval(mockPullRequest, 'UNAPPROVED');

            expect(mockHttpClient.delete).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/pullrequests/123/approve',
                {},
            );
            expect(result).toBe('UNAPPROVED');
        });

        it('should return UNAPPROVED for unknown status', async () => {
            const result = await api.updateApproval(mockPullRequest, 'UNKNOWN_STATUS');

            expect(result).toBe('UNAPPROVED');
            expect(mockHttpClient.post).not.toHaveBeenCalled();
            expect(mockHttpClient.delete).not.toHaveBeenCalled();
        });
    });

    describe('merge', () => {
        it('should merge a PR with default options', async () => {
            const mockApiResponse = {
                data: {
                    ...mockPullRequest.data,
                    id: '123',
                    author: { account_id: 'author-id', display_name: 'Author' },
                    participants: [],
                    source: {
                        repository: { full_name: 'owner/repo' },
                        branch: { name: 'feature' },
                        commit: { hash: 'abc123' },
                    },
                    destination: {
                        repository: { full_name: 'owner/repo' },
                        branch: { name: 'main' },
                        commit: { hash: 'def456' },
                    },
                    links: { html: { href: 'https://pr.url' } },
                },
            };
            mockHttpClient.post.mockResolvedValue(mockApiResponse);

            const result = await api.merge(mockPullRequest);

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/pullrequests/123/merge',
                {},
            );
            expect(result.data.id).toBe('123');
        });

        it('should merge a PR with close source branch option', async () => {
            const mockApiResponse = {
                data: {
                    ...mockPullRequest.data,
                    id: '123',
                    author: { account_id: 'author-id', display_name: 'Author' },
                    participants: [],
                    source: {
                        repository: { full_name: 'owner/repo' },
                        branch: { name: 'feature' },
                        commit: { hash: 'abc123' },
                    },
                    destination: {
                        repository: { full_name: 'owner/repo' },
                        branch: { name: 'main' },
                        commit: { hash: 'def456' },
                    },
                    links: { html: { href: 'https://pr.url' } },
                },
            };
            mockHttpClient.post.mockResolvedValue(mockApiResponse);

            await api.merge(mockPullRequest, true);

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/pullrequests/123/merge',
                { close_source_branch: true },
            );
        });

        it('should merge a PR with merge strategy and commit message', async () => {
            const mockApiResponse = {
                data: {
                    ...mockPullRequest.data,
                    id: '123',
                    author: { account_id: 'author-id', display_name: 'Author' },
                    participants: [],
                    source: {
                        repository: { full_name: 'owner/repo' },
                        branch: { name: 'feature' },
                        commit: { hash: 'abc123' },
                    },
                    destination: {
                        repository: { full_name: 'owner/repo' },
                        branch: { name: 'main' },
                        commit: { hash: 'def456' },
                    },
                    links: { html: { href: 'https://pr.url' } },
                },
            };
            mockHttpClient.post.mockResolvedValue(mockApiResponse);

            await api.merge(mockPullRequest, true, 'squash', 'Custom commit message');

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/pullrequests/123/merge',
                {
                    close_source_branch: true,
                    merge_strategy: 'squash',
                    message: 'Custom commit message',
                },
            );
        });
    });

    describe('postComment', () => {
        it('should post a new comment', async () => {
            const mockApiResponse = {
                data: {
                    id: 'comment-123',
                    content: { html: '<p>New comment</p>', raw: 'New comment' },
                    created_on: '2023-01-01T00:00:00Z',
                    updated_on: '2023-01-01T00:00:00Z',
                    user: { account_id: 'user-id', display_name: 'User' },
                },
            };

            mockHttpClient.post.mockResolvedValue(mockApiResponse);

            const result = await api.postComment(mockSite, '123', 'New comment', '');

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/pullrequests/123/comments',
                {
                    parent: undefined,
                    content: { raw: 'New comment' },
                    inline: undefined,
                },
            );
            expect(result.id).toBe('comment-123');
        });

        it('should post a reply comment', async () => {
            const mockApiResponse = { data: { id: 'reply-123', content: {}, user: {} } };
            mockHttpClient.post.mockResolvedValue(mockApiResponse);

            await api.postComment(mockSite, '123', 'Reply comment', 'parent-456');

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/pullrequests/123/comments',
                {
                    parent: { id: 'parent-456' },
                    content: { raw: 'Reply comment' },
                    inline: undefined,
                },
            );
        });

        it('should post an inline comment', async () => {
            const mockApiResponse = { data: { id: 'inline-123', content: {}, user: {} } };
            mockHttpClient.post.mockResolvedValue(mockApiResponse);

            const inline = { from: 10, to: 15, path: 'file.txt' };
            await api.postComment(mockSite, '123', 'Inline comment', '', inline);

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/pullrequests/123/comments',
                {
                    parent: undefined,
                    content: { raw: 'Inline comment' },
                    inline: inline,
                },
            );
        });

        it('should post a commit comment when commitHash is provided', async () => {
            const mockApiResponse = { data: { id: 'commit-comment-123', content: {}, user: {} } };
            mockHttpClient.post.mockResolvedValue(mockApiResponse);

            await api.postComment(mockSite, '123', 'Commit comment', '', undefined, 'commit-hash');

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/commit/commit-hash/comments',
                {
                    parent: undefined,
                    content: { raw: 'Commit comment' },
                    inline: undefined,
                },
            );
        });
    });

    describe('getFileContent', () => {
        it('should fetch file content from cache if available', async () => {
            const cachedContent = 'cached file content';
            mockCacheMap.getItem.mockReturnValue(cachedContent);

            const result = await api.getFileContent(mockSite, 'commit-hash', 'file.txt');

            expect(result).toBe(cachedContent);
            expect(mockHttpClient.getRaw).not.toHaveBeenCalled();
        });

        it('should fetch file content from API and cache it', async () => {
            const fileContent = 'file content from API';
            mockCacheMap.getItem.mockReturnValue(undefined);
            mockHttpClient.getRaw.mockResolvedValue({ data: fileContent, headers: {} });

            const result = await api.getFileContent(mockSite, 'commit-hash', 'file.txt');

            expect(mockHttpClient.getRaw).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/src/commit-hash/file.txt',
            );
            expect(mockCacheMap.setItem).toHaveBeenCalledWith(
                'test-owner::test-repo::commit-hash::file.txt',
                fileContent,
                300000, // 5 minutes
            );
            expect(result).toBe(fileContent);
        });
    });

    describe('create', () => {
        it('should create a new pull request', async () => {
            const createPrData: CreatePullRequestData = {
                title: 'New PR',
                summary: 'PR description',
                sourceSite: mockSite,
                sourceBranchName: 'feature',
                destinationBranchName: 'main',
                reviewerAccountIds: ['reviewer1', 'reviewer2'],
                closeSourceBranch: true,
            };

            const mockApiResponse = {
                data: {
                    ...mockPullRequest.data,
                    id: '123',
                    author: { account_id: 'author-id', display_name: 'Author' },
                    participants: [],
                    source: {
                        repository: { full_name: 'test-owner/test-repo' },
                        branch: { name: 'feature' },
                        commit: { hash: 'abc123' },
                    },
                    destination: {
                        repository: { full_name: 'test-owner/test-repo' },
                        branch: { name: 'main' },
                        commit: { hash: 'def456' },
                    },
                    links: { html: { href: 'https://pr.url' } },
                },
            };
            mockHttpClient.post.mockResolvedValue(mockApiResponse);

            const result = await api.create(mockSite, mockWorkspaceRepo, createPrData);

            expect(mockHttpClient.post).toHaveBeenCalledWith('/repositories/test-owner/test-repo/pullrequests', {
                type: 'pullrequest',
                title: 'New PR',
                summary: { raw: 'PR description' },
                source: {
                    repository: { full_name: 'test-owner/test-repo' },
                    branch: { name: 'feature' },
                },
                destination: {
                    branch: { name: 'main' },
                },
                reviewers: [
                    { type: 'user', account_id: 'reviewer1' },
                    { type: 'user', account_id: 'reviewer2' },
                ],
                close_source_branch: true,
            });
            expect(result.data.id).toBe('123');
        });
    });

    describe('update', () => {
        it('should update a pull request', async () => {
            const mockApiResponse = {
                data: {
                    ...mockPullRequest.data,
                    id: '123',
                    author: { account_id: 'author-id', display_name: 'Author' },
                    participants: [],
                    source: {
                        repository: { full_name: 'test-owner/test-repo' },
                        branch: { name: 'feature' },
                        commit: { hash: 'abc123' },
                    },
                    destination: {
                        repository: { full_name: 'test-owner/test-repo' },
                        branch: { name: 'main' },
                        commit: { hash: 'def456' },
                    },
                    links: { html: { href: 'https://pr.url' } },
                },
            };
            mockHttpClient.put.mockResolvedValue(mockApiResponse);

            const result = await api.update(mockPullRequest, 'Updated title', 'Updated summary', ['reviewer1']);

            expect(mockHttpClient.put).toHaveBeenCalledWith('/repositories/test-owner/test-repo/pullrequests/123', {
                title: 'Updated title',
                summary: { raw: 'Updated summary' },
                reviewers: [{ type: 'user', account_id: 'reviewer1' }],
            });
            expect(result.data.id).toBe('123');
        });
    });

    describe('getReviewers', () => {
        it('should return cached team members when query matches', async () => {
            const cachedUsers = [
                { ...mockUser, displayName: 'John Doe' },
                { ...mockUser, displayName: 'Jane Smith' },
            ];
            // Mock team members cache to return data, preventing internal API calls
            mockCacheMap.getItem.mockReturnValue(cachedUsers);

            const result = await api.getReviewers(mockSite, 'john');

            expect(result).toHaveLength(1);
            expect(result[0].displayName).toBe('John Doe');
        });

        it('should fetch default reviewers when no query and no cache', async () => {
            // Return undefined for cache lookups to trigger API calls
            mockCacheMap.getItem.mockReturnValue(undefined);

            const mockDefaultReviewersResponse = {
                data: {
                    values: [
                        {
                            account_id: 'reviewer1',
                            display_name: 'Reviewer 1',
                            links: { avatar: { href: '' }, html: { href: '' } },
                        },
                    ],
                },
            };

            mockHttpClient.get.mockResolvedValue(mockDefaultReviewersResponse);

            const result = await api.getReviewers(mockSite);

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/default-reviewers',
                { pagelen: maxItemsSupported.reviewers },
                undefined,
            );
            expect(result).toHaveLength(1);
            expect(mockCacheMap.setItem).toHaveBeenCalled();
        });

        it('should use cancelToken when provided', async () => {
            mockCacheMap.getItem.mockReturnValue(undefined);

            const cancelToken = {} as CancelToken;
            const mockDefaultReviewersResponse = { data: { values: [] } };

            mockHttpClient.get.mockResolvedValue(mockDefaultReviewersResponse);

            await api.getReviewers(mockSite, undefined, cancelToken);

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/default-reviewers',
                { pagelen: maxItemsSupported.reviewers },
                cancelToken,
            );
        });

        it('should fallback to getTeamMembers when query provided but no cache hit', async () => {
            mockCacheMap.getItem.mockReturnValue(undefined);

            // Mock the getTeamMembers spy to return the expected result
            const expectedUsers = [
                {
                    accountId: 'found-user',
                    displayName: 'Found User',
                    avatarUrl: '',
                    emailAddress: undefined,
                    userName: undefined,
                    url: '',
                    mention: '@[Found User](account_id:found-user)',
                },
            ];

            (api as any).getTeamMembers.mockResolvedValue(expectedUsers);

            const result = await api.getReviewers(mockSite, 'found');

            expect((api as any).getTeamMembers).toHaveBeenCalledWith(mockSite, 'found');
            expect(result).toHaveLength(1);
            expect(result[0].displayName).toBe('Found User');
        });
    });

    describe('toPullRequestData', () => {
        it('should convert API PR data to PullRequest model', () => {
            const apiData = {
                id: '123',
                title: 'Test PR',
                author: { account_id: 'author-id', display_name: 'Author' },
                participants: [
                    {
                        user: { account_id: 'participant-id', display_name: 'Participant' },
                        role: 'REVIEWER',
                        state: 'approved',
                    },
                ],
                source: {
                    repository: { full_name: 'owner/repo', name: 'repo', uuid: 'uuid1' },
                    branch: { name: 'feature' },
                    commit: { hash: 'abc123' },
                },
                destination: {
                    repository: { full_name: 'owner/repo', name: 'repo', uuid: 'uuid1' },
                    branch: { name: 'main' },
                    commit: { hash: 'def456' },
                },
                summary: { html: '<p>Summary</p>', raw: 'Summary' },
                created_on: '2023-01-01T00:00:00Z',
                updated_on: '2023-01-01T12:00:00Z',
                state: 'OPEN',
                close_source_branch: true,
                task_count: 5,
                draft: false,
                links: { html: { href: 'https://pr.url' } },
            };

            (CloudRepositoriesApi.toRepo as jest.Mock).mockReturnValue({
                fullName: 'owner/repo',
                name: 'repo',
                uuid: 'uuid1',
                avatarUrl: '',
                url: '',
            });

            const result = CloudPullRequestApi.toPullRequestData(apiData, mockSite, mockWorkspaceRepo);

            expect(result.data.id).toBe('123');
            expect(result.data.title).toBe('Test PR');
            expect(result.data.participants).toHaveLength(1);
            expect(result.data.participants[0].status).toBe('APPROVED');
            expect(result.data.taskCount).toBe(5);
            expect(result.data.closeSourceBranch).toBe(true);
        });

        it('should handle missing summary data', () => {
            const apiData = {
                id: '123',
                title: 'Test PR',
                author: { account_id: 'author-id', display_name: 'Author' },
                participants: [],
                source: { repository: {}, branch: {}, commit: {} },
                destination: { repository: {}, branch: {}, commit: {} },
                created_on: '2023-01-01T00:00:00Z',
                updated_on: '2023-01-01T12:00:00Z',
                state: 'OPEN',
                draft: false,
                links: { html: { href: 'https://pr.url' } },
            };

            (CloudRepositoriesApi.toRepo as jest.Mock).mockReturnValue({});

            const result = CloudPullRequestApi.toPullRequestData(apiData, mockSite);

            expect(result.data.htmlSummary).toBe('');
            expect(result.data.rawSummary).toBe('');
        });
    });
});
