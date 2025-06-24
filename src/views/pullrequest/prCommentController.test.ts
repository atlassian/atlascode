import { expansionCastTo } from 'testsutil';
import * as vscode from 'vscode';
import { CommentThread, CommentThreadCollapsibleState, ExtensionContext, MarkdownString, Range, Uri } from 'vscode';

import { clientForSite } from '../../bitbucket/bbUtils';
import { PullRequestCommentController } from './prCommentController';

jest.mock('../../bitbucket/bbUtils', () => ({
    clientForSite: jest.fn(),
}));

jest.mock('../../container', () => ({
    Container: {
        bitbucketContext: {
            getRepository: jest.fn(),
        },
        analyticsClient: {
            sendTrackEvent: jest.fn(),
        },
    },
}));

jest.mock('uuid', () => ({
    v4: jest.fn().mockReturnValue('mock-uuid'),
}));

jest.mock('../../analytics', () => ({
    prCommentEvent: jest.fn().mockResolvedValue({}),
    prTaskEvent: jest.fn().mockResolvedValue({}),
    fileCheckoutEvent: jest.fn().mockResolvedValue({}),
}));

jest.mock('./gitActions', () => ({
    checkoutPRBranch: jest.fn(),
}));

jest.mock('turndown', () => ({
    default: jest.fn().mockReturnValue({
        addRule: jest.fn(),
        turndown: jest.fn().mockReturnValue('turndown'),
    }),
}));

describe('PullRequestCommentController', () => {
    let controller: PullRequestCommentController;
    let mockContext: ExtensionContext;
    let mockCommentController: any;
    let mockBBApi: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Set up mock context
        mockContext = expansionCastTo<ExtensionContext>({
            subscriptions: [],
        });

        // Set up mock comment controller
        mockCommentController = {
            dispose: jest.fn(),
            createCommentThread: jest.fn().mockImplementation((uri, range, comments) => {
                return {
                    uri,
                    range,
                    comments,
                    dispose: jest.fn(),
                    collapsibleState: CommentThreadCollapsibleState.Expanded,
                    label: '',
                };
            }),
            commentingRangeProvider: undefined,
        };

        // Set up mock BB API
        mockBBApi = {
            pullrequests: {
                postComment: jest.fn(),
                editComment: jest.fn(),
                deleteComment: jest.fn(),
                postTask: jest.fn(),
                editTask: jest.fn(),
                deleteTask: jest.fn(),
                get: jest.fn(),
            },
        };

        (vscode as any).comments = {
            createCommentController: jest.fn().mockReturnValue(mockCommentController),
        };

        (clientForSite as jest.Mock).mockResolvedValue(mockBBApi);

        controller = new PullRequestCommentController(mockContext);
    });

    describe('constructor', () => {
        it('should create a comment controller and register command handlers', () => {
            expect(vscode.comments.createCommentController).toHaveBeenCalledWith(
                'bbpr',
                'Bitbucket pullrequest comments',
            );
            expect(vscode.commands.registerCommand).toHaveBeenCalledTimes(13);
            expect(vscode.languages.registerCompletionItemProvider).toHaveBeenCalled();
            expect(mockContext.subscriptions.length).toBeGreaterThan(0);
        });

        it('should set up commentingRangeProvider', () => {
            expect(mockCommentController.commentingRangeProvider).toBeDefined();
        });

        it('should provide commenting ranges for cloud sites', () => {
            const mockDocument = {
                uri: {
                    scheme: 'atlascode.bbpr',
                    query: JSON.stringify({
                        site: { details: { isCloud: true } },
                        lhs: false,
                        addedLines: [1, 2],
                        deletedLines: [3, 4],
                        lineContextMap: { '1': 10 },
                    }),
                },
                lineCount: 50,
            };

            const ranges = mockCommentController.commentingRangeProvider.provideCommentingRanges(
                mockDocument,
                {} as any,
            );
            expect(ranges).toEqual([new vscode.Range(0, 0, 49, 0)]);
        });

        it('should provide commenting ranges for server sites', () => {
            const mockDocument = {
                uri: {
                    scheme: 'atlascode.bbpr',
                    query: JSON.stringify({
                        site: { details: { isCloud: false } },
                        lhs: false,
                        addedLines: [1, 2],
                        deletedLines: [3, 4],
                        lineContextMap: { '1': 10, '2': 11 },
                    }),
                },
                lineCount: 50,
            };

            const ranges = mockCommentController.commentingRangeProvider.provideCommentingRanges(
                mockDocument,
                {} as any,
            );
            expect(ranges).toHaveLength(5); // addedLines + deletedLines + lineContextMap values (some duplicates removed)
        });

        it('should return undefined for non-PR scheme documents', () => {
            const mockDocument = {
                uri: {
                    scheme: 'file',
                    query: '{}',
                },
            };

            const ranges = mockCommentController.commentingRangeProvider.provideCommentingRanges(
                mockDocument,
                {} as any,
            );
            expect(ranges).toBeUndefined();
        });
    });

    describe('saveChangesPressed', () => {
        it('should do nothing if the comment body is empty', async () => {
            const comment = {
                body: '',
                saveChangesContext: 0,
            };

            await controller.saveChangesPressed(comment as any);
            expect(mockBBApi.pullrequests.editComment).not.toHaveBeenCalled();
        });

        it('should handle CREATINGTASK context', async () => {
            const mockThread = {
                uri: { query: JSON.stringify({ prHref: 'test-href' }) },
                range: new Range(0, 0, 0, 0),
                comments: [],
            };

            const comment = {
                body: 'Test task',
                saveChangesContext: 2, // CREATINGTASK
                prCommentThreadId: 'thread-1',
                parent: mockThread,
                task: { commentId: 'comment-1' },
                site: { details: {} },
                prId: 'pr-1',
                prHref: 'test-href',
            };

            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'addTask').mockResolvedValue([]);
            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'createOrUpdateThread').mockResolvedValue({});

            await controller.saveChangesPressed(comment as any);

            // @ts-ignore - Referencing a private method
            expect(controller.addTask).toHaveBeenCalled();
        });

        it('should handle CREATINGREPLY context', async () => {
            const mockThread = {
                uri: { query: JSON.stringify({ prHref: 'test-href' }) },
                range: new Range(0, 0, 0, 0),
                comments: [],
            };

            const comment = {
                body: 'Test reply',
                saveChangesContext: 3, // CREATINGREPLY
                prCommentThreadId: 'thread-1',
                parent: mockThread,
                tasks: [],
                site: { details: {} },
                prId: 'pr-1',
                prHref: 'test-href',
            };

            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'addReplyToComment').mockResolvedValue([]);
            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'createOrUpdateThread').mockResolvedValue({});

            await controller.saveChangesPressed(comment as any);

            // @ts-ignore - Referencing a private method
            expect(controller.addReplyToComment).toHaveBeenCalled();
        });

        it('should handle EDITINGCOMMENT context', async () => {
            const mockThread = {
                uri: { query: JSON.stringify({ prHref: 'test-href' }) },
                range: new Range(0, 0, 0, 0),
                comments: [],
            };

            const comment = {
                body: 'Edited comment',
                saveChangesContext: 0, // EDITINGCOMMENT
                prCommentThreadId: 'thread-1',
                parent: mockThread,
                tasks: [],
                site: { details: {} },
                prId: 'pr-1',
                prHref: 'test-href',
                id: 'comment-1',
            };

            mockBBApi.pullrequests.editComment.mockResolvedValue({
                id: 'comment-1',
                tasks: [],
            });

            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'replaceEditedComment').mockResolvedValue([]);
            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'createOrUpdateThread').mockResolvedValue({});

            await controller.saveChangesPressed(comment as any);

            expect(mockBBApi.pullrequests.editComment).toHaveBeenCalled();
        });

        it('should handle EDITINGTASK context', async () => {
            const mockThread = {
                uri: { query: JSON.stringify({ prHref: 'test-href' }) },
                range: new Range(0, 0, 0, 0),
                comments: [],
            };

            const comment = {
                body: 'Edited task',
                saveChangesContext: 1, // EDITINGTASK
                prCommentThreadId: 'thread-1',
                parent: mockThread,
                task: { id: 'task-1' },
                site: { details: {} },
                prId: 'pr-1',
                prHref: 'test-href',
            };

            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'updateTask').mockResolvedValue([]);
            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'createOrUpdateThread').mockResolvedValue({});

            await controller.saveChangesPressed(comment as any);

            // @ts-ignore - Referencing a private method
            expect(controller.updateTask).toHaveBeenCalled();
        });
    });

    describe('extractCommentText', () => {
        it('should extract text from MarkdownString body', () => {
            const comment = {
                body: new MarkdownString('Test comment'),
            } as any;

            // @ts-ignore - Referencing a private method - Accessing private method for testing
            const result = controller['extractCommentText'](comment);
            expect(result).toBe('Test comment');
        });

        it('should extract text from string body', () => {
            const comment = {
                body: 'Test comment',
            } as any;

            // @ts-ignore - Referencing a private method - Accessing private method for testing
            const result = controller['extractCommentText'](comment);
            expect(result).toBe('Test comment');
        });

        it('should throw error for invalid body type', () => {
            const comment = {
                body: 123,
            } as any;

            // @ts-ignore - Referencing a private method - Accessing private method for testing
            expect(() => controller['extractCommentText'](comment)).toThrow('Invalid comment body type');
        });
    });

    describe('addComment', () => {
        it('should add a new comment to thread', async () => {
            const mockReply = {
                text: 'New comment text',
                thread: {
                    uri: {
                        query: JSON.stringify({
                            site: { details: {} },
                            prId: 'pr-1',
                            prHref: 'test-href',
                            path: 'test.js',
                            lhs: false,
                            addedLines: [5],
                            deletedLines: [],
                            lineContextMap: {},
                            commitHash: 'hash1',
                            rhsCommitHash: 'hash2',
                            isCommitLevelDiff: false,
                        }),
                    },
                    range: new Range(4, 0, 4, 0),
                    comments: [],
                    dispose: jest.fn(),
                },
            };

            mockBBApi.pullrequests.postComment.mockResolvedValue({
                id: 'new-comment-id',
                user: { displayName: 'Test User', avatarUrl: 'avatar.png', accountId: 'user-1' },
                htmlContent: 'New comment text',
                tasks: [],
            });

            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'createVSCodeComment').mockResolvedValue({
                id: 'new-comment-id',
            });
            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'createOrUpdateThread').mockResolvedValue({});

            await controller.addComment(mockReply as any);

            expect(mockBBApi.pullrequests.postComment).toHaveBeenCalledWith(
                { details: {} },
                'pr-1',
                'New comment text',
                '',
                { from: undefined, to: 5, path: 'test.js' },
                undefined,
                'ADDED',
            );
        });
    });

    describe('deleteComment', () => {
        it('should delete a comment and update thread', async () => {
            const mockThread = {
                uri: { query: JSON.stringify({ prHref: 'test-href' }) },
                range: new Range(0, 0, 0, 0),
                comments: [{ id: 'comment-1' }, { id: 'comment-2' }],
                dispose: jest.fn(),
            };

            const comment = {
                prCommentThreadId: 'thread-1',
                parent: mockThread,
                site: { details: {} },
                prId: 'pr-1',
                id: 'comment-1',
                commitHash: 'hash1',
            };

            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'createOrUpdateThread').mockResolvedValue({});

            await controller.deleteComment(comment as any);

            expect(mockBBApi.pullrequests.deleteComment).toHaveBeenCalledWith(
                { details: {} },
                'pr-1',
                'comment-1',
                'hash1',
            );
            expect(mockThread.dispose).toHaveBeenCalled();
        });

        it('should handle missing parent or thread id', async () => {
            const comment = {
                prCommentThreadId: undefined,
                parent: undefined,
            };

            await controller.deleteComment(comment as any);

            expect(mockBBApi.pullrequests.deleteComment).not.toHaveBeenCalled();
        });
    });

    describe('deleteTask', () => {
        it('should delete a task and update thread', async () => {
            const mockThread = {
                uri: { query: JSON.stringify({ prHref: 'test-href' }) },
                range: new Range(0, 0, 0, 0),
                comments: [
                    {
                        id: 'comment-1',
                        tasks: [{ id: 'task-1' }, { id: 'task-2' }],
                    },
                ],
                dispose: jest.fn(),
            };

            const task = {
                prCommentThreadId: 'thread-1',
                parent: mockThread,
                site: { details: {} },
                prId: 'pr-1',
                id: 'task-1',
                task: { id: 'task-1', commentId: 'comment-1' },
            };

            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'createOrUpdateThread').mockResolvedValue({});

            await controller.deleteTask(task as any);

            expect(mockBBApi.pullrequests.deleteTask).toHaveBeenCalledWith({ details: {} }, 'pr-1', {
                id: 'task-1',
                commentId: 'comment-1',
            });
            expect(mockThread.dispose).toHaveBeenCalled();
        });
    });

    describe('addTask', () => {
        it('should add a new task to comment', async () => {
            const comments = [
                {
                    id: 'comment-1',
                    tasks: [],
                },
            ];

            const taskData = {
                site: { details: {} },
                prId: 'pr-1',
                body: 'New task content',
                task: { commentId: 'comment-1' },
            };

            mockBBApi.pullrequests.postTask.mockResolvedValue({
                id: 'task-1',
                commentId: 'comment-1',
                content: 'New task content',
            });

            const result = await controller.addTask(comments as any, taskData as any);

            expect(mockBBApi.pullrequests.postTask).toHaveBeenCalledWith(
                { details: {} },
                'pr-1',
                'New task content',
                'comment-1',
            );
            expect(result[0].tasks).toHaveLength(1);
            expect(result[0].tasks[0].id).toBe('task-1');
        });
    });

    describe('updateTask', () => {
        it('should update an existing task', async () => {
            const comments = [
                {
                    id: 'comment-1',
                    tasks: [{ id: 'task-1', content: 'Old content' }],
                },
            ];

            const taskData = {
                site: { details: {} },
                prId: 'pr-1',
                task: { id: 'task-1', commentId: 'comment-1' },
            };

            const newTaskData = {
                content: 'Updated content',
                isComplete: true,
            };

            mockBBApi.pullrequests.editTask.mockResolvedValue({
                id: 'task-1',
                commentId: 'comment-1',
                content: 'Updated content',
                isComplete: true,
            });

            const result = await controller['updateTask'](comments as any, taskData as any, newTaskData);

            expect(mockBBApi.pullrequests.editTask).toHaveBeenCalledWith({ details: {} }, 'pr-1', {
                id: 'task-1',
                commentId: 'comment-1',
                content: 'Updated content',
                isComplete: true,
            });
            expect(result[0].tasks[0].content).toBe('Updated content');
            expect(result[0].tasks[0].isComplete).toBe(true);
        });
    });

    describe('submitCommentEdit', () => {
        it('should submit comment edit for PR comment', async () => {
            const mockThread = {
                uri: { query: JSON.stringify({ prHref: 'test-href' }) },
                range: new Range(0, 0, 0, 0),
                comments: [],
                dispose: jest.fn(),
            };

            const comment = {
                body: 'Edited content',
                prCommentThreadId: 'thread-1',
                parent: mockThread,
                site: { details: {} },
                prId: 'pr-1',
                id: 'comment-1',
                tasks: [],
                commitHash: 'hash1',
            };

            mockBBApi.pullrequests.editComment.mockResolvedValue({
                id: 'comment-1',
                content: 'Edited content',
            });

            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'replaceEditedComment').mockResolvedValue([]);
            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'createOrUpdateThread').mockResolvedValue({});

            await controller.submitCommentEdit(comment as any);

            expect(mockBBApi.pullrequests.editComment).toHaveBeenCalled();
            expect(mockThread.dispose).toHaveBeenCalled();
        });

        it('should submit task edit for PR task', async () => {
            const mockThread = {
                uri: { query: JSON.stringify({ prHref: 'test-href' }) },
                range: new Range(0, 0, 0, 0),
                comments: [],
                dispose: jest.fn(),
            };

            const task = {
                body: 'Edited task content',
                prCommentThreadId: 'thread-1',
                parent: mockThread,
                site: { details: {} },
                prId: 'pr-1',
                task: { id: 'task-1' },
            };

            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'updateTask').mockResolvedValue([]);
            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'createOrUpdateThread').mockResolvedValue({});

            await controller.submitCommentEdit(task as any);

            // @ts-ignore - Referencing a private method
            expect(controller.updateTask).toHaveBeenCalled();
            expect(mockThread.dispose).toHaveBeenCalled();
        });

        it('should do nothing for empty body', async () => {
            const comment = {
                body: '',
                prCommentThreadId: 'thread-1',
                parent: {},
            };

            await controller.submitCommentEdit(comment as any);

            expect(mockBBApi.pullrequests.editComment).not.toHaveBeenCalled();
        });
    });

    describe('addReplyToComment', () => {
        it('should add a reply to existing comment', async () => {
            const mockThread = {
                uri: {
                    query: JSON.stringify({
                        site: { details: {} },
                        prId: 'pr-1',
                        prHref: 'test-href',
                        path: 'test.js',
                        lhs: false,
                        addedLines: [5],
                        deletedLines: [],
                        lineContextMap: {},
                        commitHash: 'hash1',
                        rhsCommitHash: 'hash2',
                        isCommitLevelDiff: false,
                    }),
                },
                range: new Range(4, 0, 4, 0),
                comments: [{ id: 'comment-1', prCommentThreadId: 'thread-1' }],
            };

            const commentData = {
                parent: mockThread,
                site: { details: {} },
                prId: 'pr-1',
                body: 'Reply content',
                parentCommentId: 'comment-1',
                prHref: 'test-href',
            };

            const comments = [
                {
                    id: 'comment-1',
                    tasks: [],
                    temporaryReply: { id: 'temp-reply' },
                },
            ];

            mockBBApi.pullrequests.postComment.mockResolvedValue({
                id: 'reply-1',
                user: { displayName: 'Test User', avatarUrl: 'avatar.png', accountId: 'user-1' },
                htmlContent: 'Reply content',
                tasks: [],
            });

            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'createVSCodeComment').mockResolvedValue({
                id: 'reply-1',
            });

            const result = await controller.addReplyToComment(comments as any, commentData as any);

            expect(mockBBApi.pullrequests.postComment).toHaveBeenCalled();
            expect(result).toHaveLength(2); // Original comment + new reply
        });
    });

    describe('addTemporaryEntity', () => {
        it('should add temporary task', async () => {
            const mockThread = {
                uri: { query: JSON.stringify({ prHref: 'test-href' }) },
                range: new Range(0, 0, 0, 0),
                comments: [{ id: 'comment-1' }],
            };

            const commentData = {
                parent: mockThread,
                id: 'comment-1',
                site: { details: {} },
                prCommentThreadId: 'thread-1',
                prId: 'pr-1',
                prHref: 'test-href',
            };

            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'removeTemporaryCommentsAndTasks').mockResolvedValue(undefined);
            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'createOrUpdateThread').mockResolvedValue({
                comments: [{ id: 'mock-uuid' }],
            });

            await controller.addTemporaryEntity(commentData as any, 2); // CREATINGTASK

            // @ts-ignore - Referencing a private method
            expect(controller.removeTemporaryCommentsAndTasks).toHaveBeenCalled();
            // @ts-ignore - Referencing a private method
            expect(controller.createOrUpdateThread).toHaveBeenCalled();
        });

        it('should add temporary reply', async () => {
            const mockThread = {
                uri: { query: JSON.stringify({ prHref: 'test-href' }) },
                range: new Range(0, 0, 0, 0),
                comments: [{ id: 'comment-1' }],
            };

            const commentData = {
                parent: mockThread,
                id: 'comment-1',
                author: { name: 'Test User' },
                site: { details: {} },
                prCommentThreadId: 'thread-1',
                prId: 'pr-1',
                prHref: 'test-href',
            };

            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'removeTemporaryCommentsAndTasks').mockResolvedValue(undefined);
            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'createOrUpdateThread').mockResolvedValue({
                comments: [{ id: 'mock-uuid' }],
            });

            await controller.addTemporaryEntity(commentData as any, 3); // CREATINGREPLY

            // @ts-ignore - Referencing a private method
            expect(controller.removeTemporaryCommentsAndTasks).toHaveBeenCalled();
            // @ts-ignore - Referencing a private method
            expect(controller.createOrUpdateThread).toHaveBeenCalled();
        });
    });

    describe('createVSCodeComment', () => {
        it('should create a VS Code comment with proper context values', async () => {
            const site = { details: {} };
            const comment = {
                id: 'comment-1',
                user: { displayName: 'Test User', avatarUrl: 'avatar.png', accountId: 'user-1' },
                htmlContent: '<p>Test content</p>',
                tasks: [],
                editable: true,
                deletable: true,
                commitHash: undefined,
            };

            const result = await controller['createVSCodeComment'](
                site as any,
                'thread-1',
                comment as any,
                'test-href',
                'pr-1',
            );

            expect(result.contextValue).toBe('canAddReply,canAddTask,canEdit,canDelete');
            expect(result.author.name).toBe('Test User');
            expect(result.id).toBe('comment-1');
        });

        it('should handle comment with commit hash', async () => {
            const site = { details: {} };
            const comment = {
                id: 'comment-1',
                user: { displayName: 'Test User', avatarUrl: 'avatar.png', accountId: 'user-1' },
                htmlContent: '<p>Test content</p>',
                tasks: [],
                editable: false,
                deletable: false,
                commitHash: 'abc123',
            };

            const result = await controller['createVSCodeComment'](
                site as any,
                'thread-1',
                comment as any,
                'test-href',
                'pr-1',
            );

            expect(result.contextValue).toBe('canAddReply'); // No canAddTask for commit comments
            expect(result.commitHash).toBe('abc123');
        });
    });

    describe('createVSCodeCommentTask', () => {
        it('should create a VS Code task comment for incomplete task', async () => {
            const site = { details: {} };
            const task = {
                id: 'task-1',
                content: '<p>Task content</p>',
                isComplete: false,
                editable: true,
                deletable: true,
            };

            const result = await controller['createVSCodeCommentTask'](
                site as any,
                'thread-1',
                task as any,
                'test-href',
                'pr-1',
            );

            expect(result.contextValue).toBe('canModifyTask,canRemoveTask,markComplete');
            expect(result.author.name).toBe('Task');
            expect(result.id).toBe('task-1');
        });

        it('should create a VS Code task comment for complete task', async () => {
            const site = { details: {} };
            const task = {
                id: 'task-1',
                content: '<p>Task content</p>',
                isComplete: true,
                editable: false,
                deletable: false,
            };

            const result = await controller['createVSCodeCommentTask'](
                site as any,
                'thread-1',
                task as any,
                'test-href',
                'pr-1',
            );

            expect(result.contextValue).toBe('markIncomplete');
            expect(result.author.name).toBe('Task (Complete)');
        });
    });

    describe('helper methods', () => {
        it('should convert comment to editing mode', () => {
            const mockThread = {
                comments: [{ id: 'comment-1', body: 'Original content', mode: 0 }],
            };

            const comment = {
                id: 'comment-1',
                parent: mockThread,
                editModeContent: 'Edit content',
            };

            controller['convertCommentToMode'](comment as any, 1); // Editing mode

            expect(mockThread.comments[0].mode).toBe(1);
        });

        it('should store comment content for edit', () => {
            const mockThread = {
                comments: [{ id: 'comment-1', body: 'Original content' }],
            };

            const comment = {
                id: 'comment-1',
                parent: mockThread,
            };

            controller['storeCommentContentForEdit'](comment as any);

            expect((mockThread.comments[0] as any).editModeContent).toBe('Original content');
        });

        it('should remove temporary entities', async () => {
            const comments = [
                { id: 'comment-1', isTemporary: false },
                { id: 'temp-1', isTemporary: true },
                { id: 'comment-2', isTemporary: false },
            ];

            const result = await controller['removeTemporaryEntities'](comments as any);

            expect(result).toHaveLength(2);
            expect(result.map((c: any) => c.id)).toEqual(['comment-1', 'comment-2']);
        });

        it('should remove tasks from comments', async () => {
            const comments = [
                { id: 'comment-1', tasks: [] },
                { id: 'task-1', task: {} },
                { id: 'comment-2', tasks: [] },
            ];

            const result = await controller['removeTasks'](comments as any);

            expect(result).toHaveLength(2);
            expect(result.map((c: any) => c.id)).toEqual(['comment-1', 'comment-2']);
        });

        it('should insert tasks into comments', async () => {
            const comments = [
                {
                    id: 'comment-1',
                    tasks: [{ id: 'task-1' }],
                    site: { details: {} },
                    prCommentThreadId: 'thread-1',
                    prHref: 'test-href',
                    prId: 'pr-1',
                },
            ];

            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'createVSCodeCommentTask').mockResolvedValue({
                id: 'task-1',
            });

            const result = await controller['insertTasks'](comments as any);

            expect(result).toHaveLength(2); // comment + task
        });
    });

    describe('toggleCommentsVisibility', () => {
        it('should toggle the collapsible state of comment threads', () => {
            const mockUri = {
                query: JSON.stringify({ prHref: 'test-href' }),
            };

            const mockThread = {
                collapsibleState: CommentThreadCollapsibleState.Collapsed,
            };

            const mockMap = new Map();
            mockMap.set('thread-1', mockThread);

            controller['_commentsCache'] = new Map();
            controller['_commentsCache'].set('test-href', mockMap);

            controller.toggleCommentsVisibility(mockUri as Uri);

            expect(mockThread.collapsibleState).toBe(CommentThreadCollapsibleState.Expanded);
        });

        it('should handle missing PR in cache', async () => {
            const mockUri = {
                query: JSON.stringify({ prHref: 'nonexistent-href' }),
            };

            await controller.toggleCommentsVisibility(mockUri as Uri);

            // Should not throw error
        });
    });

    describe('clearCommentCache', () => {
        it('should clear and dispose threads for a given PR', () => {
            const mockUri = {
                query: JSON.stringify({ prHref: 'test-href' }),
            };

            const mockThread = {
                dispose: jest.fn(),
            };

            const mockMap = new Map();
            mockMap.set('thread-1', mockThread);

            controller['_commentsCache'] = new Map();
            controller['_commentsCache'].set('test-href', mockMap);

            controller.clearCommentCache(mockUri as Uri);

            expect(mockThread.dispose).toHaveBeenCalled();
        });

        it('should create empty cache if PR not found', () => {
            const mockUri = {
                query: JSON.stringify({ prHref: 'new-href' }),
            };

            controller.clearCommentCache(mockUri as Uri);

            // @ts-ignore - Referencing a private method
            expect(controller['_commentsCache'].has('new-href')).toBe(true);
        });
    });

    describe('provideComments', () => {
        it('should create comment threads from provided comments', async () => {
            const mockUri = {
                query: JSON.stringify({
                    site: { details: { isCloud: true } },
                    commentThreads: [
                        [
                            {
                                id: 'comment-1',
                                inline: { from: 1 },
                                user: { displayName: 'User', avatarUrl: 'url' },
                                htmlContent: 'Comment content',
                                tasks: [],
                            },
                        ],
                    ],
                    prHref: 'test-href',
                    prId: 'test-pr-id',
                }),
            };

            // Mock createVSCodeComment
            const mockComment = { id: 'comment-1' };
            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'createVSCodeComment').mockResolvedValue(mockComment);

            // Mock createOrUpdateThread
            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'createOrUpdateThread').mockResolvedValue({});

            await controller.provideComments(mockUri as Uri);

            // @ts-ignore - Referencing a private method
            expect(controller.createVSCodeComment).toHaveBeenCalled();
            // @ts-ignore - Referencing a private method
            expect(controller.createOrUpdateThread).toHaveBeenCalled();
        });

        it('should handle comments with different inline positions', async () => {
            const mockUri = {
                query: JSON.stringify({
                    site: { details: { isCloud: true } },
                    commentThreads: [
                        [
                            {
                                id: 'comment-1',
                                inline: { to: 5 }, // RHS line
                                user: { displayName: 'User', avatarUrl: 'url' },
                                htmlContent: 'Comment content',
                                tasks: [],
                            },
                        ],
                    ],
                    prHref: 'test-href',
                    prId: 'test-pr-id',
                }),
            };

            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'createVSCodeComment').mockResolvedValue({ id: 'comment-1' });
            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'createOrUpdateThread').mockResolvedValue({});

            await controller.provideComments(mockUri as Uri);

            // @ts-ignore - Referencing a private method
            expect(controller.createOrUpdateThread).toHaveBeenCalledWith(
                'comment-1',
                mockUri,
                new Range(4, 0, 4, 0), // to: 5 becomes range (4, 0, 4, 0)
                expect.any(Array),
            );
        });

        it('should skip empty comment threads', async () => {
            const mockUri = {
                query: JSON.stringify({
                    site: { details: { isCloud: true } },
                    commentThreads: [],
                    prHref: 'test-href',
                    prId: 'test-pr-id',
                }),
            };

            // @ts-ignore - Referencing a private method
            jest.spyOn(controller, 'createOrUpdateThread').mockResolvedValue({});

            await controller.provideComments(mockUri as Uri);

            // @ts-ignore - Referencing a private method
            expect(controller.createOrUpdateThread).not.toHaveBeenCalled();
        });
    });

    describe('disposePR', () => {
        it('should dispose all comment threads for a PR', () => {
            const mockThread = {
                dispose: jest.fn(),
            };

            const mockMap = new Map();
            mockMap.set('thread-1', mockThread);

            controller['_commentsCache'] = new Map();
            controller['_commentsCache'].set('test-href', mockMap);

            controller.disposePR('test-href');

            expect(mockThread.dispose).toHaveBeenCalled();
            expect(controller['_commentsCache'].has('test-href')).toBe(false);
        });

        it('should handle non-existent PR', () => {
            controller.disposePR('nonexistent-href');

            // Should not throw error
        });
    });

    describe('dispose', () => {
        it('should clear comment cache and dispose the comment controller', () => {
            controller['_commentsCache'] = new Map();
            controller['_commentsCache'].set('test-href', new Map());

            controller.dispose();

            expect(controller['_commentsCache'].size).toBe(0);
            expect(mockCommentController.dispose).toHaveBeenCalled();
        });
    });

    describe('getDataForAddingComment', () => {
        it('should extract comment data from thread', () => {
            const mockThread = {
                uri: {
                    query: JSON.stringify({
                        site: { details: {} },
                        prHref: 'test-href',
                        prId: 'test-pr-id',
                        path: 'test-path',
                        lhs: true,
                        addedLines: [1, 2],
                        deletedLines: [3, 4],
                        lineContextMap: { '1': 10 },
                        commitHash: 'hash1',
                        rhsCommitHash: 'hash2',
                        isCommitLevelDiff: true,
                    }),
                },
                range: new Range(0, 0, 0, 0),
                comments: [{ prCommentThreadId: 'thread-1' }],
            } as unknown as CommentThread;

            const result = controller.getDataForAddingComment(mockThread);

            expect(result).toMatchObject({
                prHref: 'test-href',
                prId: 'test-pr-id',
                commentThreadId: 'thread-1',
            });
            expect(result.inline).toBeDefined();
        });

        it('should handle RHS lines with context mapping', () => {
            const mockThread = {
                uri: {
                    query: JSON.stringify({
                        site: { details: {} },
                        prHref: 'test-href',
                        prId: 'test-pr-id',
                        path: 'test-path',
                        lhs: false,
                        addedLines: [],
                        deletedLines: [],
                        lineContextMap: { '5': 10 },
                        commitHash: 'hash1',
                        rhsCommitHash: 'hash2',
                        isCommitLevelDiff: false,
                    }),
                },
                range: new Range(4, 0, 4, 0), // Line 5 (0-indexed)
                comments: [],
            } as unknown as CommentThread;

            const result = controller.getDataForAddingComment(mockThread);

            expect(result.inline.to).toBe(10); // Should use lineContextMap value
            expect(result.lineType).toBeUndefined();
        });

        it('should detect ADDED line type', () => {
            const mockThread = {
                uri: {
                    query: JSON.stringify({
                        site: { details: {} },
                        prHref: 'test-href',
                        prId: 'test-pr-id',
                        path: 'test-path',
                        lhs: false,
                        addedLines: [5],
                        deletedLines: [],
                        lineContextMap: {},
                        commitHash: 'hash1',
                        rhsCommitHash: 'hash2',
                        isCommitLevelDiff: false,
                    }),
                },
                range: new Range(4, 0, 4, 0), // Line 5 (0-indexed)
                comments: [],
            } as unknown as CommentThread;

            const result = controller.getDataForAddingComment(mockThread);

            expect(result.lineType).toBe('ADDED');
        });

        it('should detect REMOVED line type', () => {
            const mockThread = {
                uri: {
                    query: JSON.stringify({
                        site: { details: {} },
                        prHref: 'test-href',
                        prId: 'test-pr-id',
                        path: 'test-path',
                        lhs: false,
                        addedLines: [],
                        deletedLines: [5],
                        lineContextMap: {},
                        commitHash: 'hash1',
                        rhsCommitHash: 'hash2',
                        isCommitLevelDiff: false,
                    }),
                },
                range: new Range(4, 0, 4, 0), // Line 5 (0-indexed)
                comments: [],
            } as unknown as CommentThread;

            const result = controller.getDataForAddingComment(mockThread);

            expect(result.lineType).toBe('REMOVED');
        });

        it('should handle empty comments array', () => {
            const mockThread = {
                uri: {
                    query: JSON.stringify({
                        site: { details: {} },
                        prHref: 'test-href',
                        prId: 'test-pr-id',
                        path: 'test-path',
                        lhs: true,
                        addedLines: [],
                        deletedLines: [],
                        lineContextMap: {},
                        commitHash: 'hash1',
                        rhsCommitHash: 'hash2',
                        isCommitLevelDiff: false,
                    }),
                },
                range: new Range(0, 0, 0, 0),
                comments: [],
            } as unknown as CommentThread;

            const result = controller.getDataForAddingComment(mockThread);

            expect(result.commentThreadId).toBeUndefined();
        });
    });

    describe('command handlers', () => {
        it('should handle BitbucketAddComment command', async () => {
            jest.spyOn(controller, 'addComment').mockResolvedValue(undefined);

            // Verify command was registered
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'atlascode.bb.addComment',
                expect.any(Function),
            );
        });

        it('should handle BitbucketDeleteComment command registration', () => {
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'atlascode.bb.deleteComment',
                expect.any(Function),
            );
        });

        it('should handle BBPRCancelAction command registration', () => {
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'atlascode.bb.cancelCommentAction',
                expect.any(Function),
            );
        });

        it('should handle BitbucketEditComment command registration', () => {
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'atlascode.bb.editComment',
                expect.any(Function),
            );
        });

        it('should handle BitbucketMarkTaskComplete command registration', () => {
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'atlascode.bb.markTaskComplete',
                expect.any(Function),
            );
        });

        it('should handle BitbucketMarkTaskIncomplete command registration', () => {
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'atlascode.bb.markTaskIncomplete',
                expect.any(Function),
            );
        });

        it('should handle EditThisFile command registration', () => {
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'atlascode.bb.editThisFile',
                expect.any(Function),
            );
        });

        it('should handle BitbucketToggleCommentsVisibility command registration', () => {
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
                'atlascode.bb.toggleCommentsVisibility',
                expect.any(Function),
            );
        });
    });

    describe('replaceEditedComment', () => {
        it('should replace edited PR comment', async () => {
            const comments = [
                { id: 'comment-1', tasks: [], site: { details: {} }, prHref: 'href', prId: 'pr1' },
                { id: 'comment-2', tasks: [], site: { details: {} }, prHref: 'href', prId: 'pr1' },
            ];

            const newComment = {
                id: 'comment-1',
                user: { displayName: 'User', avatarUrl: 'avatar', accountId: 'user1' },
                htmlContent: 'Updated content',
                tasks: [],
            };

            jest.spyOn(controller, 'createVSCodeComment' as any).mockResolvedValue({
                id: 'comment-1',
                body: 'Updated content',
            });

            const result = await controller['replaceEditedComment'](comments as any, newComment as any);

            expect(result).toHaveLength(2);
            expect(result[0].body).toBe('Updated content');
        });

        it('should replace edited PR task', async () => {
            const comments = [
                {
                    id: 'task-1',
                    task: { id: 'task-1' },
                    site: { details: {} },
                    prHref: 'href',
                    prId: 'pr1',
                },
            ];

            const newTask = {
                id: 'task-1',
                content: 'Updated task content',
                isComplete: true,
            };

            jest.spyOn(controller, 'createVSCodeCommentTask' as any).mockResolvedValue({
                id: 'task-1',
                body: 'Updated task content',
            });

            const result = await controller['replaceEditedComment'](comments as any, newTask as any);

            expect(result).toHaveLength(1);
            expect(result[0].body).toBe('Updated task content');
        });
    });

    describe('removeTemporaryCommentsAndTasks', () => {
        it('should remove temporary entities from thread', async () => {
            const mockThread = {
                uri: { query: JSON.stringify({ prHref: 'test-href' }) },
                range: new Range(0, 0, 0, 0),
                comments: [
                    {
                        id: 'comment-1',
                        tasks: [],
                        temporaryTask: { id: 'temp-task' },
                        temporaryReply: { id: 'temp-reply' },
                    },
                ],
            };

            const comment = {
                parent: mockThread,
                prCommentThreadId: 'thread-1',
            };

            jest.spyOn(controller, 'createOrUpdateThread' as any).mockResolvedValue({});

            await controller['removeTemporaryCommentsAndTasks'](comment as any);

            expect(mockThread.comments[0].temporaryTask).toBeUndefined();
            expect(mockThread.comments[0].temporaryReply).toBeUndefined();
        });

        it('should handle missing parent', async () => {
            const comment = {
                parent: undefined,
            };

            await controller['removeTemporaryCommentsAndTasks'](comment as any);

            // Should not throw error
        });
    });

    describe('editCommentClicked', () => {
        it('should store content and set editing mode', () => {
            const mockThread = {
                comments: [{ id: 'comment-1', body: 'Original content', mode: vscode.CommentMode.Preview }],
            };

            const comment = {
                id: 'comment-1',
                parent: mockThread,
            };

            controller['editCommentClicked'](comment as any);

            expect((mockThread.comments[0] as any).editModeContent).toBe('Original content');
            expect((mockThread.comments[0] as any).mode).toBe(vscode.CommentMode.Editing);
        });
    });

    describe('insertTemporaryEntities', () => {
        it('should insert temporary task and reply', async () => {
            const comments = [
                {
                    id: 'comment-1',
                    tasks: [],
                    temporaryTask: { id: 'temp-task' },
                    temporaryReply: { id: 'temp-reply' },
                },
            ];

            const result = await controller['insertTemporaryEntities'](comments as any);

            expect(result).toHaveLength(3); // comment + task + reply
            expect(result.map((c: any) => c.id)).toEqual(['comment-1', 'temp-task', 'temp-reply']);
        });

        it('should handle comments without temporary entities', async () => {
            const comments = [{ id: 'comment-1', tasks: [] }];

            const result = await controller['insertTemporaryEntities'](comments as any);

            expect(result).toHaveLength(1);
        });
    });

    describe('createOrUpdateThread edge cases', () => {
        it('should handle creating new thread', async () => {
            const threadId = 'new-thread';
            const uri = { query: JSON.stringify({ prHref: 'test-href' }) };
            const range = new Range(0, 0, 0, 0);
            const comments: any[] = [
                {
                    id: 'comment-1',
                    tasks: [{ id: 'task-1' }],
                    site: { details: {} },
                    prCommentThreadId: 'thread-1',
                    prHref: 'test-href',
                    prId: 'pr-1',
                },
            ];

            jest.spyOn(controller, 'removeTemporaryEntities' as any).mockResolvedValue(comments);
            jest.spyOn(controller, 'removeTasks' as any).mockResolvedValue(comments);
            jest.spyOn(controller, 'insertTasks' as any).mockResolvedValue(comments);
            jest.spyOn(controller, 'insertTemporaryEntities' as any).mockResolvedValue(comments);

            const result = await controller['createOrUpdateThread'](threadId, uri as any, range, comments as any);

            expect(mockCommentController.createCommentThread).toHaveBeenCalledWith(uri, range, comments);
            expect(result.label).toBe('');
            expect(result.collapsibleState).toBe(vscode.CommentThreadCollapsibleState.Expanded);
        });

        it('should dispose existing thread when updating', async () => {
            const threadId = 'existing-thread';
            const uri = { query: JSON.stringify({ prHref: 'test-href' }) };
            const range = new Range(0, 0, 0, 0);
            const comments: any[] = [];

            const existingThread = { dispose: jest.fn() };
            const mockMap = new Map();
            mockMap.set(threadId, existingThread);

            controller['_commentsCache'].set('test-href', mockMap);

            jest.spyOn(controller, 'removeTemporaryEntities' as any).mockResolvedValue([]);
            jest.spyOn(controller, 'removeTasks' as any).mockResolvedValue([]);
            jest.spyOn(controller, 'insertTasks' as any).mockResolvedValue([]);
            jest.spyOn(controller, 'insertTemporaryEntities' as any).mockResolvedValue([]);

            await controller['createOrUpdateThread'](threadId, uri as any, range, comments);

            expect(existingThread.dispose).toHaveBeenCalled();
        });
    });
});
