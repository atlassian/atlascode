import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import Axios from 'axios';
import { Logger } from 'src/logger';
import { Uri } from 'vscode';

import { DetailedSiteInfo } from '../../../../atlclients/authInfo';
import {
    BuildStatus,
    Comment,
    Commit,
    FileDiff,
    MergeStrategy,
    PullRequest,
    Task,
    User,
} from '../../../../bitbucket/model';
import { NotificationManagerImpl } from '../../../../views/notifications/notificationManager';
import { AnalyticsApi } from '../../../analyticsApi';
import { CommonAction, CommonActionType } from '../../../ipc/fromUI/common';
import { PullRequestDetailsAction, PullRequestDetailsActionType } from '../../../ipc/fromUI/pullRequestDetails';
import { WebViewID } from '../../../ipc/models/common';
import { CommonMessageType } from '../../../ipc/toUI/common';
import {
    emptyPullRequestDetailsInitMessage,
    PullRequestDetailsMessageType,
} from '../../../ipc/toUI/pullRequestDetails';
import { CommonActionMessageHandler } from '../common/commonActionMessageHandler';
import { MessagePoster } from '../webviewController';
import { PullRequestDetailsActionApi } from './pullRequestDetailsActionApi';
import { PullRequestDetailsWebviewController } from './pullRequestDetailsWebviewController';

// Mock dependencies
jest.mock('../../../../views/notifications/notificationManager');
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

const createMockComment = (overrides: Partial<Comment> = {}): Comment => ({
    id: 'comment1',
    deletable: true,
    editable: true,
    user: createMockUser(),
    htmlContent: '<p>Test comment</p>',
    rawContent: 'Test comment',
    ts: '2023-01-01T00:00:00.000Z',
    updatedTs: '2023-01-01T00:00:00.000Z',
    deleted: false,
    children: [],
    tasks: [],
    ...overrides,
});

const createMockPullRequest = (overrides: Partial<PullRequest> = {}): PullRequest =>
    ({
        data: {
            id: 123,
            siteDetails: {} as DetailedSiteInfo,
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
            details: { name: 'Test Site' } as DetailedSiteInfo,
            ownerSlug: 'test-owner',
            repoSlug: 'test-repo',
            ...overrides.site,
        },
        ...overrides,
    }) as PullRequest;

describe('PullRequestDetailsWebviewController', () => {
    let controller: PullRequestDetailsWebviewController;
    let mockPr: PullRequest;
    let mockMessagePoster: jest.MockedFunction<MessagePoster>;
    let mockApi: jest.Mocked<PullRequestDetailsActionApi>;
    let mockCommonHandler: jest.Mocked<CommonActionMessageHandler>;
    let mockLogger: jest.Mocked<Logger>;
    let mockAnalytics: jest.Mocked<AnalyticsApi>;
    let mockNotificationManager: jest.Mocked<NotificationManagerImpl>;

    beforeEach(() => {
        // Setup mock PR
        mockPr = createMockPullRequest();

        // Setup mocks
        mockMessagePoster = jest.fn();
        mockApi = {
            fetchUsers: jest.fn(),
            updateSummary: jest.fn(),
            updateTitle: jest.fn(),
            getCurrentUser: jest.fn(),
            getPR: jest.fn(),
            updateCommits: jest.fn(),
            updateReviewers: jest.fn(),
            updateApprovalStatus: jest.fn(),
            checkout: jest.fn(),
            getCurrentBranchName: jest.fn(),
            getComments: jest.fn(),
            postComment: jest.fn(),
            editComment: jest.fn(),
            deleteComment: jest.fn(),
            getFileDiffs: jest.fn(),
            getConflictedFiles: jest.fn(),
            openDiffViewForFile: jest.fn(),
            updateBuildStatuses: jest.fn(),
            updateMergeStrategies: jest.fn(),
            fetchRelatedJiraIssues: jest.fn(),
            merge: jest.fn(),
            openJiraIssue: jest.fn(),
            openBuildStatus: jest.fn(),
            getTasks: jest.fn(),
            createTask: jest.fn(),
            editTask: jest.fn(),
            deleteTask: jest.fn(),
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
            firePrApproveEvent: jest.fn(),
            firePrCheckoutEvent: jest.fn(),
            firePrCommentEvent: jest.fn(),
            firePrTaskEvent: jest.fn(),
            firePrMergeEvent: jest.fn(),
        } as any;

        mockNotificationManager = {
            clearNotificationsByUri: jest.fn(),
        } as any;
        (NotificationManagerImpl.getInstance as jest.Mock).mockReturnValue(mockNotificationManager);

        controller = new PullRequestDetailsWebviewController(
            mockPr,
            mockMessagePoster,
            mockApi,
            mockCommonHandler,
            mockLogger,
            mockAnalytics,
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with provided dependencies', () => {
            expect(controller).toBeInstanceOf(PullRequestDetailsWebviewController);
            expect(controller.requiredFeatureFlags).toEqual([]);
            expect(controller.requiredExperiments).toEqual([]);
        });
    });

    describe('onShown', () => {
        it('should clear notifications for the PR URL', () => {
            controller.onShown();

            expect(NotificationManagerImpl.getInstance).toHaveBeenCalled();
            expect(mockNotificationManager.clearNotificationsByUri).toHaveBeenCalledWith(Uri.parse(mockPr.data.url));
        });
    });

    describe('title', () => {
        it('should return the correct title format', () => {
            const title = controller.title();
            expect(title).toBe('Pull Request 123');
        });
    });

    describe('screenDetails', () => {
        it('should return correct screen details', () => {
            const screenDetails = controller.screenDetails();
            expect(screenDetails).toEqual({
                id: WebViewID.PullRequestDetailsWebview,
                site: undefined,
                product: undefined,
            });
        });
    });

    describe('update', () => {
        it('should call invalidate', async () => {
            // Mock API calls for invalidate
            const mockUser: User = createMockUser();
            const mockComments: Comment[] = [createMockComment()];
            const mockCommits: Commit[] = [{ hash: 'abc123', message: 'Test commit' } as Commit];
            const mockBuildStatuses: BuildStatus[] = [];
            const mockMergeStrategies: MergeStrategy[] = [];
            const mockTasks: Task[] = [];
            const mockFileDiffs: FileDiff[] = [];
            const mockConflictedFiles: string[] = [];
            const mockRelatedIssues: MinimalIssue<DetailedSiteInfo>[] = [];

            mockApi.getPR.mockResolvedValue(mockPr);
            mockApi.getCurrentUser.mockResolvedValue(mockUser);
            mockApi.getCurrentBranchName.mockReturnValue('feature-branch');
            mockApi.getComments.mockResolvedValue(mockComments);
            mockApi.updateCommits.mockResolvedValue(mockCommits);
            mockApi.updateBuildStatuses.mockResolvedValue(mockBuildStatuses);
            mockApi.updateMergeStrategies.mockResolvedValue(mockMergeStrategies);
            mockApi.getTasks.mockResolvedValue({
                tasks: mockTasks,
                pageComments: mockComments,
                inlineComments: [],
            });
            mockApi.getFileDiffs.mockResolvedValue(mockFileDiffs);
            mockApi.getConflictedFiles.mockResolvedValue(mockConflictedFiles);
            mockApi.fetchRelatedJiraIssues.mockResolvedValue(mockRelatedIssues);

            await controller.update();

            expect(mockApi.getPR).toHaveBeenCalledWith(mockPr);
            expect(mockMessagePoster).toHaveBeenCalledWith({
                ...emptyPullRequestDetailsInitMessage,
                type: PullRequestDetailsMessageType.Init,
                pr: mockPr,
                currentUser: mockUser,
                currentBranchName: 'feature-branch',
            });
        });

        it('should handle errors during update', async () => {
            const error = new Error('API Error');
            mockApi.getPR.mockRejectedValue(error);

            await controller.update();

            expect(mockLogger.error).toHaveBeenCalledWith(error, 'Error updating pull request');
            expect(mockMessagePoster).toHaveBeenCalledWith({
                type: CommonMessageType.Error,
                reason: expect.any(String),
            });
        });
    });

    describe('onMessageReceived', () => {
        describe('CommonActionType.Refresh', () => {
            it('should refresh the pull request data', async () => {
                const mockUser: User = { accountId: 'user1', displayName: 'Test User' } as User;
                mockApi.getPR.mockResolvedValue(mockPr);
                mockApi.getCurrentUser.mockResolvedValue(mockUser);
                mockApi.getCurrentBranchName.mockReturnValue('feature-branch');
                mockApi.getComments.mockResolvedValue([]);
                mockApi.updateCommits.mockResolvedValue([]);
                mockApi.updateBuildStatuses.mockResolvedValue([]);
                mockApi.updateMergeStrategies.mockResolvedValue([]);
                mockApi.getTasks.mockResolvedValue({ tasks: [], pageComments: [], inlineComments: [] });
                mockApi.getFileDiffs.mockResolvedValue([]);
                mockApi.getConflictedFiles.mockResolvedValue([]);
                mockApi.fetchRelatedJiraIssues.mockResolvedValue([]);

                const action: CommonAction = { type: CommonActionType.Refresh };
                await controller.onMessageReceived(action);

                expect(mockApi.getPR).toHaveBeenCalled();
            });

            it('should handle errors during refresh', async () => {
                const error = new Error('Refresh Error');
                mockApi.getPR.mockRejectedValue(error);

                const action: CommonAction = { type: CommonActionType.Refresh };
                await controller.onMessageReceived(action);

                expect(mockLogger.error).toHaveBeenCalledWith(error, 'Error updating pull request');
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: CommonMessageType.Error,
                    reason: expect.any(String),
                });
            });
        });

        describe('PullRequestDetailsActionType.FetchUsersRequest', () => {
            it('should fetch users and post response', async () => {
                const mockUsers: User[] = [
                    { accountId: 'user1', displayName: 'User 1' } as User,
                    { accountId: 'user2', displayName: 'User 2' } as User,
                ];
                mockApi.fetchUsers.mockResolvedValue(mockUsers);

                const action: PullRequestDetailsAction = {
                    type: PullRequestDetailsActionType.FetchUsersRequest,
                    site: mockPr.site,
                    query: 'test',
                    abortKey: 'key1',
                };

                await controller.onMessageReceived(action);

                expect(mockApi.fetchUsers).toHaveBeenCalledWith(mockPr.site, 'test', 'key1');
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PullRequestDetailsMessageType.FetchUsersResponse,
                    users: mockUsers,
                });
            });

            it('should handle axios cancel errors silently', async () => {
                const cancelError = new Error('Request canceled');
                jest.spyOn(Axios, 'isCancel').mockReturnValue(true);
                mockApi.fetchUsers.mockRejectedValue(cancelError);

                const action: PullRequestDetailsAction = {
                    type: PullRequestDetailsActionType.FetchUsersRequest,
                    site: mockPr.site,
                    query: 'test',
                };

                await controller.onMessageReceived(action);

                expect(mockLogger.warn).toHaveBeenCalled();
                expect(mockLogger.error).not.toHaveBeenCalled();
            });

            it('should handle non-cancel errors', async () => {
                const error = new Error('API Error');
                jest.spyOn(Axios, 'isCancel').mockReturnValue(false);
                mockApi.fetchUsers.mockRejectedValue(error);

                const action: PullRequestDetailsAction = {
                    type: PullRequestDetailsActionType.FetchUsersRequest,
                    site: mockPr.site,
                    query: 'test',
                };

                await controller.onMessageReceived(action);

                expect(mockLogger.error).toHaveBeenCalledWith(error, 'Error fetching users');
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: CommonMessageType.Error,
                    reason: expect.any(Object),
                });
            });
        });

        describe('PullRequestDetailsActionType.UpdateReviewers', () => {
            it('should update reviewers successfully', async () => {
                const mockReviewers = [{ user: { accountId: 'user1' } }] as any[];
                const mockUsers: User[] = [{ accountId: 'user1', displayName: 'User 1' } as User];
                mockApi.updateReviewers.mockResolvedValue(mockReviewers);

                const action: PullRequestDetailsAction = {
                    type: PullRequestDetailsActionType.UpdateReviewers,
                    reviewers: mockUsers,
                };

                await controller.onMessageReceived(action);

                expect(mockApi.updateReviewers).toHaveBeenCalledWith(mockPr, mockUsers);
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PullRequestDetailsMessageType.UpdateReviewers,
                    reviewers: mockReviewers,
                });
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PullRequestDetailsMessageType.UpdateReviewersResponse,
                });
            });

            it('should handle errors and still send response', async () => {
                const error = new Error('Update Error');
                mockApi.updateReviewers.mockRejectedValue(error);

                const action: PullRequestDetailsAction = {
                    type: PullRequestDetailsActionType.UpdateReviewers,
                    reviewers: [],
                };

                await controller.onMessageReceived(action);

                expect(mockLogger.error).toHaveBeenCalledWith(error, 'Error fetching users');
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: CommonMessageType.Error,
                    reason: expect.any(Object),
                });
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PullRequestDetailsMessageType.UpdateReviewersResponse,
                });
            });
        });

        describe('PullRequestDetailsActionType.UpdateSummaryRequest', () => {
            it('should update summary successfully', async () => {
                const updatedPr = {
                    ...mockPr,
                    data: {
                        ...mockPr.data,
                        rawSummary: 'Updated summary',
                        htmlSummary: '<p>Updated summary</p>',
                    },
                };
                mockApi.updateSummary.mockResolvedValue(updatedPr);

                const action: PullRequestDetailsAction = {
                    type: PullRequestDetailsActionType.UpdateSummaryRequest,
                    text: 'Updated summary',
                };

                await controller.onMessageReceived(action);

                expect(mockApi.updateSummary).toHaveBeenCalledWith(mockPr, 'Updated summary');
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PullRequestDetailsMessageType.UpdateSummary,
                    rawSummary: 'Updated summary',
                    htmlSummary: '<p>Updated summary</p>',
                });
            });
        });

        describe('PullRequestDetailsActionType.UpdateTitleRequest', () => {
            it('should update title successfully', async () => {
                const updatedPr = {
                    ...mockPr,
                    data: { ...mockPr.data, title: 'Updated Title' },
                };
                mockApi.updateTitle.mockResolvedValue(updatedPr);

                const action: PullRequestDetailsAction = {
                    type: PullRequestDetailsActionType.UpdateTitleRequest,
                    text: 'Updated Title',
                };

                await controller.onMessageReceived(action);

                expect(mockApi.updateTitle).toHaveBeenCalledWith(mockPr, 'Updated Title');
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PullRequestDetailsMessageType.UpdateTitle,
                    title: 'Updated Title',
                });
            });
        });

        describe('PullRequestDetailsActionType.UpdateApprovalStatus', () => {
            it('should update approval status and fire analytics event', async () => {
                const mockStatus = 'APPROVED' as const;
                mockApi.updateApprovalStatus.mockResolvedValue(mockStatus);

                const action: PullRequestDetailsAction = {
                    type: PullRequestDetailsActionType.UpdateApprovalStatus,
                    status: mockStatus,
                };

                await controller.onMessageReceived(action);

                expect(mockAnalytics.firePrApproveEvent).toHaveBeenCalledWith(mockPr.site.details);
                expect(mockApi.updateApprovalStatus).toHaveBeenCalledWith(mockPr, mockStatus);
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PullRequestDetailsMessageType.UpdateApprovalStatus,
                    status: mockStatus,
                });
            });
        });

        describe('PullRequestDetailsActionType.CheckoutBranch', () => {
            it('should checkout branch and fire analytics event', async () => {
                const branchName = 'feature-branch';
                mockApi.checkout.mockResolvedValue(branchName);

                const action: PullRequestDetailsAction = {
                    type: PullRequestDetailsActionType.CheckoutBranch,
                };

                await controller.onMessageReceived(action);

                expect(mockAnalytics.firePrCheckoutEvent).toHaveBeenCalledWith(mockPr.site.details);
                expect(mockApi.checkout).toHaveBeenCalledWith(mockPr);
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PullRequestDetailsMessageType.CheckoutBranch,
                    branchName: branchName,
                });
            });
        });

        describe('PullRequestDetailsActionType.PostComment', () => {
            it('should post comment and fire analytics event', async () => {
                const mockComments: Comment[] = [createMockComment()];
                mockApi.postComment.mockResolvedValue(mockComments);

                // Initialize pageComments
                (controller as any).pageComments = [];

                const action: PullRequestDetailsAction = {
                    type: PullRequestDetailsActionType.PostComment,
                    rawText: 'New comment',
                    parentId: 'parent1',
                };

                await controller.onMessageReceived(action);

                expect(mockAnalytics.firePrCommentEvent).toHaveBeenCalledWith(mockPr.site.details);
                expect(mockApi.postComment).toHaveBeenCalledWith([], mockPr, 'New comment', 'parent1');
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PullRequestDetailsMessageType.UpdateComments,
                    comments: mockComments,
                });
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PullRequestDetailsMessageType.PostCommentResponse,
                });
            });
        });

        describe('PullRequestDetailsActionType.EditComment', () => {
            it('should edit comment successfully', async () => {
                const mockComments: Comment[] = [createMockComment({ rawContent: 'Edited comment' })];
                mockApi.editComment.mockResolvedValue(mockComments);

                // Initialize pageComments
                (controller as any).pageComments = [];

                const action: PullRequestDetailsAction = {
                    type: PullRequestDetailsActionType.EditComment,
                    rawContent: 'Edited comment',
                    commentId: 'comment1',
                };

                await controller.onMessageReceived(action);

                expect(mockApi.editComment).toHaveBeenCalledWith([], mockPr, 'Edited comment', 'comment1');
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PullRequestDetailsMessageType.UpdateComments,
                    comments: mockComments,
                });
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PullRequestDetailsMessageType.EditCommentResponse,
                });
            });
        });

        describe('PullRequestDetailsActionType.DeleteComment', () => {
            it('should delete comment successfully', async () => {
                const mockComment: Comment = createMockComment({ id: 'comment1' });
                const mockAllComments: Comment[] = [];
                mockApi.deleteComment.mockResolvedValue(mockAllComments);

                const action: PullRequestDetailsAction = {
                    type: PullRequestDetailsActionType.DeleteComment,
                    comment: mockComment,
                };

                await controller.onMessageReceived(action);

                expect(mockApi.deleteComment).toHaveBeenCalledWith(mockPr, mockComment);
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PullRequestDetailsMessageType.UpdateComments,
                    comments: [],
                });
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PullRequestDetailsMessageType.DeleteCommentResponse,
                });
            });
        });

        describe('PullRequestDetailsActionType.AddTask', () => {
            it('should add task and fire analytics event', async () => {
                const mockTasks: Task[] = [{ id: 'task1', content: 'New task' } as Task];
                const mockComments: Comment[] = [];
                mockApi.createTask.mockResolvedValue({
                    tasks: mockTasks,
                    comments: mockComments,
                });

                // Initialize required properties
                (controller as any).tasks = [];
                (controller as any).pageComments = [];
                (controller as any).inlineComments = [];

                const action: PullRequestDetailsAction = {
                    type: PullRequestDetailsActionType.AddTask,
                    content: 'New task',
                    commentId: 'comment1',
                };

                await controller.onMessageReceived(action);

                expect(mockAnalytics.firePrTaskEvent).toHaveBeenCalledWith(mockPr.site.details, 'comment1');
                expect(mockApi.createTask).toHaveBeenCalledWith([], [], mockPr, 'New task', 'comment1');
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PullRequestDetailsMessageType.UpdateTasks,
                    tasks: mockTasks,
                    comments: [],
                });
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PullRequestDetailsMessageType.AddTaskResponse,
                });
            });
        });

        describe('PullRequestDetailsActionType.EditTask', () => {
            it('should edit task successfully', async () => {
                const mockTask: Task = { id: 'task1', content: 'Edited task' } as Task;
                const mockTasks: Task[] = [mockTask];
                const mockComments: Comment[] = [];
                mockApi.editTask.mockResolvedValue({
                    tasks: mockTasks,
                    comments: mockComments,
                });

                // Initialize required properties
                (controller as any).tasks = [];
                (controller as any).pageComments = [];
                (controller as any).inlineComments = [];

                const action: PullRequestDetailsAction = {
                    type: PullRequestDetailsActionType.EditTask,
                    task: mockTask,
                };

                await controller.onMessageReceived(action);

                expect(mockApi.editTask).toHaveBeenCalledWith([], [], mockPr, mockTask);
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PullRequestDetailsMessageType.UpdateTasks,
                    tasks: mockTasks,
                    comments: [],
                });
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PullRequestDetailsMessageType.EditTaskResponse,
                });
            });
        });

        describe('PullRequestDetailsActionType.DeleteTask', () => {
            it('should delete task successfully', async () => {
                const mockTask: Task = { id: 'task1', content: 'Task to delete' } as Task;
                const mockTasks: Task[] = [];
                const mockComments: Comment[] = [];
                mockApi.deleteTask.mockResolvedValue({
                    tasks: mockTasks,
                    comments: mockComments,
                });

                const action: PullRequestDetailsAction = {
                    type: PullRequestDetailsActionType.DeleteTask,
                    task: mockTask,
                };

                await controller.onMessageReceived(action);

                expect(mockApi.deleteTask).toHaveBeenCalledWith(mockPr, mockTask);
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PullRequestDetailsMessageType.UpdateTasks,
                    tasks: mockTasks,
                    comments: [],
                });
                expect(mockMessagePoster).toHaveBeenCalledWith({
                    type: PullRequestDetailsMessageType.DeleteTaskResponse,
                });
            });
        });

        describe('PullRequestDetailsActionType.OpenDiffRequest', () => {
            it('should open diff view', async () => {
                const mockFileDiff: FileDiff = { file: 'test.js' } as FileDiff;
                mockApi.openDiffViewForFile.mockResolvedValue();

                // Initialize inlineComments
                (controller as any).inlineComments = [];

                const action: PullRequestDetailsAction = {
                    type: PullRequestDetailsActionType.OpenDiffRequest,
                    fileDiff: mockFileDiff,
                };

                await controller.onMessageReceived(action);

                expect(mockApi.openDiffViewForFile).toHaveBeenCalledWith(mockPr, mockFileDiff, []);
            });
        });

        describe('PullRequestDetailsActionType.Merge', () => {
            it('should merge PR and fire analytics event', async () => {
                const mockMergeStrategy: MergeStrategy = {
                    label: 'Merge',
                    value: 'merge',
                    isDefault: true,
                };
                const mockIssues: MinimalIssue<DetailedSiteInfo>[] = [];
                const updatedPr = createMockPullRequest();
                updatedPr.data.state = 'MERGED';
                mockApi.merge.mockResolvedValue(updatedPr);

                // Mock the update method to avoid complex setup
                const updateSpy = jest.spyOn(controller, 'update').mockResolvedValue();

                const action: PullRequestDetailsAction = {
                    type: PullRequestDetailsActionType.Merge,
                    mergeStrategy: mockMergeStrategy,
                    commitMessage: 'Merge commit',
                    closeSourceBranch: true,
                    issues: mockIssues,
                };

                await controller.onMessageReceived(action);

                expect(mockAnalytics.firePrMergeEvent).toHaveBeenCalledWith(mockPr.site.details);
                expect(mockApi.merge).toHaveBeenCalledWith(mockPr, mockMergeStrategy, 'Merge commit', true, mockIssues);
                expect(updateSpy).toHaveBeenCalled();

                updateSpy.mockRestore();
            });
        });

        describe('PullRequestDetailsActionType.OpenJiraIssue', () => {
            it('should open Jira issue', async () => {
                const mockIssue: MinimalIssue<DetailedSiteInfo> = { key: 'TEST-123' } as any;
                mockApi.openJiraIssue.mockResolvedValue();

                const action: PullRequestDetailsAction = {
                    type: PullRequestDetailsActionType.OpenJiraIssue,
                    issue: mockIssue,
                };

                await controller.onMessageReceived(action);

                expect(mockApi.openJiraIssue).toHaveBeenCalledWith(mockIssue);
            });
        });

        describe('PullRequestDetailsActionType.OpenBuildStatus', () => {
            it('should open build status', async () => {
                const mockBuildStatus: BuildStatus = { state: 'SUCCESSFUL' } as BuildStatus;
                mockApi.openBuildStatus.mockResolvedValue();

                const action: PullRequestDetailsAction = {
                    type: PullRequestDetailsActionType.OpenBuildStatus,
                    buildStatus: mockBuildStatus,
                };

                await controller.onMessageReceived(action);

                expect(mockApi.openBuildStatus).toHaveBeenCalledWith(mockPr, mockBuildStatus);
            });
        });

        describe('Common actions', () => {
            it('should delegate to common handler', async () => {
                const action = { type: CommonActionType.Cancel } as CommonAction;

                await controller.onMessageReceived(action);

                expect(mockCommonHandler.onMessageReceived).toHaveBeenCalledWith(action);
            });
        });
    });

    describe('private methods', () => {
        describe('splitComments', () => {
            it('should split comments into page and inline comments', () => {
                const pageComment: Comment = createMockComment({ id: 'page1' });
                const inlineComment: Comment = createMockComment({
                    id: 'inline1',
                    inline: { from: 1, path: 'test.js', to: 2 },
                });
                const allComments = [pageComment, inlineComment];

                const [pageComments, inlineComments] = (controller as any).splitComments(allComments);

                expect(pageComments).toEqual([pageComment]);
                expect(inlineComments).toEqual([inlineComment]);
            });
        });
    });
});
