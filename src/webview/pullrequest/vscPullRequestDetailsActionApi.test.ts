import { isMinimalIssue, MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import axios from 'axios';
import pSettle, { PromiseFulfilledResult } from 'p-settle';
import * as vscode from 'vscode';

import { DetailedSiteInfo, ProductJira } from '../../atlclients/authInfo';
import { clientForSite } from '../../bitbucket/bbUtils';
import { extractIssueKeys } from '../../bitbucket/issueKeysExtractor';
import {
    ApprovalStatus,
    BitbucketSite,
    BuildStatus,
    Comment,
    Commit,
    FileDiff,
    FileStatus,
    MergeStrategy,
    PullRequest,
    Task,
    User,
} from '../../bitbucket/model';
import { showIssue } from '../../commands/jira/showIssue';
import { Commands } from '../../constants';
import { Container } from '../../container';
import { issueForKey } from '../../jira/issueForKey';
import { transitionIssue } from '../../jira/transitionIssue';
import { CancellationManager } from '../../lib/cancellation';
import { Logger } from '../../logger';
import { getArgsForDiffView } from '../../views/pullrequest/diffViewHelper';
import { addSourceRemoteIfNeededForPR } from '../../views/pullrequest/gitActions';
import {
    addTasksToCommentHierarchy,
    addTaskToCommentHierarchy,
    addToCommentHierarchy,
    fileDiffContainsComments,
    replaceCommentInHierarchy,
    replaceTaskInCommentHierarchy,
    replaceTaskInTaskList,
} from '../common/pullRequestHelperActions';
import { VSCPullRequestDetailsActionApi } from './vscPullRequestDetailsActionApi';

// Mock dependencies
jest.mock('axios');
jest.mock('p-settle');
jest.mock('@atlassianlabs/jira-pi-common-models', () => ({
    isMinimalIssue: jest.fn(),
    createEmptyMinimalIssue: jest.fn().mockReturnValue({}),
}));
jest.mock('../../bitbucket/bbUtils');
jest.mock('../../bitbucket/issueKeysExtractor');
jest.mock('../../commands/jira/showIssue');
jest.mock('../../container');
jest.mock('../../jira/issueForKey');
jest.mock('../../jira/transitionIssue');
jest.mock('../../lib/cancellation');
jest.mock('../../logger');
jest.mock('../../views/pullrequest/diffViewHelper');
jest.mock('../../views/pullrequest/gitActions');
jest.mock('../common/pullRequestHelperActions');

// Mock VSCode
const mockCommands = vscode.commands as jest.Mocked<typeof vscode.commands>;
const mockEnv = vscode.env as jest.Mocked<typeof vscode.env>;
const mockUri = vscode.Uri as jest.Mocked<typeof vscode.Uri>;

describe('VSCPullRequestDetailsActionApi', () => {
    let api: VSCPullRequestDetailsActionApi;
    let mockCancellationManager: jest.Mocked<CancellationManager>;
    let mockContainer: jest.Mocked<typeof Container>;
    let mockBitbucketContext: any;
    let mockClientManager: any;
    let mockSiteManager: any;

    // Mock data
    const mockSite: BitbucketSite = {
        details: {
            id: 'site-id',
            name: 'Test Site',
            host: 'bitbucket.org',
            protocol: 'https',
            product: { name: 'Bitbucket', key: 'bitbucket' },
            avatarUrl: 'avatar.png',
            baseLinkUrl: 'https://bitbucket.org',
            baseApiUrl: 'https://api.bitbucket.org',
            isCloud: true,
            userId: 'user123',
            credentialId: 'cred-123',
        } as DetailedSiteInfo,
        ownerSlug: 'test-owner',
        repoSlug: 'test-repo',
    };

    const mockUser: User = {
        accountId: 'user-123',
        displayName: 'Test User',
        userName: 'testuser',
        emailAddress: 'test@example.com',
        url: 'https://bitbucket.org/testuser',
        avatarUrl: 'https://avatar.url',
        mention: '@testuser',
    };

    const mockWorkspaceRepo = {
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

    const mockPullRequest: PullRequest = {
        site: mockSite,
        workspaceRepo: mockWorkspaceRepo,
        data: {
            siteDetails: mockSite.details,
            id: 'pr-123',
            version: 1,
            title: 'Test PR',
            url: 'https://bitbucket.org/test-owner/test-repo/pull-requests/123',
            updatedTs: '2023-01-01T12:00:00Z',
            ts: '2023-01-01T00:00:00Z',
            state: 'OPEN',
            author: mockUser,
            participants: [
                {
                    accountId: mockUser.accountId,
                    displayName: mockUser.displayName,
                    userName: mockUser.userName,
                    emailAddress: mockUser.emailAddress,
                    url: mockUser.url,
                    avatarUrl: mockUser.avatarUrl,
                    mention: mockUser.mention,
                    role: 'REVIEWER',
                    status: 'UNAPPROVED',
                } as any,
            ],
            source: {
                repo: {
                    id: 'repo-123',
                    name: 'test-repo',
                    displayName: 'Test Repo',
                    fullName: 'test-owner/test-repo',
                    url: 'https://bitbucket.org/test-owner/test-repo',
                    avatarUrl: '',
                    mainbranch: 'main',
                    issueTrackerEnabled: true,
                },
                branchName: 'feature-branch',
                commitHash: 'abc123',
            },
            destination: {
                repo: {
                    id: 'repo-123',
                    name: 'test-repo',
                    displayName: 'Test Repo',
                    fullName: 'test-owner/test-repo',
                    url: 'https://bitbucket.org/test-owner/test-repo',
                    avatarUrl: '',
                    mainbranch: 'main',
                    issueTrackerEnabled: true,
                },
                branchName: 'main',
                commitHash: 'def456',
            },
            htmlSummary: '<p>Test summary</p>',
            rawSummary: 'Test summary',
            closeSourceBranch: false,
            taskCount: 0,
            buildStatuses: [],
            draft: false,
        },
    };

    const mockComment: Comment = {
        id: 'comment-123',
        parentId: undefined,
        htmlContent: '<p>Test comment</p>',
        rawContent: 'Test comment',
        user: mockUser,
        ts: '2023-01-01T00:00:00Z',
        updatedTs: '2023-01-01T00:00:00Z',
        children: [],
        tasks: [],
        inline: undefined,
        editable: true,
        deletable: true,
        deleted: false,
    };

    const mockFileDiff: FileDiff = {
        linesAdded: 10,
        linesRemoved: 5,
        status: FileStatus.MODIFIED,
        oldPath: 'src/file.ts',
        newPath: 'src/file.ts',
        hasComments: false,
    };

    const mockCommit: Commit = {
        hash: 'abc123',
        message: 'Test commit',
        ts: '2023-01-01T00:00:00Z',
        author: mockUser,
        url: 'https://bitbucket.org/commit/abc123',
        htmlSummary: '<p>Test commit</p>',
        rawSummary: 'Test commit',
        parentHashes: ['parent123'],
    };

    const mockTask: Task = {
        id: 'task-123',
        commentId: 'comment-123',
        content: 'Fix this issue',
        isComplete: false,
        creator: mockUser,
        created: '2023-01-01T00:00:00Z',
        updated: '2023-01-01T00:00:00Z',
        editable: true,
        deletable: true,
    };

    const mockBuildStatus: BuildStatus = {
        name: 'test-build',
        state: 'SUCCESSFUL',
        url: 'https://build.url',
        key: 'test-key',
        ts: '2023-01-01T00:00:00Z',
    };

    const mockMergeStrategy: MergeStrategy = {
        label: 'Merge commit',
        value: 'merge_commit',
        isDefault: true,
    };

    const mockMinimalIssue: MinimalIssue<DetailedSiteInfo> = {
        id: 'issue-123',
        key: 'TEST-123',
        summary: 'Test issue',
        status: {
            id: 'in-progress',
            name: 'In Progress',
            description: 'Work is in progress',
            iconUrl: 'https://icon.url',
            self: 'https://self.url',
            statusCategory: {
                id: 4,
                key: 'indeterminate',
                colorName: 'yellow',
                name: 'In Progress',
                self: 'https://category.url',
            },
        },
        siteDetails: mockSite.details,
        transitions: [
            {
                id: 'done-transition',
                name: 'Done',
                hasScreen: false,
                isConditional: false,
                isGlobal: false,
                isInitial: false,
                to: {
                    id: 'done',
                    name: 'Done',
                    description: 'Work is complete',
                    iconUrl: 'https://done-icon.url',
                    self: 'https://done-self.url',
                    statusCategory: {
                        id: 3,
                        key: 'done',
                        colorName: 'green',
                        name: 'Done',
                        self: 'https://done-category.url',
                    },
                },
            },
        ] as any,
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock CancellationManager
        mockCancellationManager = {
            set: jest.fn(),
            cancel: jest.fn(),
            dispose: jest.fn(),
        } as any;

        // Mock Container
        mockBitbucketContext = {
            currentUser: jest.fn().mockResolvedValue(mockUser),
            getRepositoryScm: jest.fn(),
        };

        mockClientManager = {
            bbClient: jest.fn(),
        };

        mockSiteManager = {
            productHasAtLeastOneSite: jest.fn(),
        };

        mockContainer = Container as jest.Mocked<typeof Container>;
        (mockContainer as any).bitbucketContext = mockBitbucketContext;
        (mockContainer as any).clientManager = mockClientManager;
        (mockContainer as any).siteManager = mockSiteManager;

        // Initialize API
        api = new VSCPullRequestDetailsActionApi(mockCancellationManager);

        // Setup common mocks
        (clientForSite as jest.Mock).mockResolvedValue({
            pullrequests: {
                get: jest.fn().mockResolvedValue(mockPullRequest),
                getReviewers: jest.fn().mockResolvedValue([mockUser]),
                update: jest.fn().mockResolvedValue(mockPullRequest),
                getCommits: jest.fn().mockResolvedValue([mockCommit]),
                updateApproval: jest.fn().mockResolvedValue('APPROVED'),
                getComments: jest.fn().mockResolvedValue({ data: [mockComment] }),
                postComment: jest.fn().mockResolvedValue(mockComment),
                editComment: jest.fn().mockResolvedValue(mockComment),
                deleteComment: jest.fn().mockResolvedValue(undefined),
                getChangedFiles: jest.fn().mockResolvedValue([mockFileDiff]),
                getConflictedFiles: jest.fn().mockResolvedValue([]),
                getBuildStatuses: jest.fn().mockResolvedValue([mockBuildStatus]),
                getMergeStrategies: jest.fn().mockResolvedValue([mockMergeStrategy]),
                merge: jest.fn().mockResolvedValue(mockPullRequest),
                getTasks: jest.fn().mockResolvedValue([mockTask]),
                postTask: jest.fn().mockResolvedValue(mockTask),
                editTask: jest.fn().mockResolvedValue(mockTask),
                deleteTask: jest.fn().mockResolvedValue(undefined),
            },
            pipelines: {
                getPipeline: jest.fn(),
            },
        });

        // Mock axios
        (axios.CancelToken.source as jest.Mock).mockReturnValue({
            token: 'mock-cancel-token',
            cancel: jest.fn(),
        });

        // Mock helper functions
        (addToCommentHierarchy as jest.Mock).mockReturnValue([[mockComment], true]);
        (replaceCommentInHierarchy as jest.Mock).mockReturnValue([[mockComment], true]);
        (addTasksToCommentHierarchy as jest.Mock).mockReturnValue([mockComment]);
        (addTaskToCommentHierarchy as jest.Mock).mockReturnValue([[mockComment]]);
        (replaceTaskInCommentHierarchy as jest.Mock).mockReturnValue([[mockComment]]);
        (replaceTaskInTaskList as jest.Mock).mockReturnValue([mockTask]);
        (fileDiffContainsComments as jest.Mock).mockReturnValue(true);

        // Mock VS Code commands
        mockCommands.executeCommand = jest.fn().mockResolvedValue(undefined);
        mockEnv.openExternal = jest.fn().mockResolvedValue(undefined);
        mockUri.parse = jest.fn().mockImplementation((uri) => ({ toString: () => uri }));
    });

    describe('getCurrentUser', () => {
        it('should return current user from bitbucket context', async () => {
            const result = await api.getCurrentUser(mockPullRequest);

            expect(mockBitbucketContext.currentUser).toHaveBeenCalledWith(mockSite);
            expect(result).toBe(mockUser);
        });
    });

    describe('getPR', () => {
        it('should fetch pull request details', async () => {
            const mockBbApi = {
                pullrequests: {
                    get: jest.fn().mockResolvedValue(mockPullRequest),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            const result = await api.getPR(mockPullRequest);

            expect(clientForSite).toHaveBeenCalledWith(mockSite);
            expect(mockBbApi.pullrequests.get).toHaveBeenCalledWith(
                mockSite,
                mockPullRequest.data.id,
                mockWorkspaceRepo,
            );
            expect(result).toBe(mockPullRequest);
        });
    });

    describe('fetchUsers', () => {
        it('should fetch users with query', async () => {
            const mockClient = {
                pullrequests: {
                    getReviewers: jest.fn().mockResolvedValue([mockUser]),
                },
            };
            mockClientManager.bbClient.mockResolvedValue(mockClient);

            const result = await api.fetchUsers(mockSite, 'test query');

            expect(mockClientManager.bbClient).toHaveBeenCalledWith(mockSite.details);
            expect(mockClient.pullrequests.getReviewers).toHaveBeenCalledWith(mockSite, 'test query', undefined);
            expect(result).toEqual([mockUser]);
        });

        it('should handle abort key with cancel token', async () => {
            const mockClient = {
                pullrequests: {
                    getReviewers: jest.fn().mockResolvedValue([mockUser]),
                },
            };
            mockClientManager.bbClient.mockResolvedValue(mockClient);

            const mockCancelTokenSource = {
                token: 'mock-token',
                cancel: jest.fn(),
            };
            (axios.CancelToken.source as jest.Mock).mockReturnValue(mockCancelTokenSource);

            const result = await api.fetchUsers(mockSite, 'test query', 'abort-key');

            expect(mockCancellationManager.set).toHaveBeenCalledWith('abort-key', mockCancelTokenSource);
            expect(mockClient.pullrequests.getReviewers).toHaveBeenCalledWith(
                mockSite,
                'test query',
                mockCancelTokenSource.token,
            );
            expect(result).toEqual([mockUser]);
        });
    });

    describe('updateSummary', () => {
        it('should update pull request summary', async () => {
            const mockBbApi = {
                pullrequests: {
                    update: jest.fn().mockResolvedValue(mockPullRequest),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            const result = await api.updateSummary(mockPullRequest, 'New summary');

            expect(mockBbApi.pullrequests.update).toHaveBeenCalledWith(
                mockPullRequest,
                mockPullRequest.data.title,
                'New summary',
                [mockUser.accountId],
            );
            expect(result).toBe(mockPullRequest);
        });
    });

    describe('updateTitle', () => {
        it('should update pull request title and refresh PR list', async () => {
            const mockBbApi = {
                pullrequests: {
                    update: jest.fn().mockResolvedValue(mockPullRequest),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            const result = await api.updateTitle(mockPullRequest, 'New title');

            expect(mockBbApi.pullrequests.update).toHaveBeenCalledWith(
                mockPullRequest,
                'New title',
                mockPullRequest.data.rawSummary,
                [mockUser.accountId],
            );
            expect(mockCommands.executeCommand).toHaveBeenCalledWith(Commands.BitbucketRefreshPullRequests);
            expect(result).toBe(mockPullRequest);
        });
    });

    describe('updateCommits', () => {
        it('should fetch updated commits', async () => {
            const mockBbApi = {
                pullrequests: {
                    getCommits: jest.fn().mockResolvedValue([mockCommit]),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            const result = await api.updateCommits(mockPullRequest);

            expect(mockBbApi.pullrequests.getCommits).toHaveBeenCalledWith(mockPullRequest);
            expect(result).toEqual([mockCommit]);
        });
    });

    describe('updateReviewers', () => {
        it('should update reviewers for cloud sites', async () => {
            const newReviewers = [mockUser];
            const mockBbApi = {
                pullrequests: {
                    update: jest.fn().mockResolvedValue({
                        data: { participants: [{ user: mockUser, role: 'REVIEWER', status: 'UNAPPROVED' }] },
                    }),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            const result = await api.updateReviewers(mockPullRequest, newReviewers);

            expect(mockBbApi.pullrequests.update).toHaveBeenCalledWith(
                mockPullRequest,
                mockPullRequest.data.title,
                mockPullRequest.data.rawSummary,
                [mockUser.accountId],
            );
            expect(result).toEqual([{ user: mockUser, role: 'REVIEWER', status: 'UNAPPROVED' }]);
        });

        it('should use userName for server sites', async () => {
            const serverSite = { ...mockSite, details: { ...mockSite.details, isCloud: false } };
            const serverPR = { ...mockPullRequest, site: serverSite };
            const userWithUserName = { ...mockUser, userName: 'test-username' };
            const newReviewers = [userWithUserName];

            const mockBbApi = {
                pullrequests: {
                    update: jest.fn().mockResolvedValue({
                        data: { participants: [{ user: userWithUserName, role: 'REVIEWER', status: 'UNAPPROVED' }] },
                    }),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            await api.updateReviewers(serverPR, newReviewers);

            expect(mockBbApi.pullrequests.update).toHaveBeenCalledWith(
                serverPR,
                serverPR.data.title,
                serverPR.data.rawSummary,
                ['test-username'],
            );
        });
    });

    describe('updateApprovalStatus', () => {
        it('should update approval status', async () => {
            const mockBbApi = {
                pullrequests: {
                    updateApproval: jest.fn().mockResolvedValue('APPROVED'),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            const result = await api.updateApprovalStatus(mockPullRequest, 'APPROVED' as ApprovalStatus);

            expect(mockBbApi.pullrequests.updateApproval).toHaveBeenCalledWith(mockPullRequest, 'APPROVED');
            expect(result).toBe('APPROVED');
        });
    });

    describe('getCurrentBranchName', () => {
        it('should return current branch name from SCM', () => {
            const mockScm = {
                state: {
                    HEAD: { name: 'feature-branch' },
                },
            };
            mockBitbucketContext.getRepositoryScm.mockReturnValue(mockScm);

            const result = api.getCurrentBranchName(mockPullRequest);

            expect(mockBitbucketContext.getRepositoryScm).toHaveBeenCalledWith(mockWorkspaceRepo.rootUri);
            expect(result).toBe('feature-branch');
        });

        it('should return empty string when no HEAD', () => {
            const mockScm = {
                state: {
                    HEAD: null,
                },
            };
            mockBitbucketContext.getRepositoryScm.mockReturnValue(mockScm);

            const result = api.getCurrentBranchName(mockPullRequest);

            expect(result).toBe('');
        });

        it('should return empty string when no workspace repo', () => {
            const prWithoutRepo = { ...mockPullRequest, workspaceRepo: undefined };

            const result = api.getCurrentBranchName(prWithoutRepo);

            expect(result).toBe('');
        });
    });

    describe('checkout', () => {
        it('should checkout pull request branch', async () => {
            const mockScm = {
                fetch: jest.fn().mockResolvedValue(undefined),
                checkout: jest.fn().mockResolvedValue(undefined),
                pull: jest.fn().mockResolvedValue(undefined),
                state: {
                    HEAD: { name: 'feature-branch', behind: 1 },
                },
            };
            mockBitbucketContext.getRepositoryScm.mockReturnValue(mockScm);
            (addSourceRemoteIfNeededForPR as jest.Mock).mockResolvedValue(undefined);

            const result = await api.checkout(mockPullRequest);

            expect(addSourceRemoteIfNeededForPR).toHaveBeenCalledWith(mockPullRequest);
            expect(mockScm.fetch).toHaveBeenCalled();
            expect(mockScm.checkout).toHaveBeenCalledWith('feature-branch');
            expect(mockScm.pull).toHaveBeenCalled();
            expect(result).toBe('feature-branch');
        });

        it('should throw error when no workspace repo', async () => {
            const prWithoutRepo = { ...mockPullRequest, workspaceRepo: undefined };

            await expect(api.checkout(prWithoutRepo)).rejects.toThrow('no workspace repo');
        });

        it('should not pull when not behind', async () => {
            const mockScm = {
                fetch: jest.fn().mockResolvedValue(undefined),
                checkout: jest.fn().mockResolvedValue(undefined),
                pull: jest.fn().mockResolvedValue(undefined),
                state: {
                    HEAD: { name: 'feature-branch', behind: 0 },
                },
            };
            mockBitbucketContext.getRepositoryScm.mockReturnValue(mockScm);
            (addSourceRemoteIfNeededForPR as jest.Mock).mockResolvedValue(undefined);

            await api.checkout(mockPullRequest);

            expect(mockScm.pull).not.toHaveBeenCalled();
        });
    });

    describe('getComments', () => {
        it('should fetch pull request comments', async () => {
            const mockBbApi = {
                pullrequests: {
                    getComments: jest.fn().mockResolvedValue({ data: [mockComment] }),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            const result = await api.getComments(mockPullRequest);

            expect(mockBbApi.pullrequests.getComments).toHaveBeenCalledWith(mockPullRequest);
            expect(result).toEqual([mockComment]);
        });
    });

    describe('postComment', () => {
        it('should post top-level comment', async () => {
            const mockBbApi = {
                pullrequests: {
                    postComment: jest.fn().mockResolvedValue(mockComment),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            const result = await api.postComment([mockComment], mockPullRequest, 'New comment');

            expect(mockBbApi.pullrequests.postComment).toHaveBeenCalledWith(
                mockSite,
                mockPullRequest.data.id,
                'New comment',
                '',
            );
            expect(result).toEqual([mockComment, mockComment]);
        });

        it('should post reply comment and update hierarchy', async () => {
            const mockBbApi = {
                pullrequests: {
                    postComment: jest.fn().mockResolvedValue(mockComment),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            const result = await api.postComment([mockComment], mockPullRequest, 'Reply comment', 'parent-123');

            expect(mockBbApi.pullrequests.postComment).toHaveBeenCalledWith(
                mockSite,
                mockPullRequest.data.id,
                'Reply comment',
                'parent-123',
            );
            expect(addToCommentHierarchy).toHaveBeenCalledWith([mockComment], mockComment);
            expect(result).toEqual([mockComment]);
        });

        it('should refetch comments when hierarchy update fails', async () => {
            const mockBbApi = {
                pullrequests: {
                    postComment: jest.fn().mockResolvedValue(mockComment),
                    getComments: jest.fn().mockResolvedValue({ data: [mockComment] }),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);
            (addToCommentHierarchy as jest.Mock).mockReturnValue([[mockComment], false]);

            const result = await api.postComment([mockComment], mockPullRequest, 'Reply comment', 'parent-123');

            expect(mockBbApi.pullrequests.getComments).toHaveBeenCalledWith(mockPullRequest);
            expect(result).toEqual([mockComment]);
        });
    });

    describe('editComment', () => {
        it('should edit comment and update hierarchy', async () => {
            const mockBbApi = {
                pullrequests: {
                    editComment: jest.fn().mockResolvedValue(mockComment),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            const result = await api.editComment([mockComment], mockPullRequest, 'Edited content', 'comment-123');

            expect(mockBbApi.pullrequests.editComment).toHaveBeenCalledWith(
                mockSite,
                mockPullRequest.data.id,
                'Edited content',
                'comment-123',
            );
            expect(replaceCommentInHierarchy).toHaveBeenCalledWith([mockComment], mockComment);
            expect(result).toEqual([mockComment]);
        });

        it('should refetch comments when hierarchy update fails', async () => {
            const mockBbApi = {
                pullrequests: {
                    editComment: jest.fn().mockResolvedValue(mockComment),
                    getComments: jest.fn().mockResolvedValue({ data: [mockComment] }),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);
            (replaceCommentInHierarchy as jest.Mock).mockReturnValue([[mockComment], false]);

            const result = await api.editComment([mockComment], mockPullRequest, 'Edited content', 'comment-123');

            expect(mockBbApi.pullrequests.getComments).toHaveBeenCalledWith(mockPullRequest);
            expect(result).toEqual([mockComment]);
        });
    });

    describe('deleteComment', () => {
        it('should delete comment and refetch comments', async () => {
            const mockBbApi = {
                pullrequests: {
                    deleteComment: jest.fn().mockResolvedValue(undefined),
                    getComments: jest.fn().mockResolvedValue({ data: [] }),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            const result = await api.deleteComment(mockPullRequest, mockComment);

            expect(mockBbApi.pullrequests.deleteComment).toHaveBeenCalledWith(
                mockSite,
                mockPullRequest.data.id,
                mockComment.id,
            );
            expect(mockBbApi.pullrequests.getComments).toHaveBeenCalledWith(mockPullRequest);
            expect(result).toEqual([]);
        });
    });

    describe('getFileDiffs', () => {
        it('should fetch file diffs and mark files with comments', async () => {
            const mockBbApi = {
                pullrequests: {
                    getChangedFiles: jest.fn().mockResolvedValue([mockFileDiff]),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);
            (fileDiffContainsComments as jest.Mock).mockReturnValue(true);

            const result = await api.getFileDiffs(mockPullRequest, [mockComment]);

            expect(mockBbApi.pullrequests.getChangedFiles).toHaveBeenCalledWith(mockPullRequest);
            expect(fileDiffContainsComments).toHaveBeenCalledWith(mockFileDiff, [mockComment]);
            expect(result[0].hasComments).toBe(true);
        });
    });

    describe('getConflictedFiles', () => {
        it('should fetch conflicted files', async () => {
            const mockBbApi = {
                pullrequests: {
                    getConflictedFiles: jest.fn().mockResolvedValue(['file1.txt', 'file2.txt']),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            const result = await api.getConflictedFiles(mockPullRequest);

            expect(mockBbApi.pullrequests.getConflictedFiles).toHaveBeenCalledWith(mockPullRequest);
            expect(result).toEqual(['file1.txt', 'file2.txt']);
        });
    });

    describe('openDiffViewForFile', () => {
        it('should open diff view with proper arguments', async () => {
            const mockDiffViewArgs = {
                diffArgs: ['arg1', 'arg2'],
            };
            const mockBbApi = {
                pullrequests: {
                    getConflictedFiles: jest.fn().mockResolvedValue([]),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);
            (getArgsForDiffView as jest.Mock).mockResolvedValue(mockDiffViewArgs);

            await api.openDiffViewForFile(mockPullRequest, mockFileDiff, [mockComment]);

            expect(getArgsForDiffView).toHaveBeenCalledWith(
                { data: [mockComment] },
                mockFileDiff,
                [],
                mockPullRequest,
                Container.bitbucketContext.prCommentController,
            );
            expect(mockCommands.executeCommand).toHaveBeenCalledWith(Commands.ViewDiff, 'arg1', 'arg2');
        });
    });

    describe('updateBuildStatuses', () => {
        it('should fetch build statuses', async () => {
            const mockBbApi = {
                pullrequests: {
                    getBuildStatuses: jest.fn().mockResolvedValue([mockBuildStatus]),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            const result = await api.updateBuildStatuses(mockPullRequest);

            expect(mockBbApi.pullrequests.getBuildStatuses).toHaveBeenCalledWith(mockPullRequest);
            expect(result).toEqual([mockBuildStatus]);
        });
    });

    describe('updateMergeStrategies', () => {
        it('should fetch merge strategies', async () => {
            const mockBbApi = {
                pullrequests: {
                    getMergeStrategies: jest.fn().mockResolvedValue([mockMergeStrategy]),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            const result = await api.updateMergeStrategies(mockPullRequest);

            expect(mockBbApi.pullrequests.getMergeStrategies).toHaveBeenCalledWith(mockPullRequest);
            expect(result).toEqual([mockMergeStrategy]);
        });
    });

    describe('fetchRelatedJiraIssues', () => {
        it('should fetch related Jira issues when Jira sites available', async () => {
            mockSiteManager.productHasAtLeastOneSite.mockReturnValue(true);
            (extractIssueKeys as jest.Mock).mockResolvedValue(['TEST-123']);
            (issueForKey as jest.Mock).mockResolvedValue(mockMinimalIssue);
            (pSettle as any).mockResolvedValue([
                { isFulfilled: true, value: mockMinimalIssue } as PromiseFulfilledResult<any>,
            ]);

            const result = await api.fetchRelatedJiraIssues(mockPullRequest, [mockCommit], [mockComment]);

            expect(mockSiteManager.productHasAtLeastOneSite).toHaveBeenCalledWith(ProductJira);
            expect(extractIssueKeys).toHaveBeenCalledWith(mockPullRequest, [mockCommit], [mockComment]);
            expect(pSettle).toHaveBeenCalledWith([expect.any(Promise)]);
            expect(result).toEqual([mockMinimalIssue]);
        });

        it('should return empty array when no Jira sites available', async () => {
            mockSiteManager.productHasAtLeastOneSite.mockReturnValue(false);

            const result = await api.fetchRelatedJiraIssues(mockPullRequest, [mockCommit], [mockComment]);

            expect(result).toEqual([]);
        });

        it('should handle errors and return empty array', async () => {
            mockSiteManager.productHasAtLeastOneSite.mockReturnValue(true);
            (extractIssueKeys as jest.Mock).mockRejectedValue(new Error('API Error'));

            const result = await api.fetchRelatedJiraIssues(mockPullRequest, [mockCommit], [mockComment]);

            expect(Logger.debug).toHaveBeenCalledWith('error fetching related jira issues: ', expect.any(Error));
            expect(result).toEqual([]);
        });
    });

    describe('merge', () => {
        it('should merge pull request and update issues', async () => {
            const mockBbApi = {
                pullrequests: {
                    merge: jest.fn().mockResolvedValue(mockPullRequest),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);
            (isMinimalIssue as any).mockReturnValue(true);
            (transitionIssue as jest.Mock).mockResolvedValue(undefined);

            // Create an issue with a transition that matches the current status (as the code requires)
            const issueWithMatchingTransition = {
                ...mockMinimalIssue,
                transitions: [
                    {
                        id: 'in-progress-transition',
                        name: 'In Progress',
                        hasScreen: false,
                        isConditional: false,
                        isGlobal: false,
                        isInitial: false,
                        to: {
                            id: 'in-progress', // This matches the current status id
                            name: 'In Progress',
                            description: 'Work is in progress',
                            iconUrl: 'https://icon.url',
                            self: 'https://self.url',
                            statusCategory: {
                                id: 4,
                                key: 'indeterminate',
                                colorName: 'yellow',
                                name: 'In Progress',
                                self: 'https://category.url',
                            },
                        },
                    },
                ] as any,
            };

            const result = await api.merge(mockPullRequest, mockMergeStrategy, 'Merge commit message', true, [
                issueWithMatchingTransition,
            ]);

            expect(mockBbApi.pullrequests.merge).toHaveBeenCalledWith(
                mockPullRequest,
                true,
                mockMergeStrategy.value,
                'Merge commit message',
            );
            expect(transitionIssue).toHaveBeenCalledWith(
                issueWithMatchingTransition,
                issueWithMatchingTransition.transitions[0],
                {
                    source: 'mergePullRequest',
                },
            );
            expect(mockCommands.executeCommand).toHaveBeenCalledWith(Commands.BitbucketRefreshPullRequests);
            expect(mockCommands.executeCommand).toHaveBeenCalledWith(Commands.RefreshPipelines);
            expect(result).toBe(mockPullRequest);
        });

        it('should handle merge without issues', async () => {
            const mockBbApi = {
                pullrequests: {
                    merge: jest.fn().mockResolvedValue(mockPullRequest),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            const result = await api.merge(mockPullRequest, mockMergeStrategy, 'Merge commit message', true, []);

            expect(result).toBe(mockPullRequest);
        });
    });

    describe('openJiraIssue', () => {
        it('should open Jira issue', async () => {
            (showIssue as jest.Mock).mockResolvedValue(undefined);

            await api.openJiraIssue(mockMinimalIssue);

            expect(showIssue).toHaveBeenCalledWith(mockMinimalIssue);
        });
    });

    describe('openBuildStatus', () => {
        it('should open pipeline for Bitbucket build URLs', async () => {
            const buildStatusWithBitbucketUrl = {
                ...mockBuildStatus,
                url: 'https://bitbucket.org/owner/repo/addon/pipelines/home#!/results/123',
            };
            const mockPipeline = { id: '123', name: 'test-pipeline' };
            const mockBbApi = {
                pipelines: {
                    getPipeline: jest.fn().mockResolvedValue(mockPipeline),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            await api.openBuildStatus(mockPullRequest, buildStatusWithBitbucketUrl);

            expect(mockBbApi.pipelines.getPipeline).toHaveBeenCalledWith(mockSite, '123');
            expect(mockCommands.executeCommand).toHaveBeenCalledWith(Commands.ShowPipeline, mockPipeline);
        });

        it('should open external URL for non-Bitbucket build URLs', async () => {
            const buildStatusWithExternalUrl = {
                ...mockBuildStatus,
                url: 'https://external-ci.com/build/123',
            };

            await api.openBuildStatus(mockPullRequest, buildStatusWithExternalUrl);

            expect(mockEnv.openExternal).toHaveBeenCalledWith(expect.objectContaining({}));
        });

        it('should open external URL when pipeline not found', async () => {
            const buildStatusWithBitbucketUrl = {
                ...mockBuildStatus,
                url: 'https://bitbucket.org/owner/repo/addon/pipelines/home#!/results/123',
            };
            const mockBbApi = {
                pipelines: {
                    getPipeline: jest.fn().mockResolvedValue(null),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            await api.openBuildStatus(mockPullRequest, buildStatusWithBitbucketUrl);

            expect(mockEnv.openExternal).toHaveBeenCalledWith(expect.objectContaining({}));
        });
    });

    describe('getTasks', () => {
        it('should fetch tasks and update comment hierarchies', async () => {
            const mockBbApi = {
                pullrequests: {
                    getTasks: jest.fn().mockResolvedValue([mockTask]),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            const result = await api.getTasks(mockPullRequest, [mockComment], [mockComment]);

            expect(mockBbApi.pullrequests.getTasks).toHaveBeenCalledWith(mockPullRequest);
            expect(addTasksToCommentHierarchy).toHaveBeenCalledTimes(2);
            expect(result).toEqual({
                tasks: [mockTask],
                pageComments: [mockComment],
                inlineComments: [mockComment],
            });
        });
    });

    describe('createTask', () => {
        it('should create standalone task', async () => {
            const mockBbApi = {
                pullrequests: {
                    postTask: jest.fn().mockResolvedValue(mockTask),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            const result = await api.createTask([mockTask], [mockComment], mockPullRequest, 'New task content');

            expect(mockBbApi.pullrequests.postTask).toHaveBeenCalledWith(
                mockSite,
                mockPullRequest.data.id,
                'New task content',
                undefined,
            );
            expect(result).toEqual({
                tasks: [mockTask, mockTask],
                comments: [mockComment],
            });
        });

        it('should create task attached to comment', async () => {
            const mockBbApi = {
                pullrequests: {
                    postTask: jest.fn().mockResolvedValue(mockTask),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            const result = await api.createTask(
                [mockTask],
                [mockComment],
                mockPullRequest,
                'New task content',
                'comment-123',
            );

            expect(mockBbApi.pullrequests.postTask).toHaveBeenCalledWith(
                mockSite,
                mockPullRequest.data.id,
                'New task content',
                'comment-123',
            );
            expect(addTaskToCommentHierarchy).toHaveBeenCalledWith([mockComment], mockTask);
            expect(result).toEqual({
                tasks: [mockTask, mockTask],
                comments: [mockComment],
            });
        });
    });

    describe('editTask', () => {
        it('should edit task and update hierarchies', async () => {
            const taskWithCommentId = { ...mockTask, commentId: 'comment-123' };
            const mockBbApi = {
                pullrequests: {
                    editTask: jest.fn().mockResolvedValue(taskWithCommentId),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            const result = await api.editTask([mockTask], [mockComment], mockPullRequest, taskWithCommentId);

            expect(mockBbApi.pullrequests.editTask).toHaveBeenCalledWith(
                mockSite,
                mockPullRequest.data.id,
                taskWithCommentId,
            );
            expect(replaceTaskInTaskList).toHaveBeenCalledWith([mockTask], taskWithCommentId);
            expect(replaceTaskInCommentHierarchy).toHaveBeenCalledWith([mockComment], taskWithCommentId);
            expect(result).toEqual({
                tasks: [mockTask],
                comments: [mockComment],
            });
        });

        it('should handle task without comment ID', async () => {
            const taskWithoutCommentId = { ...mockTask, commentId: undefined };
            const mockBbApi = {
                pullrequests: {
                    editTask: jest.fn().mockResolvedValue(taskWithoutCommentId),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            const result = await api.editTask([mockTask], [mockComment], mockPullRequest, taskWithoutCommentId);

            expect(replaceTaskInCommentHierarchy).not.toHaveBeenCalled();
            expect(result).toEqual({
                tasks: [mockTask],
                comments: [mockComment],
            });
        });
    });

    describe('deleteTask', () => {
        it('should delete task and refetch comments and tasks', async () => {
            const mockBbApi = {
                pullrequests: {
                    deleteTask: jest.fn().mockResolvedValue(undefined),
                    getComments: jest.fn().mockResolvedValue({ data: [mockComment] }),
                    getTasks: jest.fn().mockResolvedValue([mockTask]),
                },
            };
            (clientForSite as jest.Mock).mockResolvedValue(mockBbApi);

            // Mock the getTasks method on the API instance
            const getTasksSpy = jest.spyOn(api, 'getTasks').mockResolvedValue({
                tasks: [mockTask],
                pageComments: [mockComment],
                inlineComments: [],
            });

            const result = await api.deleteTask(mockPullRequest, mockTask);

            expect(mockBbApi.pullrequests.deleteTask).toHaveBeenCalledWith(mockSite, mockPullRequest.data.id, mockTask);
            expect(getTasksSpy).toHaveBeenCalledWith(mockPullRequest, [mockComment], []);
            expect(result).toEqual({
                tasks: [mockTask],
                comments: [mockComment],
            });

            getTasksSpy.mockRestore();
        });
    });
});
