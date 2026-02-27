import { AxiosResponse } from 'axios';

import { DetailedSiteInfo, ProductBitbucket } from '../../atlclients/authInfo';
import { Container } from '../../container';
import { CacheMap } from '../../util/cachemap';
import { HTTPClient } from '../httpClient';
import { BitbucketSite, CreatePullRequestData, WorkspaceRepo } from '../model';
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

describe('ServerPullRequestApi - Draft PRs', () => {
    let api: ServerPullRequestApi;
    let mockClient: HTTPClient;
    let mockSite: BitbucketSite;
    let mockWorkspaceRepo: WorkspaceRepo;

    let mockContainer: jest.Mocked<typeof Container>;

    const getPullRequestData = {
        id: 1,
        version: 1,
        title: 'Test Pull Request',
        description: 'Test description',
        state: 'OPEN',
        open: true,
        closed: false,
        draft: false,
        createdDate: 1739222096918,
        updatedDate: 1739329991386,
        fromRef: {
            id: 'refs/heads/feature-branch',
            displayId: 'feature-branch',
            latestCommit: 'abc123',
            type: 'BRANCH',
            repository: {
                slug: 'testrepo',
                id: 1,
                name: 'testrepo',
                scmId: 'git',
                state: 'AVAILABLE',
                forkable: true,
                project: {
                    key: 'testproject',
                    id: 1,
                    name: 'Test Project',
                    type: 'NORMAL',
                    links: {
                        self: [
                            {
                                href: 'https://bitbucket.example.com/projects/testproject',
                            },
                        ],
                    },
                },
                public: false,
                links: {
                    clone: [
                        {
                            href: 'https://bitbucket.example.com/scm/testproject/testrepo.git',
                            name: 'http',
                        },
                    ],
                    self: [
                        {
                            href: 'https://bitbucket.example.com/projects/testproject/repos/testrepo/browse',
                        },
                    ],
                },
            },
        },
        toRef: {
            id: 'refs/heads/main',
            displayId: 'main',
            latestCommit: 'def456',
            type: 'BRANCH',
            repository: {
                slug: 'testrepo',
                id: 1,
                name: 'testrepo',
                scmId: 'git',
                state: 'AVAILABLE',
                forkable: true,
                project: {
                    key: 'testproject',
                    id: 1,
                    name: 'Test Project',
                    type: 'NORMAL',
                    links: {
                        self: [
                            {
                                href: 'https://bitbucket.example.com/projects/testproject',
                            },
                        ],
                    },
                },
                public: false,
                links: {
                    clone: [
                        {
                            href: 'https://bitbucket.example.com/scm/testproject/testrepo.git',
                            name: 'http',
                        },
                    ],
                    self: [
                        {
                            href: 'https://bitbucket.example.com/projects/testproject/repos/testrepo/browse',
                        },
                    ],
                },
            },
        },
        author: {
            user: {
                name: 'testuser',
                emailAddress: 'test@example.com',
                displayName: 'Test User',
                slug: 'testuser',
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
                    href: 'https://bitbucket.example.com/projects/testproject/repos/testrepo/pull-requests/1',
                },
            ],
        },
        descriptionAsHtml: '<p>Test description</p>',
    };

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
    });

    describe('create', () => {
        it('should create a draft pull request', async () => {
            const mockCreatePrData: CreatePullRequestData = {
                title: 'Draft Pull Request',
                summary: 'This is a draft pull request',
                sourceSite: mockSite,
                sourceBranchName: 'feature-branch',
                destinationBranchName: 'main',
                reviewerAccountIds: ['reviewer1'],
                closeSourceBranch: false,
                draft: true,
            };

            const mockCreateResponse = {
                data: {
                    ...getPullRequestData,
                    title: 'Draft Pull Request',
                    description: 'This is a draft pull request',
                    draft: true,
                },
            };

            mockPost.mockResolvedValue(mockCreateResponse);

            const result = await api.create(mockSite, mockWorkspaceRepo, mockCreatePrData);

            expect(mockPost).toHaveBeenCalledWith(
                '/rest/api/1.0/projects/testproject/repos/testrepo/pull-requests',
                {
                    title: 'Draft Pull Request',
                    description: 'This is a draft pull request',
                    fromRef: {
                        id: 'feature-branch',
                        repository: {
                            slug: 'testrepo',
                            project: {
                                key: 'testproject',
                            },
                        },
                    },
                    toRef: {
                        id: 'main',
                    },
                    reviewers: [{ user: { name: 'reviewer1' } }],
                    draft: true,
                },
                {
                    markup: true,
                    avatarSize: 64,
                },
            );
            expect(result.data.title).toBe('Draft Pull Request');
            expect(result.data.draft).toBe(true);
        });

        it('should create a draft pull request without reviewers', async () => {
            const mockCreatePrData: CreatePullRequestData = {
                title: 'Draft PR No Reviewers',
                summary: 'Draft without reviewers',
                sourceSite: mockSite,
                sourceBranchName: 'feature-branch',
                destinationBranchName: 'main',
                reviewerAccountIds: [],
                closeSourceBranch: false,
                draft: true,
            };

            const mockCreateResponse = {
                data: {
                    ...getPullRequestData,
                    title: 'Draft PR No Reviewers',
                    description: 'Draft without reviewers',
                    draft: true,
                },
            };

            mockPost.mockResolvedValue(mockCreateResponse);

            const result = await api.create(mockSite, mockWorkspaceRepo, mockCreatePrData);

            expect(mockPost).toHaveBeenCalledWith(
                '/rest/api/1.0/projects/testproject/repos/testrepo/pull-requests',
                {
                    title: 'Draft PR No Reviewers',
                    description: 'Draft without reviewers',
                    fromRef: {
                        id: 'feature-branch',
                        repository: {
                            slug: 'testrepo',
                            project: {
                                key: 'testproject',
                            },
                        },
                    },
                    toRef: {
                        id: 'main',
                    },
                    reviewers: [],
                    draft: true,
                },
                {
                    markup: true,
                    avatarSize: 64,
                },
            );
            expect(result.data.title).toBe('Draft PR No Reviewers');
            expect(result.data.draft).toBe(true);
        });

        it('should create a draft pull request with minimal fields', async () => {
            const mockCreatePrData: CreatePullRequestData = {
                title: 'Minimal Draft PR',
                summary: '',
                sourceSite: mockSite,
                sourceBranchName: 'feature-branch',
                destinationBranchName: 'main',
                reviewerAccountIds: [],
                closeSourceBranch: false,
                draft: true,
            };

            const mockCreateResponse = {
                data: {
                    ...getPullRequestData,
                    title: 'Minimal Draft PR',
                    description: '',
                    draft: true,
                },
            };

            mockPost.mockResolvedValue(mockCreateResponse);

            const result = await api.create(mockSite, mockWorkspaceRepo, mockCreatePrData);

            expect(mockPost).toHaveBeenCalledWith(
                '/rest/api/1.0/projects/testproject/repos/testrepo/pull-requests',
                {
                    title: 'Minimal Draft PR',
                    description: '',
                    fromRef: {
                        id: 'feature-branch',
                        repository: {
                            slug: 'testrepo',
                            project: {
                                key: 'testproject',
                            },
                        },
                    },
                    toRef: {
                        id: 'main',
                    },
                    reviewers: [],
                    draft: true,
                },
                {
                    markup: true,
                    avatarSize: 64,
                },
            );
            expect(result.data.title).toBe('Minimal Draft PR');
            expect(result.data.draft).toBe(true);
        });

        it('should create a draft pull request with multiple reviewers', async () => {
            const mockCreatePrData: CreatePullRequestData = {
                title: 'Draft PR Multiple Reviewers',
                summary: 'Draft with multiple reviewers',
                sourceSite: mockSite,
                sourceBranchName: 'feature-branch',
                destinationBranchName: 'main',
                reviewerAccountIds: ['reviewer1', 'reviewer2', 'reviewer3'],
                closeSourceBranch: false,
                draft: true,
            };

            const mockCreateResponse = {
                data: {
                    ...getPullRequestData,
                    title: 'Draft PR Multiple Reviewers',
                    description: 'Draft with multiple reviewers',
                    draft: true,
                },
            };

            mockPost.mockResolvedValue(mockCreateResponse);

            const result = await api.create(mockSite, mockWorkspaceRepo, mockCreatePrData);

            expect(mockPost).toHaveBeenCalledWith(
                '/rest/api/1.0/projects/testproject/repos/testrepo/pull-requests',
                {
                    title: 'Draft PR Multiple Reviewers',
                    description: 'Draft with multiple reviewers',
                    fromRef: {
                        id: 'feature-branch',
                        repository: {
                            slug: 'testrepo',
                            project: {
                                key: 'testproject',
                            },
                        },
                    },
                    toRef: {
                        id: 'main',
                    },
                    reviewers: [
                        { user: { name: 'reviewer1' } },
                        { user: { name: 'reviewer2' } },
                        { user: { name: 'reviewer3' } },
                    ],
                    draft: true,
                },
                {
                    markup: true,
                    avatarSize: 64,
                },
            );
            expect(result.data.title).toBe('Draft PR Multiple Reviewers');
            expect(result.data.draft).toBe(true);
        });
    });
});
