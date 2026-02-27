import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import Axios from 'axios';
import { Logger } from 'src/logger';

import { ProductBitbucket } from '../../../../atlclients/authInfo';
import { Commit, FileDiff, FileStatus, PullRequest, User, WorkspaceRepo } from '../../../../bitbucket/model';
import { Branch } from '../../../../typings/git';
import { AnalyticsApi } from '../../../analyticsApi';
import { CommonActionType } from '../../../ipc/fromUI/common';
import {
    CreatePullRequestActionType,
    FetchDetailsAction,
    FetchIssueAction,
    FetchUsersRequestAction,
    OpenDiffAction,
    SubmitCreateRequestAction,
} from '../../../ipc/fromUI/createPullRequest';
import { WebViewID } from '../../../ipc/models/common';
import { CommonMessageType } from '../../../ipc/toUI/common';
import { CreatePullRequestMessageType, RepoData } from '../../../ipc/toUI/createPullRequest';
import { CommonActionMessageHandler } from '../common/commonActionMessageHandler';
import { MessagePoster } from '../webviewController';
import { CreatePullRequestActionApi } from './createPullRequestActionApi';
import { CreatePullRequestWebviewController } from './createPullRequestWebviewController';

// Mock dependencies
jest.mock('../../../analyticsApi');
jest.mock('../common/commonActionMessageHandler');
jest.mock('src/logger');
jest.mock('axios');

// Helper functions to create mock objects
const createMockUser = (overrides: Partial<User> = {}): User => ({
    accountId: 'user1',
    displayName: 'Test User',
    url: 'https://test.com/user',
    avatarUrl: 'https://test.com/avatar.png',
    mention: '@testuser',
    ...overrides,
});

const createMockBranch = (overrides: Partial<Branch> = {}): Branch => ({
    name: 'main',
    type: 0,
    commit: 'abc123',
    ahead: 0,
    behind: 0,
    ...overrides,
});

const createMockWorkspaceRepo = (overrides: Partial<WorkspaceRepo> = {}): WorkspaceRepo => ({
    rootUri: '/path/to/repo',
    mainSiteRemote: {
        site: {
            details: {
                id: 'site123',
                name: 'Test Site',
                host: 'bitbucket.org',
                protocol: 'https',
                avatarUrl: 'https://test.com/avatar.png',
                baseLinkUrl: 'https://bitbucket.org',
                baseApiUrl: 'https://api.bitbucket.org',
                isCloud: true,
                userId: 'user123',
                credentialId: 'cred123',
                product: ProductBitbucket,
            },
            ownerSlug: 'test-owner',
            repoSlug: 'test-repo',
        },
        remote: {
            name: 'origin',
            isReadOnly: false,
        },
    },
    siteRemotes: [],
    ...overrides,
});

const createMockCommit = (overrides: Partial<Commit> = {}): Commit => ({
    hash: 'abc123',
    author: createMockUser(),
    ts: '2023-01-01T00:00:00.000Z',
    message: 'Test commit',
    url: 'https://bitbucket.org/test/repo/commits/abc123',
    htmlSummary: '<p>Test commit</p>',
    rawSummary: 'Test commit',
    ...overrides,
});

const createMockFileDiff = (overrides: Partial<FileDiff> = {}): FileDiff => ({
    file: 'src/test.ts',
    linesAdded: 3,
    linesRemoved: 2,
    status: FileStatus.MODIFIED,
    ...overrides,
});

const createMockPullRequest = (overrides: Partial<PullRequest> = {}): PullRequest =>
    ({
        data: {
            id: 123,
            siteDetails: {} as any,
            version: 1,
            title: 'Test PR',
            url: 'https://bitbucket.org/test/repo/pull-requests/123',
            author: createMockUser(),
            participants: [],
            source: {
                repo: { id: 'repo1', name: 'test-repo' } as any,
                branchName: 'feature-branch',
                commitHash: 'abc123',
            },
            destination: {
                repo: { id: 'repo1', name: 'test-repo' } as any,
                branchName: 'main',
                commitHash: 'def456',
            },
            state: 'OPEN' as const,
            createdDate: '2023-01-01T00:00:00.000Z',
            rawSummary: 'Test summary',
            htmlSummary: '<p>Test summary</p>',
            buildStatuses: [],
            mergeStrategies: [],
            draft: false,
            ...overrides.data,
        },
        site: {
            details: {} as any,
            ownerSlug: 'test-owner',
            repoSlug: 'test-repo',
            ...overrides.site,
        },
        ...overrides,
    }) as PullRequest;

const createMockRepoData = (overrides: Partial<RepoData> = {}): RepoData => ({
    workspaceRepo: createMockWorkspaceRepo(),
    href: 'https://bitbucket.org/test/repo',
    avatarUrl: 'https://test.com/avatar.png',
    localBranches: [createMockBranch()],
    remoteBranches: [createMockBranch({ name: 'origin/main' })],
    developmentBranch: 'main',
    hasLocalChanges: false,
    branchingModel: undefined,
    defaultReviewers: [],
    isCloud: true,
    hasSubmodules: false,
    ...overrides,
});

const createMockMinimalIssue = (overrides: Partial<MinimalIssue<any>> = {}): MinimalIssue<any> =>
    ({
        id: 'ISSUE-123',
        key: 'ISSUE-123',
        summary: 'Test Issue',
        self: 'https://test.com/issue/ISSUE-123',
        created: new Date('2023-01-01'),
        updated: new Date('2023-01-01'),
        description: 'Test description',
        descriptionHtml: '<p>Test description</p>',
        siteDetails: {} as any,
        status: { name: 'Open' } as any,
        ...overrides,
    }) as MinimalIssue<any>;

describe('CreatePullRequestWebviewController', () => {
    let controller: CreatePullRequestWebviewController;
    let mockWorkspaceRepo: WorkspaceRepo;
    let mockMessagePoster: jest.MockedFunction<MessagePoster>;
    let mockApi: jest.Mocked<CreatePullRequestActionApi>;
    let mockCommonHandler: jest.Mocked<CommonActionMessageHandler>;
    let mockLogger: jest.Mocked<Logger>;
    let mockAnalytics: jest.Mocked<AnalyticsApi>;

    beforeEach(() => {
        // Setup mock workspace repo
        mockWorkspaceRepo = createMockWorkspaceRepo();

        // Setup mocks
        mockMessagePoster = jest.fn();
        mockApi = {
            getWorkspaceRepos: jest.fn(),
            getRepoDetails: jest.fn(),
            getRepoScmState: jest.fn(),
            currentUser: jest.fn(),
            fetchUsers: jest.fn(),
            fetchIssue: jest.fn(),
            fetchDetails: jest.fn(),
            openDiff: jest.fn(),
            create: jest.fn(),
        };
        mockCommonHandler = {
            onMessageReceived: jest.fn(),
        } as any;
        mockLogger = {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            debug: jest.fn(),
        } as any;
        mockAnalytics = {
            fireViewScreenEvent: jest.fn(),
            firePrCreatedEvent: jest.fn(),
        } as any;

        controller = new CreatePullRequestWebviewController(
            mockMessagePoster,
            mockApi,
            mockCommonHandler,
            mockLogger,
            mockAnalytics,
            mockWorkspaceRepo,
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with provided dependencies', () => {
            expect(controller).toBeInstanceOf(CreatePullRequestWebviewController);
            expect(controller.requiredFeatureFlags).toEqual([]);
            expect(controller.requiredExperiments).toEqual([]);
        });
    });

    describe('onShown', () => {
        it('should be a no-op method', () => {
            expect(() => controller.onShown()).not.toThrow();
        });
    });

    describe('title', () => {
        it('should return correct title', () => {
            expect(controller.title()).toBe('Create pull request');
        });
    });

    describe('screenDetails', () => {
        it('should return correct screen details', () => {
            const details = controller.screenDetails();
            expect(details).toEqual({
                id: WebViewID.CreatePullRequest,
                site: undefined,
                product: ProductBitbucket,
            });
        });
    });

    describe('update', () => {
        it('should update initData and call invalidate', async () => {
            const newWorkspaceRepo = createMockWorkspaceRepo({ rootUri: '/new/path' });
            const mockRepoData = createMockRepoData();
            mockApi.getRepoDetails.mockResolvedValue(mockRepoData);

            await controller.update(newWorkspaceRepo);

            expect(mockApi.getRepoDetails).toHaveBeenCalledWith(newWorkspaceRepo);
            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: CreatePullRequestMessageType.Init,
                repoData: mockRepoData,
            });
        });

        it('should use existing initData if no factoryData provided', async () => {
            const mockRepoData = createMockRepoData();
            mockApi.getRepoDetails.mockResolvedValue(mockRepoData);

            await controller.update();

            expect(mockApi.getRepoDetails).toHaveBeenCalledWith(mockWorkspaceRepo);
            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: CreatePullRequestMessageType.Init,
                repoData: mockRepoData,
            });
        });

        it('should handle errors during invalidate', async () => {
            const error = new Error('API Error');
            mockApi.getRepoDetails.mockRejectedValue(error);

            await controller.update();

            expect(mockLogger.error).toHaveBeenCalledWith(
                error,
                'Error updating start work page or creating pull request',
                'invalidate',
            );
            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: CommonMessageType.Error,
                reason: expect.any(String),
            });
        });

        it('should not refresh if already refreshing', async () => {
            const mockRepoData = createMockRepoData();
            // First call starts refreshing
            mockApi.getRepoDetails.mockImplementation(() => {
                // During this call, try to update again
                controller.update();
                return Promise.resolve(mockRepoData);
            });

            await controller.update();

            // Should only be called once despite the second update call
            expect(mockApi.getRepoDetails).toHaveBeenCalledTimes(1);
        });
    });

    describe('onMessageReceived', () => {
        describe('CommonActionType.Refresh', () => {
            it('should call invalidate and handle success', async () => {
                const mockRepoData = createMockRepoData();
                mockApi.getRepoDetails.mockResolvedValue(mockRepoData);

                await controller.onMessageReceived({ type: CommonActionType.Refresh });

                expect(mockApi.getRepoDetails).toHaveBeenCalledWith(mockWorkspaceRepo);
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: CreatePullRequestMessageType.Init,
                    repoData: mockRepoData,
                });
            });

            it('should handle errors during refresh', async () => {
                const error = new Error('Refresh Error');
                mockApi.getRepoDetails.mockRejectedValue(error);

                await controller.onMessageReceived({ type: CommonActionType.Refresh });

                expect(mockLogger.error).toHaveBeenCalledWith(
                    error,
                    'Error updating start work page or creating pull request',
                    'invalidate',
                );
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: CommonMessageType.Error,
                    reason: expect.any(String),
                });
            });
        });

        describe('CreatePullRequestActionType.FetchIssue', () => {
            it('should fetch issue and post update message when issue found', async () => {
                const mockIssue = createMockMinimalIssue();
                mockApi.fetchIssue.mockResolvedValue(mockIssue);

                const action: FetchIssueAction = { branchName: 'feature-branch' };
                await controller.onMessageReceived({
                    type: CreatePullRequestActionType.FetchIssue,
                    ...action,
                });

                expect(mockApi.fetchIssue).toHaveBeenCalledWith('feature-branch');
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: CreatePullRequestMessageType.UpdateIssue,
                    issue: mockIssue,
                });
            });

            it('should not post message when no issue found', async () => {
                mockApi.fetchIssue.mockResolvedValue(undefined);

                const action: FetchIssueAction = { branchName: 'feature-branch' };
                await controller.onMessageReceived({
                    type: CreatePullRequestActionType.FetchIssue,
                    ...action,
                });

                expect(mockApi.fetchIssue).toHaveBeenCalledWith('feature-branch');
                expect(mockMessagePoster).not.toHaveBeenCalled();
            });

            it('should handle errors and log them without posting to UI', async () => {
                const error = new Error('Fetch Issue Error');
                mockApi.fetchIssue.mockRejectedValue(error);

                const action: FetchIssueAction = { branchName: 'feature-branch' };
                await controller.onMessageReceived({
                    type: CreatePullRequestActionType.FetchIssue,
                    ...action,
                });

                expect(mockLogger.error).toHaveBeenCalledWith(error, 'Error fetching issue for branch name');
                expect(mockMessagePoster).not.toHaveBeenCalled();
            });
        });

        describe('CreatePullRequestActionType.FetchDetails', () => {
            it('should fetch details and post update message', async () => {
                const mockCommits = [createMockCommit()];
                const mockFileDiffs = [createMockFileDiff()];
                const sourceBranch = createMockBranch({ name: 'feature' });
                const destinationBranch = createMockBranch({ name: 'main' });

                mockApi.fetchDetails.mockResolvedValue([mockCommits, mockFileDiffs]);

                const action: FetchDetailsAction = { sourceBranch, destinationBranch };
                await controller.onMessageReceived({
                    type: CreatePullRequestActionType.FetchDetails,
                    ...action,
                });

                expect(mockApi.fetchDetails).toHaveBeenCalledWith(mockWorkspaceRepo, sourceBranch, destinationBranch);
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: CreatePullRequestMessageType.UpdateDetails,
                    commits: mockCommits,
                    fileDiffs: mockFileDiffs,
                });
            });

            it('should handle errors and log them without posting to UI', async () => {
                const error = new Error('Fetch Details Error');
                const sourceBranch = createMockBranch({ name: 'feature' });
                const destinationBranch = createMockBranch({ name: 'main' });

                mockApi.fetchDetails.mockRejectedValue(error);

                const action: FetchDetailsAction = { sourceBranch, destinationBranch };
                await controller.onMessageReceived({
                    type: CreatePullRequestActionType.FetchDetails,
                    ...action,
                });

                expect(mockLogger.error).toHaveBeenCalledWith(error, 'Error fetching commits');
                expect(mockMessagePoster).not.toHaveBeenCalled();
            });
        });

        describe('CreatePullRequestActionType.OpenDiff', () => {
            it('should open diff and fire analytics event', async () => {
                const mockFileDiff = createMockFileDiff();

                const action: OpenDiffAction = { fileDiff: mockFileDiff };
                await controller.onMessageReceived({
                    type: CreatePullRequestActionType.OpenDiff,
                    ...action,
                });

                expect(mockApi.openDiff).toHaveBeenCalledWith(mockFileDiff);
                expect(mockAnalytics.fireViewScreenEvent).toHaveBeenCalledWith(
                    'pullRequestPreviewDiffScreen',
                    undefined,
                    ProductBitbucket,
                );
            });

            it('should handle errors and log them without posting to UI', async () => {
                const error = new Error('Open Diff Error');
                const mockFileDiff = createMockFileDiff();

                mockApi.openDiff.mockImplementation(() => {
                    throw error;
                });

                const action: OpenDiffAction = { fileDiff: mockFileDiff };
                await controller.onMessageReceived({
                    type: CreatePullRequestActionType.OpenDiff,
                    ...action,
                });

                expect(mockLogger.error).toHaveBeenCalledWith(error, 'Error opening diff');
                expect(mockMessagePoster).not.toHaveBeenCalled();
            });
        });

        describe('CreatePullRequestActionType.FetchUsersRequest', () => {
            it('should fetch users and post response', async () => {
                const mockUsers = [createMockUser()];
                const mockSite = mockWorkspaceRepo.mainSiteRemote.site!;

                mockApi.fetchUsers.mockResolvedValue(mockUsers);

                const action: FetchUsersRequestAction = {
                    site: mockSite,
                    query: 'test',
                    abortKey: 'abort123',
                };
                await controller.onMessageReceived({
                    type: CreatePullRequestActionType.FetchUsersRequest,
                    ...action,
                });

                expect(mockApi.fetchUsers).toHaveBeenCalledWith(mockSite, 'test', 'abort123');
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: CreatePullRequestMessageType.FetchUsersResponse,
                    users: mockUsers,
                });
            });

            it('should handle axios cancel error by logging warning', async () => {
                const cancelError = { message: 'Request canceled' };
                (Axios.isCancel as unknown as jest.Mock).mockReturnValue(true);
                mockApi.fetchUsers.mockRejectedValue(cancelError);

                const mockSite = mockWorkspaceRepo.mainSiteRemote.site!;
                const action: FetchUsersRequestAction = { site: mockSite, query: 'test' };
                await controller.onMessageReceived({
                    type: CreatePullRequestActionType.FetchUsersRequest,
                    ...action,
                });

                expect(mockLogger.warn).toHaveBeenCalled();
                expect(mockMessagePoster).not.toHaveBeenCalled();
            });

            it('should handle non-cancel errors by posting error message', async () => {
                const error = new Error('Fetch Users Error');
                (Axios.isCancel as unknown as jest.Mock).mockReturnValue(false);
                mockApi.fetchUsers.mockRejectedValue(error);

                const mockSite = mockWorkspaceRepo.mainSiteRemote.site!;
                const action: FetchUsersRequestAction = { site: mockSite, query: 'test' };
                await controller.onMessageReceived({
                    type: CreatePullRequestActionType.FetchUsersRequest,
                    ...action,
                });

                expect(mockLogger.error).toHaveBeenCalledWith(error, 'Error fetching users');
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: CommonMessageType.Error,
                    reason: expect.objectContaining({
                        title: 'Error fetching users',
                        errorMessages: ['Fetch Users Error'],
                    }),
                });
            });
        });

        describe('CreatePullRequestActionType.SubmitCreateRequest', () => {
            it('should create pull request and post success response with analytics', async () => {
                const mockPr = createMockPullRequest();
                mockApi.create.mockResolvedValue(mockPr);

                const action: SubmitCreateRequestAction = {
                    workspaceRepo: mockWorkspaceRepo,
                    sourceSiteRemote: mockWorkspaceRepo.mainSiteRemote,
                    sourceBranch: createMockBranch({ name: 'feature' }),
                    sourceRemoteName: 'origin',
                    destinationBranch: createMockBranch({ name: 'main' }),
                    title: 'Test PR',
                    summary: 'Test summary',
                    reviewers: [],
                    pushLocalChanges: false,
                    closeSourceBranch: false,
                    isDraft: false,
                };

                await controller.onMessageReceived({
                    type: CreatePullRequestActionType.SubmitCreateRequest,
                    ...action,
                });

                expect(mockApi.create).toHaveBeenCalledWith({
                    type: CreatePullRequestActionType.SubmitCreateRequest,
                    ...action,
                });
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: CreatePullRequestMessageType.SubmitResponse,
                    pr: mockPr,
                });
                expect(mockAnalytics.firePrCreatedEvent).toHaveBeenCalledWith(
                    mockWorkspaceRepo.mainSiteRemote.site!.details,
                    { isDraft: false },
                );
            });

            it('should handle creation errors and post error response', async () => {
                const error = new Error('Create PR Error');
                mockApi.create.mockRejectedValue(error);

                const action: SubmitCreateRequestAction = {
                    workspaceRepo: mockWorkspaceRepo,
                    sourceSiteRemote: mockWorkspaceRepo.mainSiteRemote,
                    sourceBranch: createMockBranch({ name: 'feature' }),
                    sourceRemoteName: 'origin',
                    destinationBranch: createMockBranch({ name: 'main' }),
                    title: 'Test PR',
                    summary: 'Test summary',
                    reviewers: [],
                    pushLocalChanges: false,
                    closeSourceBranch: false,
                    isDraft: false,
                };

                await controller.onMessageReceived({
                    type: CreatePullRequestActionType.SubmitCreateRequest,
                    ...action,
                });

                expect(mockLogger.error).toHaveBeenCalledWith(error, 'Error creating pull request');
                expect(mockMessagePoster).toHaveBeenNthCalledWith(1, {
                    type: CreatePullRequestMessageType.SubmitResponse,
                    pr: undefined!,
                });
                expect(mockMessagePoster).toHaveBeenNthCalledWith(2, {
                    type: CommonMessageType.Error,
                    reason: expect.objectContaining({
                        title: 'Error creating pull request',
                        errorMessages: ['Create PR Error'],
                    }),
                });
                expect(mockAnalytics.firePrCreatedEvent).not.toHaveBeenCalled();
            });
        });

        describe('Common actions', () => {
            it('should delegate common actions to commonHandler', async () => {
                const commonActions = [
                    { type: CommonActionType.SendAnalytics, errorInfo: {} as any },
                    { type: CommonActionType.CopyLink, source: 'test', linkId: 'test' },
                    { type: CommonActionType.OpenJiraIssue, issueOrKeyAndSite: {} as any },
                    { type: CommonActionType.ExternalLink, source: 'test', linkId: 'test' },
                    { type: CommonActionType.Cancel },
                    { type: CommonActionType.DismissPMFLater },
                    { type: CommonActionType.DismissPMFNever },
                    { type: CommonActionType.OpenPMFSurvey },
                    { type: CommonActionType.SubmitPMF, pmfData: {} as any },
                    { type: CommonActionType.SubmitFeedback, feedback: {} as any },
                ];

                for (const action of commonActions) {
                    await controller.onMessageReceived(action as any);
                    expect(mockCommonHandler.onMessageReceived).toHaveBeenCalledWith(action);
                }

                expect(mockCommonHandler.onMessageReceived).toHaveBeenCalledTimes(commonActions.length);
            });
        });

        describe('Unknown actions', () => {
            it('should handle unknown actions with defaultActionGuard', async () => {
                // This would normally throw in production due to defaultActionGuard
                // but in tests we just want to ensure it doesn't crash
                const unknownAction = { type: 'unknown-action' as any };

                expect(() => {
                    controller.onMessageReceived(unknownAction);
                }).not.toThrow();
            });
        });
    });
});
