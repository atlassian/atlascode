import PQueue from 'p-queue/dist';

import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { CacheMap } from '../../util/cachemap';
import { HTTPClient } from '../httpClient';
import { BitbucketSite, CreatePullRequestData, PullRequest, User, WorkspaceRepo } from '../model';
import { CloudPullRequestApi } from './pullRequests';

// Mock dependencies
jest.mock('../../config/configuration');
jest.mock('../../logger');
jest.mock('../../util/cachemap');
jest.mock('../httpClient');
jest.mock('./repositories');
jest.mock('p-queue/dist');

describe('CloudPullRequestApi - Draft PRs', () => {
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

    describe('create', () => {
        it('should create a draft pull request', async () => {
            const createPrData: CreatePullRequestData = {
                title: 'Draft PR',
                summary: 'Draft PR description',
                sourceSite: mockSite,
                sourceBranchName: 'feature',
                destinationBranchName: 'main',
                reviewerAccountIds: ['reviewer1'],
                closeSourceBranch: false,
                draft: true,
            };

            const mockApiResponse = {
                data: {
                    ...mockPullRequest.data,
                    id: '456',
                    title: 'Draft PR',
                    draft: true,
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
                title: 'Draft PR',
                summary: { raw: 'Draft PR description' },
                source: {
                    repository: { full_name: 'test-owner/test-repo' },
                    branch: { name: 'feature' },
                },
                destination: {
                    branch: { name: 'main' },
                },
                reviewers: [{ type: 'user', account_id: 'reviewer1' }],
                close_source_branch: false,
                draft: true,
            });
            expect(result.data.id).toBe('456');
            expect(result.data.draft).toBe(true);
        });

        it('should create a draft pull request without reviewers', async () => {
            const createPrData: CreatePullRequestData = {
                title: 'Draft PR No Reviewers',
                summary: 'Draft without reviewers',
                sourceSite: mockSite,
                sourceBranchName: 'feature',
                destinationBranchName: 'main',
                reviewerAccountIds: [],
                closeSourceBranch: false,
                draft: true,
            };

            const mockApiResponse = {
                data: {
                    ...mockPullRequest.data,
                    id: '789',
                    title: 'Draft PR No Reviewers',
                    draft: true,
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
                title: 'Draft PR No Reviewers',
                summary: { raw: 'Draft without reviewers' },
                source: {
                    repository: { full_name: 'test-owner/test-repo' },
                    branch: { name: 'feature' },
                },
                destination: {
                    branch: { name: 'main' },
                },
                reviewers: [],
                close_source_branch: false,
                draft: true,
            });
            expect(result.data.id).toBe('789');
            expect(result.data.draft).toBe(true);
        });

        it('should create a draft pull request with minimal fields', async () => {
            const createPrData: CreatePullRequestData = {
                title: 'Minimal Draft PR',
                summary: '',
                sourceSite: mockSite,
                sourceBranchName: 'feature',
                destinationBranchName: 'main',
                reviewerAccountIds: [],
                closeSourceBranch: false,
                draft: true,
            };

            const mockApiResponse = {
                data: {
                    ...mockPullRequest.data,
                    id: '101',
                    title: 'Minimal Draft PR',
                    draft: true,
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
                title: 'Minimal Draft PR',
                summary: { raw: '' },
                source: {
                    repository: { full_name: 'test-owner/test-repo' },
                    branch: { name: 'feature' },
                },
                destination: {
                    branch: { name: 'main' },
                },
                reviewers: [],
                close_source_branch: false,
                draft: true,
            });
            expect(result.data.id).toBe('101');
            expect(result.data.draft).toBe(true);
        });
    });
});
