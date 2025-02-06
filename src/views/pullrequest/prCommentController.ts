import { fileCheckoutEvent, prCommentEvent, prTaskEvent } from 'src/analytics';
import TurndownService from 'turndown';
import { v4 } from 'uuid';
import vscode, { commands, CommentThread, MarkdownString, l10n } from 'vscode';
import { BitbucketMentionsCompletionProvider } from '../../bitbucket/bbMentionsCompletionProvider';
import { clientForSite } from '../../bitbucket/bbUtils';
import { BitbucketSite, Comment, emptyTask, Task } from '../../bitbucket/model';
import { Commands } from '../../commands';
import { Container } from '../../container';
import { PullRequestNodeDataProvider } from '../pullRequestNodeDataProvider';
import { PRFileDiffQueryParams } from './diffViewHelper';
import { checkoutPRBranch } from './gitActions';

const turndownService = new TurndownService();

turndownService.addRule('mention', {
    filter: function (node) {
        return node.classList.contains('ap-mention') || node.classList.contains('user-mention');
    },
    replacement: function (content, _, options) {
        return `${options.emDelimiter}${content}${options.emDelimiter}`;
    },
});
turndownService.addRule('emoji', {
    filter: function (node) {
        return node.nodeName === 'IMG' && node.classList.contains('emoji') && node.getAttribute('alt') !== null;
    },
    replacement: function (_, node: HTMLElement) {
        return node.getAttribute('alt')!;
    },
});
turndownService.addRule('highlightedCodeBlock', {
    filter: function (node) {
        return (
            node.nodeName === 'DIV' &&
            node.classList.contains('codehilite') &&
            !!node.firstChild &&
            node.firstChild.nodeName === 'PRE'
        );
    },
    replacement: function (_, node: any, options) {
        const className = node.className || '';
        const language = (className.match(/language-(\S+)/) || [null, ''])[1];
        return `${options.fence}${language}\n${node.firstChild.textContent}\n\n${options.fence}\n\n`;
    },
});

interface PullRequestComment extends vscode.Comment {
    site: BitbucketSite;
    authorId: string;
    prCommentThreadId: string | undefined;
    parent?: vscode.CommentThread;
    prHref: string;
    prId: string;
    id: string;
    tasks: Task[];
    saveChangesContext: SaveContexts;
    temporaryTask?: PullRequestTask;
    temporaryReply?: PullRequestComment;
    isTemporary?: boolean;
    parentCommentId?: string;

    //This stores the content in the comment when 'edit' is clicked, so that the state can be restored if cancel is clicked
    editModeContent: MarkdownString | string;
    commitHash?: string;
}

interface PullRequestTask extends vscode.Comment {
    site: BitbucketSite;
    prCommentThreadId: string | undefined;
    parent?: vscode.CommentThread;
    prHref: string;
    prId: string;
    task: Task;
    id: string;
    saveChangesContext: SaveContexts;
    editModeContent: MarkdownString | string;
    isTemporary?: boolean;
}

type EnhancedComment = PullRequestTask | PullRequestComment;

enum SaveContexts {
    EDITINGCOMMENT,
    EDITINGTASK,
    CREATINGTASK,
    CREATINGREPLY,
}

function isPRTask(comment: vscode.Comment): comment is PullRequestTask {
    return !!(<PullRequestTask>comment).task;
}

function isPRComment(comment: vscode.Comment): comment is PullRequestComment {
    return !!(<PullRequestComment>comment).tasks;
}

// PullRequestCommentController is a comment controller for a given PR
export class PullRequestCommentController implements vscode.Disposable {
    private _commentController: vscode.CommentController = vscode.comments.createCommentController(
        'bbpr',
        l10n.t('Bitbucket pullrequest comments'),
    );
    // map of comment threads keyed by pull request - Map<`pull request href`, Map<`comment id`, vscode.CommentThread>>
    private _commentsCache = new Map<string, Map<string, vscode.CommentThread>>();

    constructor(ctx: vscode.ExtensionContext) {
        ctx.subscriptions.push(
            vscode.languages.registerCompletionItemProvider(
                { scheme: 'comment' },
                new BitbucketMentionsCompletionProvider(),
                '@',
            ),
            vscode.commands.registerCommand(Commands.BitbucketAddComment, async (reply: vscode.CommentReply) => {
                await this.addComment(reply);
                const { prHref } = JSON.parse(reply.thread.uri.query) as PRFileDiffQueryParams;
                vscode.commands.executeCommand(Commands.RefreshPullRequestExplorerNode, vscode.Uri.parse(prHref));
            }),

            //Invoked when the trashcan icon is pressed on a comment; it deletes the comment
            vscode.commands.registerCommand(Commands.BitbucketDeleteComment, async (comment: PullRequestComment) => {
                await this.deleteComment(comment);
                vscode.commands.executeCommand(
                    Commands.RefreshPullRequestExplorerNode,
                    vscode.Uri.parse(comment.prHref),
                );
            }),

            //Invoked when the "Cancel" button is pressed when creating a new comment/task or editing an existing one
            vscode.commands.registerCommand(Commands.BBPRCancelAction, async (comment: EnhancedComment) => {
                //If this action originated from the creation of a new task/comment, we want to wipe any hypothetical tasks/comments
                //Otherwise, the action originated from an edit, so we need to set the mode of that comment/task back to preview (from editing mode)
                if (
                    comment.saveChangesContext === SaveContexts.CREATINGTASK ||
                    comment.saveChangesContext === SaveContexts.CREATINGREPLY
                ) {
                    await this.removeTemporaryCommentsAndTasks(comment as PullRequestTask);
                } else {
                    this.convertCommentToMode(comment, vscode.CommentMode.Preview);
                }
            }),

            //Invoked when the edit pen button is pressed; replaces the comment with a text window with 'save' and 'cancel' buttons.
            vscode.commands.registerCommand(Commands.BitbucketEditComment, (comment: PullRequestComment) => {
                this.editCommentClicked(comment);
            }),

            //Invoked when the 'Save' or 'Save Changes' buttons are pressed on a comment with a text body.
            //Creating a new comment, creating a new task, editing an existing comment, and editing an existing task all invoke this action when 'save' is pressed
            //saveChangesPressed() does different actions depending on the 'saveChangesContext' attribute
            vscode.commands.registerCommand(Commands.BBPRSaveAction, async (comment: PullRequestTask) => {
                await this.saveChangesPressed(comment);
            }),

            //Invoked when the trash can icon is pressed on a task; deletes the task
            vscode.commands.registerCommand(Commands.BitbucketDeleteTask, async (task: PullRequestTask) => {
                await this.deleteTask(task);
                vscode.commands.executeCommand(Commands.RefreshPullRequestExplorerNode, vscode.Uri.parse(task.prHref));
            }),

            //Adds a 'temporary' task (editable body of a task with a 'save changes' and 'cancel' button).
            vscode.commands.registerCommand(Commands.BitbucketAddTask, async (comment: PullRequestComment) => {
                await this.addTemporaryEntity(comment, SaveContexts.CREATINGTASK);
            }),

            //Adds a 'temporary' comment (editable body of a comment with a 'save changes' and 'cancel' button).
            vscode.commands.registerCommand(Commands.BitbucketAddReply, async (comment: PullRequestComment) => {
                await this.addTemporaryEntity(comment, SaveContexts.CREATINGREPLY);
            }),

            //Invoked when the edit pen icon is pressed on a task. Brings up a text window with 'save changes' and 'cancel' buttons to allow for modifying content.
            vscode.commands.registerCommand(Commands.BitbucketEditTask, async (task: PullRequestTask) => {
                this.editCommentClicked(task);
            }),

            //When a task is incomplete, it'll display an unchecked box icon. When pressed, this action is invoked.
            vscode.commands.registerCommand(Commands.BitbucketMarkTaskComplete, async (taskData: PullRequestTask) => {
                const newComments = await this.updateTask(taskData.parent!.comments, taskData, { isComplete: true });
                await this.createOrUpdateThread(
                    taskData.prCommentThreadId!,
                    taskData.parent!.uri,
                    taskData.parent!.range,
                    newComments,
                );
                vscode.commands.executeCommand(
                    Commands.RefreshPullRequestExplorerNode,
                    vscode.Uri.parse(taskData.prHref),
                );
            }),

            //When a task is complete, it'll display a checked box icon. When pressed, this action is invoked.
            vscode.commands.registerCommand(Commands.BitbucketMarkTaskIncomplete, async (taskData: PullRequestTask) => {
                const newComments = await this.updateTask(taskData.parent!.comments, taskData, { isComplete: false });
                await this.createOrUpdateThread(
                    taskData.prCommentThreadId!,
                    taskData.parent!.uri,
                    taskData.parent!.range,
                    newComments,
                );
                vscode.commands.executeCommand(
                    Commands.RefreshPullRequestExplorerNode,
                    vscode.Uri.parse(taskData.prHref),
                );
            }),
            vscode.commands.registerCommand(Commands.BitbucketToggleCommentsVisibility, (input: vscode.Uri) => {
                this.toggleCommentsVisibility(input);
            }),
            vscode.commands.registerCommand(Commands.EditThisFile, async (uri: vscode.Uri) => {
                const { site, prId, path, repoUri } = JSON.parse(uri.query) as PRFileDiffQueryParams;

                const wsRepo = Container.bitbucketContext.getRepository(vscode.Uri.parse(repoUri));
                if (!wsRepo || !path) {
                    return;
                }

                const bbApi = await clientForSite(site);
                const pr = await bbApi.pullrequests.get(site, prId, wsRepo);
                const checkoutSucceeded = await checkoutPRBranch(pr, pr.data.source.branchName);

                if (checkoutSucceeded) {
                    const pathURI = vscode.Uri.parse(`${wsRepo.rootUri}/${path}`);
                    commands.executeCommand('vscode.open', pathURI, { viewColumn: -2 }); // -2 represents displays the new file 'beside' the current editor
                    fileCheckoutEvent(pr.site.details).then((e) => {
                        Container.analyticsClient.sendTrackEvent(e);
                    });
                }
            }),
        );
        this._commentController.commentingRangeProvider = {
            provideCommentingRanges: (
                document: vscode.TextDocument,
                token: vscode.CancellationToken,
            ): vscode.Range[] | undefined => {
                if (document.uri.scheme !== PullRequestNodeDataProvider.SCHEME) {
                    return undefined;
                }
                const { site, lhs, addedLines, deletedLines, lineContextMap } = JSON.parse(
                    document.uri.query,
                ) as PRFileDiffQueryParams;
                if (site.details.isCloud) {
                    return [new vscode.Range(0, 0, document.lineCount - 1, 0)];
                }

                let result: vscode.Range[] = [];

                const contextLines = lhs ? Object.values(lineContextMap) : Object.keys(lineContextMap).map(parseInt);

                new Set([...addedLines, ...deletedLines, ...contextLines]).forEach((line) => {
                    result.push(new vscode.Range(line - 1, 0, line - 1, 0));
                });

                return result;
            },
        };
    }

    async saveChangesPressed(comment: EnhancedComment) {
        if (comment.body === '') {
            return;
        }

        //This same button is used for saving comment edits, saving task edits, saving a new comment, and saving a new task
        //Therefore, we must perform the correct action based on the situation...
        this.convertCommentToMode(comment, vscode.CommentMode.Preview, true);
        const commentThreadId = comment.prCommentThreadId;
        let comments: vscode.Comment[] = [];

        switch (comment.saveChangesContext) {
            case SaveContexts.CREATINGTASK:
                if (isPRTask(comment)) {
                    comments = await this.addTask(comment.parent!.comments, comment);
                }
                break;
            case SaveContexts.CREATINGREPLY:
                if (isPRComment(comment)) {
                    comments = await this.addReplyToComment(comment.parent!.comments, comment);
                }
                break;
            case SaveContexts.EDITINGCOMMENT:
                if (isPRComment(comment)) {
                    const bbApi = await clientForSite(comment.site);
                    let newComment: Comment = await bbApi.pullrequests.editComment(
                        comment.site,
                        comment.prId,
                        comment.body.toString(),
                        comment.id,
                        comment.commitHash,
                    );

                    //The data returned by the comment API endpoint doesn't include task data, so we need to make sure we preserve that...
                    newComment.tasks = comment.tasks;
                    comments = await this.replaceEditedComment(
                        comment.parent!.comments as EnhancedComment[],
                        newComment,
                    );
                }
                break;
            case SaveContexts.EDITINGTASK:
                if (isPRTask(comment)) {
                    comments = await this.updateTask(comment.parent!.comments, comment, {
                        content: comment.body.toString(),
                    });
                }
                break;
            default:
                return;
        }

        await this.createOrUpdateThread(commentThreadId!, comment.parent!.uri, comment.parent!.range, comments);
        vscode.commands.executeCommand(Commands.RefreshPullRequestExplorerNode, vscode.Uri.parse(comment.prHref));
    }

    async toggleCommentsVisibility(uri: vscode.Uri) {
        const { prHref } = JSON.parse(uri.query) as PRFileDiffQueryParams;

        if (!this._commentsCache.has(prHref)) {
            return;
        }

        const prCommentCache = this._commentsCache.get(prHref)!;
        prCommentCache.forEach(
            (thread) =>
                (thread.collapsibleState =
                    thread.collapsibleState === vscode.CommentThreadCollapsibleState.Collapsed
                        ? vscode.CommentThreadCollapsibleState.Expanded
                        : vscode.CommentThreadCollapsibleState.Collapsed),
        );
    }

    async addTask(comments: readonly vscode.Comment[], taskData: PullRequestTask) {
        const bbApi = await clientForSite(taskData.site);
        const newTask = await bbApi.pullrequests.postTask(
            taskData.site,
            taskData.prId,
            taskData.body.toString(),
            taskData.task.commentId,
        );

        prTaskEvent(taskData.site.details, 'comment').then((e: any) => {
            Container.analyticsClient.sendTrackEvent(e);
        });

        return comments.map((comment: PullRequestComment) => {
            if (comment.id === newTask.commentId) {
                return {
                    ...comment,
                    tasks: [newTask, ...comment.tasks],
                    temporaryTask: undefined,
                } as PullRequestComment;
            } else {
                return {
                    ...comment,
                } as PullRequestComment;
            }
        });
    }

    getDataForAddingComment(thread: CommentThread) {
        let {
            site,
            prHref,
            prId,
            path,
            lhs,
            addedLines,
            deletedLines,
            lineContextMap,
            commitHash,
            rhsCommitHash,
            isCommitLevelDiff,
        } = JSON.parse(thread.uri.query) as PRFileDiffQueryParams;

        const commentThreadId =
            thread.comments.length === 0 ? undefined : (thread.comments[0] as PullRequestComment).prCommentThreadId;

        const lineNumber = thread.range.start.line + 1;
        const inline = {
            from: lhs ? lineNumber : undefined,
            to: lhs ? undefined : lineNumber,
            path: path,
        };

        // For Bitbucket Server, the line number on which the comment is added is not always the line on the file.
        // For added and removed lines, it matches the line number on the file.
        // But when contents of LHS and RHS match for a line, the line number of the LHS file must be sent.
        // (Effectively it is the leftmost line number appearing on the unified-diff in the browser)
        let lineType: 'ADDED' | 'REMOVED' | undefined = undefined;
        if (inline.to && lineContextMap.hasOwnProperty(lineNumber)) {
            inline.to = lineContextMap[lineNumber];
        } else if (addedLines.includes(lineNumber)) {
            lineType = 'ADDED';
        } else if (deletedLines.includes(lineNumber)) {
            lineType = 'REMOVED';
        }

        return { site, prId, prHref, commentThreadId, inline, lineType, commitHash, rhsCommitHash, isCommitLevelDiff };
    }

    async addReplyToComment(comments: readonly vscode.Comment[], commentData: PullRequestComment) {
        if (!commentData.parent) {
            return [];
        }

        const { inline, lineType, commentThreadId, rhsCommitHash, isCommitLevelDiff } = this.getDataForAddingComment(
            commentData.parent,
        );

        const bbApi = await clientForSite(commentData.site);
        const newComment = await bbApi.pullrequests.postComment(
            commentData.site,
            commentData.prId,
            commentData.body.toString(),
            commentData.parentCommentId ?? '',
            inline,
            isCommitLevelDiff ? rhsCommitHash : undefined,
            lineType,
        );

        let newComments: PullRequestComment[] = [];
        //The new comment should be pushed to the bottom of the children of the comment it was a reply to, but because we have no notion of comment depth currently
        //(and we don't preserve the comment tree), it would be very messy to place the comment correctly. The comment is placed immediately after the comment it's
        //a reply to because this guarantees it's at least in the same depth range. A future PR may introduce a notion of depth to comments, which may make placing
        //the comment correctly easier.
        for (const comment of comments as PullRequestComment[]) {
            //Things are set up such that when one comment gets a temporary reply, all the other comments have theirs wiped. Therefore, if a comment has a defined
            //temporary reply, we can place the new comment under that comment. Unfortunately, the BBServer comments endpoint doesn't return a parentId property,
            //so it's not possible to place the comment based on parentId.
            newComments.push(comment);
            if (isPRComment(comment) && !!comment.temporaryReply) {
                comment.temporaryReply = undefined;
                newComments.push(
                    await this.createVSCodeComment(
                        commentData.site,
                        commentThreadId!,
                        newComment,
                        commentData.prHref,
                        commentData.prId,
                    ),
                );
            }
        }
        return newComments;
    }

    async addComment(reply: vscode.CommentReply) {
        const { site, prId, prHref, commentThreadId, inline, lineType, rhsCommitHash, isCommitLevelDiff } =
            this.getDataForAddingComment(reply.thread);

        const bbApi = await clientForSite(site);
        const newComment = await bbApi.pullrequests.postComment(
            site,
            prId,
            reply.text,
            commentThreadId ?? '',
            inline,
            isCommitLevelDiff ? rhsCommitHash : undefined,
            lineType,
        );
        prCommentEvent(site.details).then((e) => {
            Container.analyticsClient.sendTrackEvent(e);
        });

        const comments = [
            ...reply.thread.comments,
            await this.createVSCodeComment(site, newComment.id, newComment, prHref, prId),
        ];

        await this.createOrUpdateThread(
            commentThreadId || newComment.id,
            reply.thread.uri,
            reply.thread.range,
            comments,
        );
        reply.thread.dispose();
    }

    private async removeTemporaryCommentsAndTasks(commentData: EnhancedComment) {
        if (!commentData.parent) {
            return;
        }

        let newComments = commentData.parent!.comments.map((comment) => {
            if (isPRComment(comment)) {
                comment.temporaryTask = undefined;
                comment.temporaryReply = undefined;
            }
            return comment;
        });

        await this.createOrUpdateThread(
            commentData.prCommentThreadId!,
            commentData.parent!.uri,
            commentData.parent!.range,
            newComments,
        );
    }

    private convertCommentToMode(commentData: EnhancedComment, mode: vscode.CommentMode, saveWasPressed?: boolean) {
        if (!commentData.parent) {
            return;
        }

        commentData.parent.comments = commentData.parent.comments.map((comment) => {
            if (commentData.id === (comment as EnhancedComment).id) {
                comment.mode = mode;
                if (mode === vscode.CommentMode.Preview && !saveWasPressed) {
                    comment.body = commentData.editModeContent;
                }
            }

            return comment;
        });
    }

    private storeCommentContentForEdit(commentData: EnhancedComment): EnhancedComment {
        if (!commentData.parent) {
            return commentData;
        }

        commentData.parent.comments = commentData.parent.comments.map((comment) => {
            if (commentData.id === (comment as EnhancedComment).id) {
                (comment as EnhancedComment).editModeContent = comment.body;
            }

            return comment;
        });

        return commentData;
    }

    async addTemporaryEntity(commentData: PullRequestComment, actionContext: SaveContexts) {
        if (!commentData.parent) {
            return;
        }

        await this.removeTemporaryCommentsAndTasks(commentData);
        const UUID = v4(); //The UUID is used to uniquely identify the temporary comment so that actions can be taken on it later
        let newComments;

        if (actionContext === SaveContexts.CREATINGTASK) {
            // Create a temporary task for this comment
            newComments = commentData.parent.comments.map((comment) => {
                if (commentData.id === (comment as EnhancedComment).id) {
                    const temporaryTask: PullRequestTask = {
                        body: '',
                        mode: vscode.CommentMode.Preview,
                        author: { name: 'Creating a New Task' },
                        site: commentData.site,
                        prCommentThreadId: commentData.prCommentThreadId,
                        task: { ...emptyTask, commentId: commentData.id },
                        id: UUID,
                        editModeContent: '',
                        prId: commentData.prId,
                        prHref: commentData.prHref,
                        saveChangesContext: SaveContexts.CREATINGTASK,
                        isTemporary: true,
                    };
                    (comment as PullRequestComment).temporaryTask = temporaryTask;
                }

                return comment;
            });
        } else if (actionContext === SaveContexts.CREATINGREPLY) {
            // Create a temporary comment for this comment
            newComments = commentData.parent.comments.map((comment) => {
                if (commentData.id === (comment as EnhancedComment).id) {
                    const temporaryComment: PullRequestComment = {
                        body: '',
                        authorId: v4(),
                        mode: vscode.CommentMode.Preview,
                        author: { name: `Replying to ${commentData.author.name}` },
                        site: commentData.site,
                        prCommentThreadId: commentData.prCommentThreadId,
                        tasks: [],
                        id: UUID,
                        editModeContent: '',
                        prId: commentData.prId,
                        prHref: commentData.prHref,
                        saveChangesContext: SaveContexts.CREATINGREPLY,
                        isTemporary: true,
                        parentCommentId: commentData.id,
                    };
                    (comment as PullRequestComment).temporaryReply = temporaryComment;
                }

                return comment;
            });
        } else {
            return; //We don't want to call createOrUpdateThread() if newComments isn't defined because this will wipe all the comments.
        }

        let commentThread = await this.createOrUpdateThread(
            commentData.prCommentThreadId!,
            commentData.parent.uri,
            commentData.parent.range,
            newComments,
        );

        //This delay is required because otherwise the temporary comment/task will not be rendered as being in edit mode. This is probably a VS Code bug related to
        //an asynchronous action, but for now I don't see a better solution than this.
        setTimeout(() => {
            commentThread.comments = commentThread.comments.map((comment) => {
                if (UUID === (comment as EnhancedComment).id) {
                    comment.mode = vscode.CommentMode.Editing;
                }

                return comment;
            });
        }, 100);
    }

    private editCommentClicked(commentData: EnhancedComment) {
        commentData = this.storeCommentContentForEdit(commentData);
        this.convertCommentToMode(commentData, vscode.CommentMode.Editing);
    }

    private async replaceEditedComment(
        comments: EnhancedComment[],
        newComment: Comment | Task,
    ): Promise<vscode.Comment[]> {
        const newComments: EnhancedComment[] = await Promise.all(
            comments.map(async (comment: EnhancedComment) => {
                if (comment.id === newComment.id) {
                    if (isPRTask(comment)) {
                        return await this.createVSCodeCommentTask(
                            comment.site,
                            comment.id!,
                            newComment as Task,
                            comment.prHref,
                            comment.prId,
                        );
                    }
                    return await this.createVSCodeComment(
                        comment.site,
                        comment.id!,
                        newComment as Comment,
                        comment.prHref,
                        comment.prId,
                    );
                }
                return comment;
            }),
        );

        return newComments;
    }

    private async updateTask(
        comments: readonly vscode.Comment[],
        taskData: PullRequestTask,
        newTaskData: Partial<Task>,
    ): Promise<PullRequestComment[]> {
        const bbApi = await clientForSite(taskData.site);
        const newTask: Task = await bbApi.pullrequests.editTask(taskData.site, taskData.prId, {
            ...(taskData as PullRequestTask).task,
            ...newTaskData,
        });
        return comments.map((comment: PullRequestComment) => {
            if (comment.id === newTask.commentId) {
                return {
                    ...comment,
                    tasks: comment.tasks.map((task) => {
                        if (task.id === newTask.id) {
                            return newTask;
                        } else {
                            return task;
                        }
                    }),
                } as PullRequestComment;
            } else {
                return {
                    ...comment,
                } as PullRequestComment;
            }
        });
    }

    async submitCommentEdit(commentData: EnhancedComment) {
        if (commentData.body === '') {
            return;
        }

        this.convertCommentToMode(commentData, vscode.CommentMode.Preview, true);
        const commentThreadId = commentData.prCommentThreadId;
        if (commentThreadId && commentData.parent) {
            let comments: vscode.Comment[];
            if (isPRComment(commentData)) {
                const bbApi = await clientForSite(commentData.site);
                let newComment: Comment = await bbApi.pullrequests.editComment(
                    commentData.site,
                    commentData.prId,
                    commentData.body.toString(),
                    commentData.id,
                    commentData.commitHash,
                );

                //The data returned by the comment API endpoint doesn't include task data, so we need to make sure we preserve that...
                newComment.tasks = commentData.tasks;
                comments = await this.replaceEditedComment(
                    commentData.parent!.comments as EnhancedComment[],
                    newComment,
                );
            } else {
                //Replace the edited task in the associated comment's task list
                comments = await this.updateTask(commentData.parent!.comments, commentData as PullRequestTask, {
                    content: commentData.body.toString(),
                });
            }

            await this.createOrUpdateThread(
                commentThreadId!,
                commentData.parent!.uri,
                commentData.parent!.range,
                comments,
            );
            commentData.parent!.dispose();
        }
    }

    async deleteComment(commentData: PullRequestComment) {
        const commentThreadId = commentData.prCommentThreadId;
        if (commentThreadId && commentData.parent) {
            const bbApi = await clientForSite(commentData.site);
            await bbApi.pullrequests.deleteComment(
                commentData.site,
                commentData.prId,
                commentData.id,
                commentData.commitHash,
            );

            let comments = commentData.parent.comments.filter(
                (comment: PullRequestComment) => comment.id !== commentData.id,
            );

            await this.createOrUpdateThread(
                commentThreadId,
                commentData.parent.uri,
                commentData.parent.range,
                comments,
            );
            commentData.parent.dispose();
        }
    }

    async deleteTask(taskData: PullRequestTask) {
        const commentThreadId = taskData.prCommentThreadId;
        if (commentThreadId && taskData.parent) {
            const bbApi = await clientForSite(taskData.site);
            await bbApi.pullrequests.deleteTask(taskData.site, taskData.prId, taskData.task);

            //Remove the deleted task from the list of tasks in the associated comment's task list
            let comments = taskData.parent.comments.map((comment: PullRequestComment) => {
                if (comment.id === taskData.task.commentId) {
                    return {
                        ...comment,
                        tasks: comment.tasks.filter((task) => task.id !== taskData.id),
                    } as PullRequestComment;
                } else {
                    return {
                        ...comment,
                    } as PullRequestComment;
                }
            });

            await this.createOrUpdateThread(commentThreadId, taskData.parent.uri, taskData.parent.range, comments);
            taskData.parent.dispose();
        }
    }

    clearCommentCache(uri: vscode.Uri) {
        const { prHref } = JSON.parse(uri.query) as PRFileDiffQueryParams;

        if (!this._commentsCache.has(prHref)) {
            this._commentsCache.set(prHref, new Map());
        }
        const prCommentCache = this._commentsCache.get(prHref)!;
        prCommentCache.forEach((thread) => thread.dispose());
    }

    provideComments(uri: vscode.Uri) {
        const { site, commentThreads, prHref, prId } = JSON.parse(uri.query) as PRFileDiffQueryParams;
        (commentThreads || []).forEach(async (commentThread: Comment[]) => {
            let range = new vscode.Range(0, 0, 0, 0);
            if (commentThread[0].inline!.from) {
                range = new vscode.Range(commentThread[0].inline!.from! - 1, 0, commentThread[0].inline!.from! - 1, 0);
            } else if (commentThread[0].inline!.to) {
                range = new vscode.Range(commentThread[0].inline!.to! - 1, 0, commentThread[0].inline!.to! - 1, 0);
            }

            let comments: PullRequestComment[] = [];
            for (const comment of commentThread) {
                comments.push(await this.createVSCodeComment(site, commentThread[0].id!, comment, prHref, prId));
            }

            if (comments.length > 0) {
                await this.createOrUpdateThread(commentThread[0].id!, uri, range, comments);
            }
        });
    }

    private async insertTasks(comments: PullRequestComment[]): Promise<vscode.Comment[]> {
        let commentsWithTasks = [];
        for (const comment of comments) {
            commentsWithTasks.push(comment);
            for (const task of comment.tasks) {
                commentsWithTasks.push(
                    await this.createVSCodeCommentTask(
                        comment.site,
                        comment.prCommentThreadId!,
                        task,
                        comment.prHref,
                        comment.prId,
                    ),
                );
            }
        }
        return commentsWithTasks;
    }

    private async insertTemporaryEntities(comments: EnhancedComment[]): Promise<vscode.Comment[]> {
        let commentsWithTemporaryEntities = [];
        for (const comment of comments) {
            commentsWithTemporaryEntities.push(comment);
            if (isPRComment(comment)) {
                if (comment.temporaryTask) {
                    commentsWithTemporaryEntities.push(comment.temporaryTask);
                }
                if (comment.temporaryReply) {
                    commentsWithTemporaryEntities.push(comment.temporaryReply);
                }
            }
        }
        return commentsWithTemporaryEntities;
    }

    private async removeTemporaryEntities(comments: EnhancedComment[]): Promise<vscode.Comment[]> {
        return comments.filter((comment) => !comment.isTemporary);
    }

    private async removeTasks(comments: EnhancedComment[]): Promise<vscode.Comment[]> {
        return comments.filter((comment) => isPRComment(comment));
    }

    private async createOrUpdateThread(
        threadId: string,
        uri: vscode.Uri,
        range: vscode.Range,
        comments: vscode.Comment[],
    ): Promise<CommentThread> {
        const { prHref } = JSON.parse(uri.query) as PRFileDiffQueryParams;

        if (!this._commentsCache.has(prHref)) {
            this._commentsCache.set(prHref, new Map());
        }
        const prCommentCache = this._commentsCache.get(prHref)!;

        if (prCommentCache.has(threadId)) {
            prCommentCache.get(threadId)!.dispose();
        }

        const commentsWithoutTemporaryEntities = await this.removeTemporaryEntities(comments as EnhancedComment[]);
        const commentsWithoutTasks = await this.removeTasks(commentsWithoutTemporaryEntities as EnhancedComment[]);
        const commentsWithTasks = await this.insertTasks(commentsWithoutTasks as PullRequestComment[]);
        const commentsWithTemporaryEntities = await this.insertTemporaryEntities(
            commentsWithTasks as PullRequestComment[],
        );

        const newThread = this._commentController.createCommentThread(uri, range, commentsWithTemporaryEntities);
        newThread.label = '';
        newThread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
        for (let comment of newThread.comments) {
            if ((comment as PullRequestComment).id) {
                (comment as PullRequestComment).parent = newThread;
            }
        }

        prCommentCache.set(threadId, newThread);

        return newThread;
    }

    private async createVSCodeCommentTask(
        site: BitbucketSite,
        parentCommentThreadId: string,
        task: Task,
        prHref: string,
        prId: string,
    ): Promise<PullRequestTask> {
        let contextValueList: string[] = [];
        if (task.editable) {
            contextValueList.push('canModifyTask');
        }
        if (task.deletable) {
            contextValueList.push('canRemoveTask');
        }
        if (task.isComplete) {
            contextValueList.push('markIncomplete');
        } else {
            contextValueList.push('markComplete');
        }

        const taskBody = task.isComplete
            ? new vscode.MarkdownString(`~~${turndownService.turndown(task.content)}~~`)
            : new vscode.MarkdownString(turndownService.turndown(task.content));
        return {
            site: site,
            prCommentThreadId: parentCommentThreadId,
            body: taskBody,
            contextValue: contextValueList.join(','),
            author: {
                name: task.isComplete ? l10n.t('Task (Complete)') : l10n.t('Task'),
            },
            mode: vscode.CommentMode.Preview,
            prHref: prHref,
            prId: prId,
            task: task,
            id: task.id,
            saveChangesContext: SaveContexts.EDITINGTASK,
            editModeContent: '',
        };
    }

    private async createVSCodeComment(
        site: BitbucketSite,
        parentCommentThreadId: string,
        comment: Comment,
        prHref: string,
        prId: string,
    ): Promise<PullRequestComment> {
        const contextValues = ['canAddReply'];
        if (!comment.commitHash) {
            contextValues.push('canAddTask');
        }
        if (comment.editable) {
            contextValues.push('canEdit');
        }
        if (comment.deletable) {
            contextValues.push('canDelete');
        }

        return {
            site: site,
            prCommentThreadId: parentCommentThreadId,
            body: new vscode.MarkdownString(turndownService.turndown(comment.htmlContent)),
            author: {
                name: comment.user.displayName || l10n.t('Unknown user'),
                iconPath: vscode.Uri.parse(comment.user.avatarUrl),
            },
            authorId: comment.user.accountId,
            contextValue: contextValues.join(','),
            mode: vscode.CommentMode.Preview,
            prHref: prHref,
            prId: prId,
            id: comment.id,
            saveChangesContext: SaveContexts.EDITINGCOMMENT,
            tasks: comment.tasks,
            editModeContent: '',
            commitHash: comment.commitHash,
        };
    }

    disposePR(prHref: string) {
        if (this._commentsCache.has(prHref)) {
            this._commentsCache.get(prHref)!.forEach((val) => val.dispose());
            this._commentsCache.delete(prHref);
        }
    }

    dispose() {
        this._commentsCache.clear();
        this._commentController.dispose();
    }
}
