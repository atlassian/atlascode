import { DetailedSiteInfo } from 'src/atlclients/authInfo';
import { Remote } from 'src/typings/git';
import { expansionCastTo } from 'testsutil';
import * as vscode from 'vscode';

import {
    BitbucketSite,
    Comment,
    FileDiff,
    FileStatus,
    PaginatedComments,
    PullRequest,
    PullRequestData,
    Repo,
    Reviewer,
    WorkspaceRepo,
} from '../../bitbucket/model';
import { configuration } from '../../config/configuration';
import { Container } from '../../container';
import { addTasksToCommentHierarchy } from '../../webview/common/pullRequestHelperActions';
import { PullRequestFilesNode } from '../nodes/pullRequestFilesNode';
import * as diffViewHelper from './diffViewHelper';
import { PullRequestCommentController } from './prCommentController';

// Mock dependencies
jest.mock('../../container', () => ({
    Container: {
        bitbucketContext: {
            getRepositoryScm: jest.fn(),
            prCommentController: {
                provideComments: jest.fn(),
            },
        },
    },
}));

jest.mock('../../config/configuration', () => ({
    configuration: {
        get: jest.fn(),
    },
}));

jest.mock('../pullRequestNodeDataProvider', () => ({
    PullRequestNodeDataProvider: {
        SCHEME: 'atlascode',
    },
}));

jest.mock('../../webview/common/pullRequestHelperActions', () => ({
    addTasksToCommentHierarchy: jest.fn(),
}));

jest.mock('path', () => ({
    default: {
        basename: jest.fn().mockReturnValue('directory'),
        dirname: jest.fn().mockReturnValue('directory'),
    },
}));

describe('diffViewHelper', () => {
    // Reset mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getArgsForDiffView', () => {
        it('should correctly prepare diff view arguments', async () => {
            // Arrange
            const mockScm = {
                getMergeBase: jest.fn().mockResolvedValue('mergebase-hash'),
            };

            (Container.bitbucketContext.getRepositoryScm as jest.Mock).mockReturnValue(mockScm);

            const allComments: PaginatedComments = {
                data: [
                    expansionCastTo<Comment>({
                        id: '1',
                        inline: { path: 'path/to/old.js', from: 1 },
                        children: [],
                    }),
                    expansionCastTo<Comment>({
                        id: '2',
                        inline: { path: 'path/to/new.js' },
                        children: [],
                    }),
                ],
            };

            const fileDiff: FileDiff = {
                status: FileStatus.MODIFIED,
                linesAdded: 5,
                linesRemoved: 3,
                oldPath: 'path/to/old.js',
                newPath: 'path/to/new.js',
                hunkMeta: {
                    oldPathAdditions: [1, 2, 3],
                    oldPathDeletions: [4, 5],
                    newPathAdditions: [6, 7, 8],
                    newPathDeletions: [9, 10],
                    newPathContextMap: { '1': 1, '2': 2 },
                },
            };

            const conflictedFiles: string[] = [];

            const pullRequest = expansionCastTo<PullRequest>({
                site: expansionCastTo<BitbucketSite>({
                    details: expansionCastTo<DetailedSiteInfo>({ name: 'site1', id: 'site1' }),
                }),
                data: expansionCastTo<PullRequestData>({
                    id: 'pr1',
                    url: 'http://example.com/pr1',
                    destination: {
                        branchName: 'main',
                        commitHash: 'dest-commit-hash',
                        repo: expansionCastTo<Repo>({ url: 'http://example.com/dest-repo' }),
                    },
                    source: {
                        branchName: 'feature',
                        commitHash: 'source-commit-hash',
                        repo: expansionCastTo<Repo>({ url: 'http://example.com/source-repo' }),
                    },
                    participants: [expansionCastTo<Reviewer>({ accountId: 'user1' })],
                }),
                workspaceRepo: expansionCastTo<WorkspaceRepo>({
                    rootUri: '/path/to/repo',
                    mainSiteRemote: {
                        remote: expansionCastTo<Remote>({ name: 'origin' }),
                    },
                }),
            });

            const commentController = expansionCastTo<PullRequestCommentController>({
                provideComments: jest.fn(),
            });

            // Mock the vscode.Uri.parse method
            const mockParse = jest.fn();
            const mockWith = jest.fn();

            mockParse.mockReturnValue({
                with: mockWith,
            });

            mockWith.mockReturnValue('uri-value');

            const originalUriParse = vscode.Uri.parse;
            vscode.Uri.parse = mockParse;

            // Act
            const result = await diffViewHelper.getArgsForDiffView(
                allComments,
                fileDiff,
                conflictedFiles,
                pullRequest,
                commentController,
            );

            // Assert
            expect(result).toBeDefined();
            expect(result.fileDisplayData).toBeDefined();
            expect(result.diffArgs).toHaveLength(4);
            expect(result.fileDisplayData.prUrl).toBe('http://example.com/pr1');
            expect(typeof result.diffArgs[0]).toBe('function');

            // Restore the original method
            vscode.Uri.parse = originalUriParse;
        });

        it('should handle conflicts correctly', async () => {
            // Arrange
            const mockScm = {
                getMergeBase: jest.fn().mockResolvedValue('mergebase-hash'),
            };

            (Container.bitbucketContext.getRepositoryScm as jest.Mock).mockReturnValue(mockScm);

            const allComments: PaginatedComments = {
                data: [],
            };

            const fileDiff: FileDiff = {
                // @ts-ignore - we're specifically testing how it handles 'merge conflict'
                status: 'merge conflict',
                linesAdded: 0,
                linesRemoved: 0,
                oldPath: 'path/to/conflicted.js',
                newPath: 'path/to/conflicted.js',
                hunkMeta: {
                    oldPathAdditions: [],
                    oldPathDeletions: [],
                    newPathAdditions: [],
                    newPathDeletions: [],
                    newPathContextMap: {},
                },
            };

            const conflictedFiles: string[] = ['path/to/conflicted.js'];

            const pullRequest = expansionCastTo<PullRequest>({
                site: expansionCastTo<BitbucketSite>({
                    details: expansionCastTo<DetailedSiteInfo>({ name: 'site1', id: 'site1' }),
                }),
                data: expansionCastTo<PullRequestData>({
                    id: 'pr1',
                    url: 'http://example.com/pr1',
                    destination: {
                        branchName: 'main',
                        commitHash: 'dest-commit-hash',
                        repo: expansionCastTo<Repo>({ url: 'http://example.com/dest-repo' }),
                    },
                    source: {
                        branchName: 'feature',
                        commitHash: 'source-commit-hash',
                        repo: expansionCastTo<Repo>({ url: 'http://example.com/source-repo' }),
                    },
                    participants: [],
                }),
                workspaceRepo: expansionCastTo<WorkspaceRepo>({
                    rootUri: '/path/to/repo',
                    mainSiteRemote: {
                        remote: expansionCastTo<Remote>({ name: 'origin' }),
                    },
                }),
            });

            const commentController = {
                provideComments: jest.fn(),
            } as unknown as PullRequestCommentController;

            // Mock URI functionality
            const mockParse = jest.fn();
            const mockWith = jest.fn();

            mockParse.mockReturnValue({
                with: mockWith,
            });

            mockWith.mockReturnValue('uri-value');

            const originalUriParse = vscode.Uri.parse;
            vscode.Uri.parse = mockParse;

            // Act
            const result = await diffViewHelper.getArgsForDiffView(
                allComments,
                fileDiff,
                conflictedFiles,
                pullRequest,
                commentController,
            );

            // Assert
            expect(result).toBeDefined();
            expect(result.fileDisplayData.fileDisplayName).toContain('⚠️ CONFLICTED:');
            expect(result.fileDisplayData.isConflicted).toBe(true);

            // Restore the original method
            vscode.Uri.parse = originalUriParse;
        });
    });

    describe('createFileChangesNodes', () => {
        let mockGetArgsForDiffView: jest.SpyInstance;

        beforeEach(() => {
            // Mock getArgsForDiffView since we're testing createFileChangesNodes in isolation
            mockGetArgsForDiffView = jest.spyOn(diffViewHelper, 'getArgsForDiffView');
        });

        afterEach(() => {
            mockGetArgsForDiffView.mockRestore();
        });

        it('should create flat structure when nesting is disabled', async () => {
            // Arrange
            (configuration.get as jest.Mock).mockReturnValue(false); // Disable nesting
            (addTasksToCommentHierarchy as jest.Mock).mockImplementation((comments) => comments); // Return input comments unchanged

            const pr = expansionCastTo<PullRequest>({
                site: expansionCastTo<BitbucketSite>({
                    details: expansionCastTo<DetailedSiteInfo>({ name: 'site1', id: 'site1' }),
                }),
                data: expansionCastTo<PullRequestData>({
                    id: 'pr1',
                    url: 'http://example.com/pr1',
                    destination: {
                        branchName: 'main',
                        commitHash: 'dest-hash',
                        repo: expansionCastTo<Repo>({ url: 'http://example.com/dest-repo' }),
                    },
                    source: {
                        branchName: 'feature',
                        commitHash: 'source-hash',
                        repo: expansionCastTo<Repo>({ url: 'http://example.com/source-repo' }),
                    },
                    participants: [],
                }),
            });

            const allComments: PaginatedComments = { data: [] };

            const fileDiffs: FileDiff[] = [
                {
                    status: FileStatus.MODIFIED,
                    linesAdded: 5,
                    linesRemoved: 3,
                    oldPath: 'file1.js',
                    newPath: 'file1.js',
                    hunkMeta: {
                        oldPathAdditions: [],
                        oldPathDeletions: [],
                        newPathAdditions: [],
                        newPathDeletions: [],
                        newPathContextMap: {},
                    },
                },
                {
                    status: FileStatus.ADDED,
                    linesAdded: 10,
                    linesRemoved: 0,
                    oldPath: undefined,
                    newPath: 'file2.js',
                    hunkMeta: {
                        oldPathAdditions: [],
                        oldPathDeletions: [],
                        newPathAdditions: [],
                        newPathDeletions: [],
                        newPathContextMap: {},
                    },
                },
            ];

            const conflictedFiles: string[] = [];
            const tasks: any[] = [];

            // Mock getArgsForDiffView to return test data
            mockGetArgsForDiffView.mockImplementation((_, fileDiff) => {
                return Promise.resolve({
                    diffArgs: ['mock-diff-args'],
                    fileDisplayData: {
                        prUrl: 'http://example.com/pr1',
                        fileDisplayName: fileDiff.newPath || fileDiff.oldPath,
                        fileDiffStatus: fileDiff.status,
                        numberOfComments: 0,
                    },
                });
            });

            // Act
            const result = await diffViewHelper.createFileChangesNodes(
                pr,
                allComments,
                fileDiffs,
                conflictedFiles,
                tasks,
            );

            // Assert
            expect(result).toHaveLength(2);
            expect(result[0].constructor.name).toBe('PullRequestFilesNode');
            expect(result[1].constructor.name).toBe('PullRequestFilesNode');
        });

        it('should add warning node when there are more comments than supported', async () => {
            // Arrange
            (configuration.get as jest.Mock).mockReturnValue(false); // Disable nesting
            (addTasksToCommentHierarchy as jest.Mock).mockImplementation((comments) => comments); // Return input comments unchanged

            const pr = expansionCastTo<PullRequest>({
                site: expansionCastTo<BitbucketSite>({
                    details: expansionCastTo<DetailedSiteInfo>({ name: 'site1', id: 'site1' }),
                }),
                data: expansionCastTo<PullRequestData>({
                    id: 'pr1',
                    url: 'http://example.com/pr1',
                    destination: {
                        branchName: 'main',
                        commitHash: 'dest-hash',
                        repo: expansionCastTo<Repo>({ url: 'http://example.com/dest-repo' }),
                    },
                    source: {
                        branchName: 'feature',
                        commitHash: 'source-hash',
                        repo: expansionCastTo<Repo>({ url: 'http://example.com/source-repo' }),
                    },
                    participants: [],
                }),
            });

            // Create pagination with "next" page to trigger the warning
            const allComments: PaginatedComments = {
                data: [],
                next: 'http://example.com/comments/next',
            };

            const fileDiffs: FileDiff[] = [
                {
                    status: FileStatus.MODIFIED,
                    linesAdded: 5,
                    linesRemoved: 3,
                    oldPath: 'file1.js',
                    newPath: 'file1.js',
                    hunkMeta: {
                        oldPathAdditions: [],
                        oldPathDeletions: [],
                        newPathAdditions: [],
                        newPathDeletions: [],
                        newPathContextMap: {},
                    },
                },
            ];

            const conflictedFiles: string[] = [];
            const tasks: any[] = [];

            // Mock getArgsForDiffView to return test data
            mockGetArgsForDiffView.mockImplementation((_, fileDiff) => {
                return Promise.resolve({
                    diffArgs: ['mock-diff-args'],
                    fileDisplayData: {
                        prUrl: 'http://example.com/pr1',
                        fileDisplayName: fileDiff.newPath || fileDiff.oldPath,
                        fileDiffStatus: fileDiff.status,
                        numberOfComments: 0,
                    },
                });
            });

            // Act
            const result = await diffViewHelper.createFileChangesNodes(
                pr,
                allComments,
                fileDiffs,
                conflictedFiles,
                tasks,
            );

            // Assert
            expect(result).toHaveLength(2);
            expect(result[0].constructor.name).toBe('PullRequestFilesNode');
            expect(result[1].constructor.name).toBe('SimpleNode');
            // Check that the SimpleNode contains the warning message
            const simpleNode = await result[1].getTreeItem();
            expect(simpleNode?.label).toContain('⚠️ All file comments are not shown');
        });

        it('should create nested structure when nesting is enabled', async () => {
            // Arrange
            (configuration.get as jest.Mock).mockReturnValue(true); // Enable nesting
            (addTasksToCommentHierarchy as jest.Mock).mockImplementation((comments) => comments); // Return input comments unchanged

            const pr = expansionCastTo<PullRequest>({
                site: expansionCastTo<BitbucketSite>({
                    details: expansionCastTo<DetailedSiteInfo>({ name: 'site1', id: 'site1' }),
                }),
                data: expansionCastTo<PullRequestData>({
                    id: 'pr1',
                    url: 'http://example.com/pr1',
                    destination: {
                        branchName: 'main',
                        commitHash: 'dest-hash',
                        repo: expansionCastTo<Repo>({ url: 'http://example.com/dest-repo' }),
                    },
                    source: {
                        branchName: 'feature',
                        commitHash: 'source-hash',
                        repo: expansionCastTo<Repo>({ url: 'http://example.com/source-repo' }),
                    },
                    participants: [],
                }),
            });

            const allComments: PaginatedComments = { data: [] };

            const fileDiffs: FileDiff[] = [
                {
                    status: FileStatus.MODIFIED,
                    linesAdded: 5,
                    linesRemoved: 3,
                    oldPath: 'src/components/Button.jsx',
                    newPath: 'src/components/Button.jsx',
                    hunkMeta: {
                        oldPathAdditions: [],
                        oldPathDeletions: [],
                        newPathAdditions: [],
                        newPathDeletions: [],
                        newPathContextMap: {},
                    },
                },
                {
                    status: FileStatus.ADDED,
                    linesAdded: 10,
                    linesRemoved: 0,
                    oldPath: undefined,
                    newPath: 'src/utils/helpers.js',
                    hunkMeta: {
                        oldPathAdditions: [],
                        oldPathDeletions: [],
                        newPathAdditions: [],
                        newPathDeletions: [],
                        newPathContextMap: {},
                    },
                },
            ];

            const conflictedFiles: string[] = [];
            const tasks: any[] = [];

            // Mock getArgsForDiffView to return test data with nested paths
            mockGetArgsForDiffView.mockImplementation((_, fileDiff) => {
                return Promise.resolve({
                    diffArgs: ['mock-diff-args'],
                    fileDisplayData: {
                        prUrl: 'http://example.com/pr1',
                        fileDisplayName: fileDiff.newPath || fileDiff.oldPath,
                        fileDiffStatus: fileDiff.status,
                        numberOfComments: 0,
                    },
                });
            });

            // Act
            const result = await diffViewHelper.createFileChangesNodes(
                pr,
                allComments,
                fileDiffs,
                conflictedFiles,
                tasks,
            );

            // Assert
            expect(result.length).toBeGreaterThan(0);

            // In nested mode, there should be directory nodes
            // We expect to get a 'src' directory node that contains components and utils directories
            const srcDirExists = result.some((node) => node.constructor.name === 'DirectoryNode');
            expect(srcDirExists).toBeTruthy();
        });

        it('should handle file conflicts correctly', async () => {
            // Arrange
            (configuration.get as jest.Mock).mockReturnValue(false); // Disable nesting
            (addTasksToCommentHierarchy as jest.Mock).mockImplementation((comments) => comments); // Return input comments unchanged

            const pr = expansionCastTo<PullRequest>({
                site: expansionCastTo<BitbucketSite>({
                    details: expansionCastTo<DetailedSiteInfo>({ name: 'site1', id: 'site1' }),
                }),
                data: expansionCastTo<PullRequestData>({
                    id: 'pr1',
                    url: 'http://example.com/pr1',
                    destination: {
                        branchName: 'main',
                        commitHash: 'dest-hash',
                        repo: expansionCastTo<Repo>({ url: 'http://example.com/dest-repo' }),
                    },
                    source: {
                        branchName: 'feature',
                        commitHash: 'source-hash',
                        repo: expansionCastTo<Repo>({ url: 'http://example.com/source-repo' }),
                    },
                    participants: [],
                }),
            });

            const allComments: PaginatedComments = { data: [] };

            const fileDiffs: FileDiff[] = [
                {
                    status: FileStatus.MODIFIED,
                    linesAdded: 5,
                    linesRemoved: 3,
                    oldPath: 'src/conflict.js',
                    newPath: 'src/conflict.js',
                    hunkMeta: {
                        oldPathAdditions: [],
                        oldPathDeletions: [],
                        newPathAdditions: [],
                        newPathDeletions: [],
                        newPathContextMap: {},
                    },
                },
            ];

            const conflictedFiles: string[] = ['src/conflict.js'];
            const tasks: any[] = [];

            // Mock getArgsForDiffView to include conflict information
            mockGetArgsForDiffView.mockImplementation((_, fileDiff, conflictedFiles) => {
                const isConflicted =
                    conflictedFiles.includes(fileDiff.newPath || '') ||
                    conflictedFiles.includes(fileDiff.oldPath || '');

                return Promise.resolve({
                    diffArgs: ['mock-diff-args'],
                    fileDisplayData: {
                        prUrl: 'http://example.com/pr1',
                        fileDisplayName: isConflicted
                            ? `⚠️ CONFLICTED: ${fileDiff.newPath || fileDiff.oldPath}`
                            : fileDiff.newPath || fileDiff.oldPath,
                        fileDiffStatus: fileDiff.status,
                        numberOfComments: 0,
                        isConflicted,
                    },
                });
            });

            // Act
            const result = await diffViewHelper.createFileChangesNodes(
                pr,
                allComments,
                fileDiffs,
                conflictedFiles,
                tasks,
            );

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].constructor.name).toBe('PullRequestFilesNode');

            // Get the file display data to check if conflict was handled
            const fileNode = result[0] as PullRequestFilesNode;
            expect(fileNode['diffViewData'].fileDisplayData.isConflicted).toBe(true);
            expect(fileNode['diffViewData'].fileDisplayData.fileDisplayName).toEqual('src/conflict.js');
        });

        it('should process comments and tasks', async () => {
            // Arrange
            (configuration.get as jest.Mock).mockReturnValue(false);

            // Create a mock implementation for addTasksToCommentHierarchy that adds tasks to comments
            const mockComments = [{ id: 'comment1', children: [] }];
            const mockTasks = [{ id: 'task1', text: 'Test task' }];
            const mockCommentsWithTasks = [
                { id: 'comment1', children: [], tasks: [{ id: 'task1', text: 'Test task' }] },
            ];

            (addTasksToCommentHierarchy as jest.Mock).mockReturnValue(mockCommentsWithTasks);

            const pr = expansionCastTo<PullRequest>({
                site: expansionCastTo<BitbucketSite>({
                    details: expansionCastTo<DetailedSiteInfo>({ name: 'site1', id: 'site1' }),
                }),
                data: expansionCastTo<PullRequestData>({
                    id: 'pr1',
                    url: 'http://example.com/pr1',
                    destination: {
                        branchName: 'main',
                        commitHash: 'dest-hash',
                        repo: expansionCastTo<Repo>({ url: 'http://example.com/dest-repo' }),
                    },
                    source: {
                        branchName: 'feature',
                        commitHash: 'source-hash',
                        repo: expansionCastTo<Repo>({ url: 'http://example.com/source-repo' }),
                    },
                    participants: [],
                }),
            });

            const allComments: PaginatedComments = {
                data: mockComments as any[],
            };

            const fileDiffs: FileDiff[] = [
                {
                    status: FileStatus.MODIFIED,
                    linesAdded: 5,
                    linesRemoved: 3,
                    oldPath: 'src/file.js',
                    newPath: 'src/file.js',
                    hunkMeta: {
                        oldPathAdditions: [],
                        oldPathDeletions: [],
                        newPathAdditions: [],
                        newPathDeletions: [],
                        newPathContextMap: {},
                    },
                },
            ];

            const conflictedFiles: string[] = [];
            const tasks = mockTasks as any[];

            // Mock getArgsForDiffView
            mockGetArgsForDiffView.mockImplementation(() => {
                return Promise.resolve({
                    diffArgs: ['mock-diff-args'],
                    fileDisplayData: {
                        prUrl: 'http://example.com/pr1',
                        fileDisplayName: 'src/file.js',
                        fileDiffStatus: FileStatus.MODIFIED,
                        numberOfComments: 1,
                    },
                });
            });

            // Act
            await diffViewHelper.createFileChangesNodes(pr, allComments, fileDiffs, conflictedFiles, tasks);

            // Assert
            // Verify that addTasksToCommentHierarchy was called with the correct arguments
            expect(addTasksToCommentHierarchy).toHaveBeenCalledWith(mockComments, mockTasks);
        });
    });
});
