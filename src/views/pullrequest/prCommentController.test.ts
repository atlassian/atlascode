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
    });

    describe('extractCommentText', () => {
        it('should extract text from MarkdownString body', () => {
            const comment = {
                body: new MarkdownString('Test comment'),
            } as any;

            // @ts-ignore - Accessing private method for testing
            const result = controller['extractCommentText'](comment);
            expect(result).toBe('Test comment');
        });

        it('should extract text from string body', () => {
            const comment = {
                body: 'Test comment',
            } as any;

            // @ts-ignore - Accessing private method for testing
            const result = controller['extractCommentText'](comment);
            expect(result).toBe('Test comment');
        });

        it('should throw error for invalid body type', () => {
            const comment = {
                body: 123,
            } as any;

            // @ts-ignore - Accessing private method for testing
            expect(() => controller['extractCommentText'](comment)).toThrow('Invalid comment body type');
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

            // @ts-ignore - Setting private property for testing
            controller['_commentsCache'] = new Map();
            // @ts-ignore
            controller['_commentsCache'].set('test-href', mockMap);

            controller.toggleCommentsVisibility(mockUri as Uri);

            expect(mockThread.collapsibleState).toBe(CommentThreadCollapsibleState.Expanded);
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

            // @ts-ignore - Setting private property for testing
            controller['_commentsCache'] = new Map();
            // @ts-ignore
            controller['_commentsCache'].set('test-href', mockMap);

            controller.clearCommentCache(mockUri as Uri);

            expect(mockThread.dispose).toHaveBeenCalled();
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
            // @ts-ignore
            jest.spyOn(controller, 'createVSCodeComment').mockResolvedValue(mockComment);

            // Mock createOrUpdateThread
            // @ts-ignore
            jest.spyOn(controller, 'createOrUpdateThread').mockResolvedValue({});

            await controller.provideComments(mockUri as Uri);

            // @ts-ignore
            expect(controller.createVSCodeComment).toHaveBeenCalled();
            // @ts-ignore
            expect(controller.createOrUpdateThread).toHaveBeenCalled();
        });
    });

    describe('disposePR', () => {
        it('should dispose all comment threads for a PR', () => {
            const mockThread = {
                dispose: jest.fn(),
            };

            const mockMap = new Map();
            mockMap.set('thread-1', mockThread);

            // @ts-ignore - Setting private property for testing
            controller['_commentsCache'] = new Map();
            // @ts-ignore
            controller['_commentsCache'].set('test-href', mockMap);

            controller.disposePR('test-href');

            expect(mockThread.dispose).toHaveBeenCalled();
            // @ts-ignore
            expect(controller['_commentsCache'].has('test-href')).toBe(false);
        });
    });

    describe('dispose', () => {
        it('should clear comment cache and dispose the comment controller', () => {
            // @ts-ignore - Setting private property for testing
            controller['_commentsCache'] = new Map();
            // @ts-ignore
            controller['_commentsCache'].set('test-href', new Map());

            controller.dispose();

            // @ts-ignore
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
    });
});
