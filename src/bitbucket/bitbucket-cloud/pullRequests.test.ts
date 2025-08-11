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

        it('should remove all reviewers when empty array is provided', async () => {
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

            const result = await api.update(mockPullRequest, 'Test PR', 'Test summary', []);

            expect(mockHttpClient.put).toHaveBeenCalledWith('/repositories/test-owner/test-repo/pullrequests/123', {
                title: 'Test PR',
                summary: { raw: 'Test summary' },
                reviewers: [],
            });
            expect(result.data.id).toBe('123');
        });

        it('should remove specific reviewers by providing filtered reviewer list', async () => {
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

            const remainingReviewers = ['reviewer1', 'reviewer3'];
            const result = await api.update(mockPullRequest, 'Test PR', 'Test summary', remainingReviewers);

            expect(mockHttpClient.put).toHaveBeenCalledWith('/repositories/test-owner/test-repo/pullrequests/123', {
                title: 'Test PR',
                summary: { raw: 'Test summary' },
                reviewers: [
                    { type: 'user', account_id: 'reviewer1' },
                    { type: 'user', account_id: 'reviewer3' },
                ],
            });
            expect(result.data.id).toBe('123');
        });

        it('should handle reviewer removal when only one reviewer remains', async () => {
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

            const remainingReviewers = ['reviewer1'];
            const result = await api.update(mockPullRequest, 'Test PR', 'Test summary', remainingReviewers);

            expect(mockHttpClient.put).toHaveBeenCalledWith('/repositories/test-owner/test-repo/pullrequests/123', {
                title: 'Test PR',
                summary: { raw: 'Test summary' },
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

    describe('getLatest', () => {
        it('should fetch latest PRs for current user as reviewer', async () => {
            const mockApiResponse = {
                data: {
                    values: [
                        {
                            id: '123',
                            title: 'Latest PR',
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
                    next: undefined,
                },
            };

            mockHttpClient.get.mockResolvedValue(mockApiResponse);

            const result = await api.getLatest(mockWorkspaceRepo);

            expect(mockHttpClient.get).toHaveBeenCalledWith('/repositories/test-owner/test-repo/pullrequests', {
                pagelen: 2,
                sort: '-created_on',
                q: 'state="OPEN" and reviewers.account_id="test-user-id"',
                fields: '+values.participants,+values.rendered.*',
            });
            expect(result.data).toHaveLength(1);
            expect(result.data[0].data.title).toBe('Latest PR');
        });

        it('should handle empty response', async () => {
            mockHttpClient.get.mockResolvedValue({ data: { values: [] } });

            const result = await api.getLatest(mockWorkspaceRepo);

            expect(result.data).toHaveLength(0);
        });
    });

    describe('getRecentAllStatus', () => {
        it('should fetch recent PRs with all statuses', async () => {
            const mockApiResponse = {
                data: {
                    values: [
                        {
                            id: '123',
                            title: 'Recent PR',
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
                            state: 'MERGED',
                            created_on: '2023-01-01T00:00:00Z',
                            updated_on: '2023-01-01T12:00:00Z',
                            links: { html: { href: 'https://pr.url' } },
                        },
                    ],
                    next: undefined,
                },
            };

            mockHttpClient.get.mockResolvedValue(mockApiResponse);

            const result = await api.getRecentAllStatus(mockWorkspaceRepo);

            expect(mockHttpClient.get).toHaveBeenCalledWith('/repositories/test-owner/test-repo/pullrequests', {
                pagelen: 25,
                sort: '-created_on',
                q: 'state="OPEN" OR state="MERGED" OR state="SUPERSEDED" OR state="DECLINED"',
                fields: '+values.participants,+values.rendered.*',
            });
            expect(result.data).toHaveLength(1);
            expect(result.data[0].data.state).toBe('MERGED');
        });
    });

    describe('getById', () => {
        it('should fetch a PR by numeric ID', async () => {
            const mockApiResponse = {
                data: {
                    id: '123',
                    title: 'PR by ID',
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

            const result = await api.getById(mockSite, 123);

            expect(mockHttpClient.get).toHaveBeenCalledWith('/repositories/test-owner/test-repo/pullrequests/123');
            expect(result.data.id).toBe('123');
            expect(result.data.title).toBe('PR by ID');
            expect(result.workspaceRepo).toBeUndefined();
        });
    });

    describe('getTasks', () => {
        it('should fetch all tasks for a PR', async () => {
            const mockApiResponse = {
                data: {
                    values: [
                        {
                            id: 'task-1',
                            content: { raw: 'First task' },
                            state: 'UNRESOLVED',
                            created_on: '2023-01-01T00:00:00Z',
                            updated_on: '2023-01-01T00:00:00Z',
                            creator: { account_id: 'test-user-id', display_name: 'Test User' },
                            comment: { id: 'comment-1' },
                        },
                        {
                            id: 'task-2',
                            content: { raw: 'Second task' },
                            state: 'RESOLVED',
                            created_on: '2023-01-01T01:00:00Z',
                            updated_on: '2023-01-01T01:00:00Z',
                            creator: { account_id: 'other-user-id', display_name: 'Other User' },
                        },
                    ],
                    next: undefined,
                },
            };

            mockHttpClient.get.mockResolvedValue(mockApiResponse);

            const result = await api.getTasks(mockPullRequest);

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/pullrequests/123/tasks',
            );
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('task-1');
            expect(result[0].content).toBe('First task');
            expect(result[0].isComplete).toBe(false);
            expect(result[0].editable).toBe(true); // belongs to current user
            expect(result[0].commentId).toBe('comment-1');
            expect(result[1].id).toBe('task-2');
            expect(result[1].isComplete).toBe(true);
            expect(result[1].editable).toBe(false); // belongs to other user
        });

        it('should handle paginated tasks', async () => {
            const firstPageResponse = {
                data: {
                    values: [
                        {
                            id: 'task-1',
                            content: { raw: 'First task' },
                            state: 'UNRESOLVED',
                            created_on: '2023-01-01T00:00:00Z',
                            updated_on: '2023-01-01T00:00:00Z',
                            creator: { account_id: 'test-user-id', display_name: 'Test User' },
                        },
                    ],
                    next: 'https://api.bitbucket.org/next',
                },
            };
            const secondPageResponse = {
                data: {
                    values: [
                        {
                            id: 'task-2',
                            content: { raw: 'Second task' },
                            state: 'RESOLVED',
                            created_on: '2023-01-01T01:00:00Z',
                            updated_on: '2023-01-01T01:00:00Z',
                            creator: { account_id: 'other-user-id', display_name: 'Other User' },
                        },
                    ],
                    next: undefined,
                },
            };

            mockHttpClient.get.mockResolvedValueOnce(firstPageResponse).mockResolvedValueOnce(secondPageResponse);

            const result = await api.getTasks(mockPullRequest);

            expect(result).toHaveLength(2);
            expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
        });

        it('should return empty array when no tasks exist', async () => {
            mockHttpClient.get.mockResolvedValue({ data: {} });

            const result = await api.getTasks(mockPullRequest);

            expect(result).toEqual([]);
        });

        it('should handle API errors gracefully', async () => {
            mockHttpClient.get.mockRejectedValue(new Error('API Error'));

            const result = await api.getTasks(mockPullRequest);

            expect(result).toEqual([]);
        });
    });

    describe('postTask', () => {
        it('should create a new task', async () => {
            const mockApiResponse = {
                data: {
                    id: 'new-task-id',
                    content: { raw: 'New task content' },
                    state: 'UNRESOLVED',
                    created_on: '2023-01-01T00:00:00Z',
                    updated_on: '2023-01-01T00:00:00Z',
                    creator: { account_id: 'test-user-id', display_name: 'Test User' },
                },
            };

            mockHttpClient.post.mockResolvedValue(mockApiResponse);

            const result = await api.postTask(mockSite, '123', 'New task content');

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/pullrequests/123/tasks/',
                {
                    completed: false,
                    content: { raw: 'New task content' },
                },
            );
            expect(result.id).toBe('new-task-id');
            expect(result.content).toBe('New task content');
            expect(result.isComplete).toBe(false);
        });

        it('should create a task with comment ID', async () => {
            const mockApiResponse = {
                data: {
                    id: 'new-task-id',
                    content: { raw: 'Task with comment' },
                    state: 'UNRESOLVED',
                    created_on: '2023-01-01T00:00:00Z',
                    updated_on: '2023-01-01T00:00:00Z',
                    creator: { account_id: 'test-user-id', display_name: 'Test User' },
                    comment: { id: 'comment-123' },
                },
            };

            mockHttpClient.post.mockResolvedValue(mockApiResponse);

            const result = await api.postTask(mockSite, '123', 'Task with comment', 'comment-123');

            expect(mockHttpClient.post).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/pullrequests/123/tasks/',
                {
                    comment: { id: 'comment-123' },
                    completed: false,
                    content: { raw: 'Task with comment' },
                },
            );
            expect(result.commentId).toBe('comment-123');
        });

        it('should handle API errors', async () => {
            mockHttpClient.post.mockRejectedValue(new Error('API Error'));

            await expect(api.postTask(mockSite, '123', 'New task')).rejects.toThrow(
                'Error creating new task using API: Error: API Error',
            );
            expect(Logger.error).toHaveBeenCalled();
        });
    });

    describe('editTask', () => {
        it('should update an existing task', async () => {
            const mockTask = {
                id: 'task-123',
                content: 'Updated task content',
                isComplete: true,
                commentId: 'comment-456',
                creator: mockUser,
                created: '2023-01-01T00:00:00Z',
                updated: '2023-01-01T00:00:00Z',
                editable: true,
                deletable: true,
            };

            const mockApiResponse = {
                data: {
                    id: 'task-123',
                    content: { raw: 'Updated task content' },
                    state: 'RESOLVED',
                    created_on: '2023-01-01T00:00:00Z',
                    updated_on: '2023-01-01T12:00:00Z',
                    creator: { account_id: 'test-user-id', display_name: 'Test User' },
                },
            };

            mockHttpClient.put.mockResolvedValue(mockApiResponse);

            const result = await api.editTask(mockSite, '123', mockTask);

            expect(mockHttpClient.put).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/pullrequests/123/tasks/task-123',
                {
                    comment: { comment: 'comment-456' },
                    completed: true,
                    content: { raw: 'Updated task content' },
                    id: 'task-123',
                    state: 'RESOLVED',
                },
            );
            expect(result.id).toBe('task-123');
            expect(result.content).toBe('Updated task content');
            expect(result.isComplete).toBe(true);
        });

        it('should handle incomplete task', async () => {
            const mockTask = {
                id: 'task-123',
                content: 'Incomplete task',
                isComplete: false,
                creator: mockUser,
                created: '2023-01-01T00:00:00Z',
                updated: '2023-01-01T00:00:00Z',
                editable: true,
                deletable: true,
            };

            const mockApiResponse = {
                data: {
                    id: 'task-123',
                    content: { raw: 'Incomplete task' },
                    state: 'UNRESOLVED',
                    created_on: '2023-01-01T00:00:00Z',
                    updated_on: '2023-01-01T12:00:00Z',
                    creator: { account_id: 'test-user-id', display_name: 'Test User' },
                },
            };

            mockHttpClient.put.mockResolvedValue(mockApiResponse);

            const result = await api.editTask(mockSite, '123', mockTask);

            expect(mockHttpClient.put).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/pullrequests/123/tasks/task-123',
                {
                    comment: { comment: undefined },
                    completed: false,
                    content: { raw: 'Incomplete task' },
                    id: 'task-123',
                    state: 'UNRESOLVED',
                },
            );
            expect(result.isComplete).toBe(false);
        });

        it('should handle API errors', async () => {
            const mockTask = {
                id: 'task-123',
                content: 'Task content',
                isComplete: false,
                creator: mockUser,
                created: '2023-01-01T00:00:00Z',
                updated: '2023-01-01T00:00:00Z',
                editable: true,
                deletable: true,
            };

            mockHttpClient.put.mockRejectedValue(new Error('API Error'));

            await expect(api.editTask(mockSite, '123', mockTask)).rejects.toThrow(
                'Error editing task using API: Error: API Error',
            );
            expect(Logger.error).toHaveBeenCalled();
        });
    });

    describe('deleteTask', () => {
        it('should delete a task', async () => {
            const mockTask = {
                id: 'task-123',
                content: 'Task to delete',
                isComplete: false,
                creator: mockUser,
                created: '2023-01-01T00:00:00Z',
                updated: '2023-01-01T00:00:00Z',
                editable: true,
                deletable: true,
            };

            mockHttpClient.delete.mockResolvedValue({});

            await api.deleteTask(mockSite, '123', mockTask);

            expect(mockHttpClient.delete).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/pullrequests/123/tasks/task-123',
                {},
            );
        });

        it('should handle API errors', async () => {
            const mockTask = {
                id: 'task-123',
                content: 'Task to delete',
                isComplete: false,
                creator: mockUser,
                created: '2023-01-01T00:00:00Z',
                updated: '2023-01-01T00:00:00Z',
                editable: true,
                deletable: true,
            };

            mockHttpClient.delete.mockRejectedValue(new Error('API Error'));

            await expect(api.deleteTask(mockSite, '123', mockTask)).rejects.toThrow(
                'Error deleting task using API: Error: API Error',
            );
            expect(Logger.error).toHaveBeenCalled();
        });
    });

    describe('convertDataToTask', () => {
        it('should convert API task data to Task model', () => {
            const taskData = {
                id: 'task-123',
                content: { raw: 'Task content' },
                state: 'UNRESOLVED',
                created_on: '2023-01-01T00:00:00Z',
                updated_on: '2023-01-01T12:00:00Z',
                creator: { account_id: 'test-user-id', display_name: 'Test User' },
                comment: { id: 'comment-456' },
            };

            const result = api.convertDataToTask(taskData, mockSite);

            expect(result).toEqual({
                id: 'task-123',
                content: 'Task content',
                isComplete: false,
                created: '2023-01-01T00:00:00Z',
                updated: '2023-01-01T12:00:00Z',
                creator: {
                    accountId: 'test-user-id',
                    displayName: 'Test User',
                    avatarUrl: '',
                    emailAddress: undefined,
                    userName: undefined,
                    url: '',
                    mention: '@[Test User](account_id:test-user-id)',
                },
                commentId: 'comment-456',
                editable: true, // belongs to current user
                deletable: true, // belongs to current user
            });
        });

        it('should handle completed task', () => {
            const taskData = {
                id: 'task-123',
                content: { raw: 'Completed task' },
                state: 'RESOLVED',
                created_on: '2023-01-01T00:00:00Z',
                updated_on: '2023-01-01T12:00:00Z',
                creator: { account_id: 'other-user-id', display_name: 'Other User' },
            };

            const result = api.convertDataToTask(taskData, mockSite);

            expect(result.isComplete).toBe(true);
            expect(result.editable).toBe(false); // belongs to other user
            expect(result.deletable).toBe(false); // belongs to other user
            expect(result.commentId).toBeUndefined();
        });

        it('should handle task without comment', () => {
            const taskData = {
                id: 'task-123',
                content: { raw: 'Task without comment' },
                state: 'UNRESOLVED',
                created_on: '2023-01-01T00:00:00Z',
                updated_on: '2023-01-01T12:00:00Z',
                creator: { account_id: 'test-user-id', display_name: 'Test User' },
            };

            const result = api.convertDataToTask(taskData, mockSite);

            expect(result.commentId).toBeUndefined();
        });
    });

    describe('getComments', () => {
        it('should fetch and convert PR comments', async () => {
            const mockApiResponse = {
                data: {
                    values: [
                        {
                            id: 'comment-1',
                            content: { html: '<p>First comment</p>', raw: 'First comment' },
                            created_on: '2023-01-01T00:00:00Z',
                            updated_on: '2023-01-01T00:00:00Z',
                            user: { account_id: 'user-1', display_name: 'User 1' },
                            deleted: false,
                        },
                        {
                            id: 'comment-2',
                            content: { html: '<p>Second comment</p>', raw: 'Second comment' },
                            created_on: '2023-01-01T01:00:00Z',
                            updated_on: '2023-01-01T01:00:00Z',
                            user: { account_id: 'user-2', display_name: 'User 2' },
                            parent: { id: 'comment-1' },
                            deleted: false,
                        },
                    ],
                    next: 'https://api.bitbucket.org/next',
                },
            };
            const nextPageResponse = {
                data: {
                    values: [
                        {
                            id: 'comment-3',
                            content: { html: '<p>Third comment</p>', raw: 'Third comment' },
                            created_on: '2023-01-01T02:00:00Z',
                            updated_on: '2023-01-01T02:00:00Z',
                            user: { account_id: 'user-3', display_name: 'User 3' },
                            deleted: false,
                        },
                    ],
                    next: undefined,
                },
            };

            mockHttpClient.get.mockResolvedValueOnce(mockApiResponse).mockResolvedValueOnce(nextPageResponse);

            const result = await api.getComments(mockPullRequest);

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/pullrequests/123/comments',
                {
                    pagelen: 100,
                },
            );
            expect(result.data).toHaveLength(2); // Nested structure: parent comment with 1 child, and 1 separate comment
            expect(result.data[0].id).toBe('comment-1');
            expect(result.data[0].children).toHaveLength(1);
            expect(result.data[0].children[0].id).toBe('comment-2');
            expect(result.data[1].id).toBe('comment-3');
        });

        it('should fetch commit comments when commitHash is provided', async () => {
            const mockApiResponse = {
                data: {
                    values: [
                        {
                            id: 'commit-comment-1',
                            content: { html: '<p>Commit comment</p>', raw: 'Commit comment' },
                            created_on: '2023-01-01T00:00:00Z',
                            updated_on: '2023-01-01T00:00:00Z',
                            user: { account_id: 'user-1', display_name: 'User 1' },
                            deleted: false,
                        },
                    ],
                    next: undefined,
                },
            };

            mockHttpClient.get.mockResolvedValue(mockApiResponse);

            const result = await api.getComments(mockPullRequest, 'commit-hash-123');

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/commit/commit-hash-123/comments',
                {
                    pagelen: 100,
                },
            );
            expect(result.data).toHaveLength(1);
            expect(result.data[0].commitHash).toBe('commit-hash-123');
        });

        it('should handle deleted comments', async () => {
            const mockApiResponse = {
                data: {
                    values: [
                        {
                            id: 'comment-1',
                            content: { html: '', raw: '' },
                            created_on: '2023-01-01T00:00:00Z',
                            updated_on: '2023-01-01T00:00:00Z',
                            user: { account_id: 'user-1', display_name: 'User 1' },
                            deleted: true,
                        },
                    ],
                    next: undefined,
                },
            };

            mockHttpClient.get.mockResolvedValue(mockApiResponse);

            const result = await api.getComments(mockPullRequest);

            expect(result.data).toHaveLength(0); // Deleted comments without children are filtered out
        });

        it('should handle empty response', async () => {
            mockHttpClient.get.mockResolvedValue({ data: {} });

            const result = await api.getComments(mockPullRequest);

            expect(result.data).toEqual([]);
            expect(result.next).toBeUndefined();
        });
    });

    describe('getBuildStatuses', () => {
        it('should fetch and convert build statuses', async () => {
            const mockApiResponse = {
                data: {
                    values: [
                        {
                            name: 'Build 1',
                            state: 'SUCCESSFUL',
                            url: 'https://build1.url',
                            created_on: '2023-01-01T00:00:00Z',
                            updated_on: '2023-01-01T01:00:00Z',
                            key: 'build-1-key',
                            type: 'build',
                        },
                        {
                            name: 'Build 2',
                            state: 'FAILED',
                            url: 'https://build2.url',
                            created_on: '2023-01-01T02:00:00Z',
                            updated_on: '2023-01-01T03:00:00Z',
                            key: 'build-2-key',
                            type: 'build',
                        },
                        {
                            name: 'Not Build',
                            state: 'SUCCESSFUL',
                            url: 'https://other.url',
                            created_on: '2023-01-01T04:00:00Z',
                            updated_on: '2023-01-01T05:00:00Z',
                            key: 'other-key',
                            type: 'other',
                        },
                    ],
                },
            };

            mockHttpClient.get.mockResolvedValue(mockApiResponse);

            const result = await api.getBuildStatuses(mockPullRequest);

            expect(mockHttpClient.get).toHaveBeenCalledWith(
                '/repositories/test-owner/test-repo/pullrequests/123/statuses',
                {
                    pagelen: 100,
                },
            );
            expect(result).toHaveLength(2); // Only build type statuses
            expect(result[0]).toEqual({
                name: 'Build 1',
                state: 'SUCCESSFUL',
                url: 'https://build1.url',
                ts: '2023-01-01T00:00:00Z',
                last_updated: '2023-01-01T01:00:00Z',
                key: 'build-1-key',
            });
            expect(result[1]).toEqual({
                name: 'Build 2',
                state: 'FAILED',
                url: 'https://build2.url',
                ts: '2023-01-01T02:00:00Z',
                last_updated: '2023-01-01T03:00:00Z',
                key: 'build-2-key',
            });
        });

        it('should handle empty build statuses', async () => {
            mockHttpClient.get.mockResolvedValue({ data: {} });

            const result = await api.getBuildStatuses(mockPullRequest);

            expect(result).toEqual([]);
        });

        it('should handle response with no build type statuses', async () => {
            const mockApiResponse = {
                data: {
                    values: [
                        {
                            name: 'Not Build',
                            state: 'SUCCESSFUL',
                            url: 'https://other.url',
                            created_on: '2023-01-01T04:00:00Z',
                            updated_on: '2023-01-01T05:00:00Z',
                            key: 'other-key',
                            type: 'other',
                        },
                    ],
                },
            };

            mockHttpClient.get.mockResolvedValue(mockApiResponse);

            const result = await api.getBuildStatuses(mockPullRequest);

            expect(result).toEqual([]);
        });
    });
});
