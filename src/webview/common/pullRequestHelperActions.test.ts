import { Comment, FileDiff, FileStatus, Task, User } from '../../bitbucket/model';
import {
    addTasksToCommentHierarchy,
    addTaskToCommentHierarchy,
    addToCommentHierarchy,
    fileDiffContainsComments,
    replaceCommentInHierarchy,
    replaceTaskInCommentHierarchy,
    replaceTaskInTaskList,
} from './pullRequestHelperActions';

// Mock data factories
const createMockUser = (overrides: Partial<User> = {}): User => ({
    accountId: 'user-123',
    displayName: 'Test User',
    userName: 'testuser',
    emailAddress: 'test@example.com',
    url: 'https://bitbucket.org/testuser',
    avatarUrl: 'https://avatar.url',
    mention: '@testuser',
    ...overrides,
});

const createMockComment = (overrides: Partial<Comment> = {}): Comment => ({
    id: 'comment-1',
    parentId: undefined,
    deletable: true,
    editable: true,
    user: createMockUser(),
    htmlContent: '<p>Test comment</p>',
    rawContent: 'Test comment',
    ts: '2023-01-01T00:00:00Z',
    updatedTs: '2023-01-01T00:00:00Z',
    deleted: false,
    children: [],
    tasks: [],
    commitHash: 'abc123',
    ...overrides,
});

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: 'task-1',
    commentId: 'comment-1',
    creator: createMockUser(),
    created: '2023-01-01T00:00:00Z',
    updated: '2023-01-01T00:00:00Z',
    isComplete: false,
    editable: true,
    deletable: true,
    content: 'Test task',
    version: 1,
    ...overrides,
});

const createMockFileDiff = (overrides: Partial<FileDiff> = {}): FileDiff => ({
    file: 'test.js',
    status: FileStatus.MODIFIED,
    linesAdded: 5,
    linesRemoved: 3,
    oldPath: 'old/test.js',
    newPath: 'new/test.js',
    hasComments: false,
    hunkMeta: {
        oldPathAdditions: [],
        oldPathDeletions: [],
        newPathAdditions: [],
        newPathDeletions: [],
        newPathContextMap: {},
    },
    ...overrides,
});

describe('pullRequestHelperActions', () => {
    describe('addToCommentHierarchy', () => {
        it('should add a comment as a child to its parent comment', () => {
            const parentComment = createMockComment({ id: 'parent-1' });
            const childComment = createMockComment({ id: 'child-1', parentId: 'parent-1' });
            const comments = [parentComment];

            const [updatedComments, success] = addToCommentHierarchy(comments, childComment);

            expect(success).toBe(true);
            expect(updatedComments).toHaveLength(1);
            expect(updatedComments[0].children).toHaveLength(1);
            expect(updatedComments[0].children[0]).toEqual(childComment);
        });

        it('should add a comment as a nested child to a grandparent comment', () => {
            const grandparentComment = createMockComment({ id: 'grandparent-1' });
            const parentComment = createMockComment({ id: 'parent-1', parentId: 'grandparent-1' });
            const childComment = createMockComment({ id: 'child-1', parentId: 'parent-1' });

            grandparentComment.children = [parentComment];
            const comments = [grandparentComment];

            const [updatedComments, success] = addToCommentHierarchy(comments, childComment);

            expect(success).toBe(true);
            expect(updatedComments).toHaveLength(1);
            expect(updatedComments[0].children).toHaveLength(1);
            expect(updatedComments[0].children[0].children).toHaveLength(1);
            expect(updatedComments[0].children[0].children[0]).toEqual(childComment);
        });

        it('should return false when parent comment is not found', () => {
            const parentComment = createMockComment({ id: 'parent-1' });
            const childComment = createMockComment({ id: 'child-1', parentId: 'nonexistent-parent' });
            const comments = [parentComment];

            const [updatedComments, success] = addToCommentHierarchy(comments, childComment);

            expect(success).toBe(false);
            expect(updatedComments).toEqual(comments);
        });

        it('should handle empty comments array', () => {
            const childComment = createMockComment({ id: 'child-1', parentId: 'parent-1' });
            const comments: Comment[] = [];

            const [updatedComments, success] = addToCommentHierarchy(comments, childComment);

            expect(success).toBe(false);
            expect(updatedComments).toEqual([]);
        });

        it('should preserve existing children when adding a new child', () => {
            const existingChild = createMockComment({ id: 'existing-child', parentId: 'parent-1' });
            const parentComment = createMockComment({ id: 'parent-1', children: [existingChild] });
            const newChild = createMockComment({ id: 'new-child', parentId: 'parent-1' });
            const comments = [parentComment];

            const [updatedComments, success] = addToCommentHierarchy(comments, newChild);

            expect(success).toBe(true);
            expect(updatedComments[0].children).toHaveLength(2);
            expect(updatedComments[0].children).toContain(existingChild);
            expect(updatedComments[0].children).toContain(newChild);
        });
    });

    describe('replaceCommentInHierarchy', () => {
        it('should replace a root comment', () => {
            const originalComment = createMockComment({ id: 'comment-1', rawContent: 'Original content' });
            const updatedComment = createMockComment({ id: 'comment-1', rawContent: 'Updated content' });
            const comments = [originalComment];

            const [updatedComments, success] = replaceCommentInHierarchy(comments, updatedComment);

            expect(success).toBe(true);
            expect(updatedComments).toHaveLength(1);
            expect(updatedComments[0].rawContent).toBe('Updated content');
        });

        it('should preserve children and tasks when replacing a comment', () => {
            const childComment = createMockComment({ id: 'child-1' });
            const task = createMockTask({ id: 'task-1' });
            const originalComment = createMockComment({
                id: 'comment-1',
                children: [childComment],
                tasks: [task],
            });
            const updatedComment = createMockComment({
                id: 'comment-1',
                rawContent: 'Updated content',
                children: [], // Empty in API response
                tasks: [], // Empty in API response
            });
            const comments = [originalComment];

            const [updatedComments, success] = replaceCommentInHierarchy(comments, updatedComment);

            expect(success).toBe(true);
            expect(updatedComments[0].children).toEqual([childComment]);
            expect(updatedComments[0].tasks).toEqual([task]);
            expect(updatedComments[0].rawContent).toBe('Updated content');
        });

        it('should replace a nested comment', () => {
            const childComment = createMockComment({ id: 'child-1', rawContent: 'Original child' });
            const parentComment = createMockComment({ id: 'parent-1', children: [childComment] });
            const updatedChildComment = createMockComment({ id: 'child-1', rawContent: 'Updated child' });
            const comments = [parentComment];

            const [updatedComments, success] = replaceCommentInHierarchy(comments, updatedChildComment);

            expect(success).toBe(true);
            expect(updatedComments[0].children[0].rawContent).toBe('Updated child');
        });

        it('should return false when comment is not found', () => {
            const comment = createMockComment({ id: 'comment-1' });
            const nonExistentComment = createMockComment({ id: 'nonexistent' });
            const comments = [comment];

            const [updatedComments, success] = replaceCommentInHierarchy(comments, nonExistentComment);

            expect(success).toBe(false);
            expect(updatedComments).toEqual(comments);
        });

        it('should handle deeply nested comment replacement', () => {
            const deepChild = createMockComment({ id: 'deep-child', rawContent: 'Original deep' });
            const child = createMockComment({ id: 'child', children: [deepChild] });
            const parent = createMockComment({ id: 'parent', children: [child] });
            const updatedDeepChild = createMockComment({ id: 'deep-child', rawContent: 'Updated deep' });
            const comments = [parent];

            const [updatedComments, success] = replaceCommentInHierarchy(comments, updatedDeepChild);

            expect(success).toBe(true);
            expect(updatedComments[0].children[0].children[0].rawContent).toBe('Updated deep');
        });
    });

    describe('addTaskToCommentHierarchy', () => {
        it('should add a task to a root comment', () => {
            const comment = createMockComment({ id: 'comment-1' });
            const task = createMockTask({ id: 'task-1', commentId: 'comment-1' });
            const comments = [comment];

            const [updatedComments, success] = addTaskToCommentHierarchy(comments, task);

            expect(success).toBe(true);
            expect(updatedComments[0].tasks).toHaveLength(1);
            expect(updatedComments[0].tasks[0]).toEqual(task);
        });

        it('should add a task to a nested comment', () => {
            const childComment = createMockComment({ id: 'child-1' });
            const parentComment = createMockComment({ id: 'parent-1', children: [childComment] });
            const task = createMockTask({ id: 'task-1', commentId: 'child-1' });
            const comments = [parentComment];

            const [updatedComments, success] = addTaskToCommentHierarchy(comments, task);

            expect(success).toBe(true);
            expect(updatedComments[0].children[0].tasks).toHaveLength(1);
            expect(updatedComments[0].children[0].tasks[0]).toEqual(task);
        });

        it('should return false when comment is not found', () => {
            const comment = createMockComment({ id: 'comment-1' });
            const task = createMockTask({ id: 'task-1', commentId: 'nonexistent' });
            const comments = [comment];

            const [updatedComments, success] = addTaskToCommentHierarchy(comments, task);

            expect(success).toBe(false);
            expect(updatedComments).toEqual(comments);
        });

        it('should preserve existing tasks when adding a new task', () => {
            const existingTask = createMockTask({ id: 'existing-task' });
            const comment = createMockComment({ id: 'comment-1', tasks: [existingTask] });
            const newTask = createMockTask({ id: 'new-task', commentId: 'comment-1' });
            const comments = [comment];

            const [updatedComments, success] = addTaskToCommentHierarchy(comments, newTask);

            expect(success).toBe(true);
            expect(updatedComments[0].tasks).toHaveLength(2);
            expect(updatedComments[0].tasks).toContain(existingTask);
            expect(updatedComments[0].tasks).toContain(newTask);
        });
    });

    describe('addTasksToCommentHierarchy', () => {
        it('should add multiple tasks to their respective comments', () => {
            const comment1 = createMockComment({ id: 'comment-1' });
            const comment2 = createMockComment({ id: 'comment-2' });
            const task1 = createMockTask({ id: 'task-1', commentId: 'comment-1' });
            const task2 = createMockTask({ id: 'task-2', commentId: 'comment-2' });
            const task3 = createMockTask({ id: 'task-3', commentId: 'comment-1' });
            const comments = [comment1, comment2];
            const tasks = [task1, task2, task3];

            const updatedComments = addTasksToCommentHierarchy(comments, tasks);

            expect(updatedComments[0].tasks).toHaveLength(2);
            expect(updatedComments[0].tasks).toContain(task1);
            expect(updatedComments[0].tasks).toContain(task3);
            expect(updatedComments[1].tasks).toHaveLength(1);
            expect(updatedComments[1].tasks).toContain(task2);
        });

        it('should handle empty tasks array', () => {
            const comment = createMockComment({ id: 'comment-1' });
            const comments = [comment];
            const tasks: Task[] = [];

            const updatedComments = addTasksToCommentHierarchy(comments, tasks);

            expect(updatedComments).toEqual(comments);
        });

        it('should skip tasks without commentId', () => {
            const comment = createMockComment({ id: 'comment-1' });
            const validTask = createMockTask({ id: 'task-1', commentId: 'comment-1' });
            const invalidTask = createMockTask({ id: 'task-2', commentId: undefined });
            const comments = [comment];
            const tasks = [validTask, invalidTask];

            const updatedComments = addTasksToCommentHierarchy(comments, tasks);

            expect(updatedComments[0].tasks).toHaveLength(1);
            expect(updatedComments[0].tasks[0]).toEqual(validTask);
        });

        it('should handle tasks that reference non-existent comments', () => {
            const comment = createMockComment({ id: 'comment-1' });
            const validTask = createMockTask({ id: 'task-1', commentId: 'comment-1' });
            const orphanTask = createMockTask({ id: 'task-2', commentId: 'nonexistent' });
            const comments = [comment];
            const tasks = [validTask, orphanTask];

            const updatedComments = addTasksToCommentHierarchy(comments, tasks);

            expect(updatedComments[0].tasks).toHaveLength(1);
            expect(updatedComments[0].tasks[0]).toEqual(validTask);
        });
    });

    describe('replaceTaskInTaskList', () => {
        it('should replace a task in the list', () => {
            const originalTask = createMockTask({ id: 'task-1', content: 'Original task' });
            const otherTask = createMockTask({ id: 'task-2' });
            const updatedTask = createMockTask({ id: 'task-1', content: 'Updated task' });
            const tasks = [originalTask, otherTask];

            const updatedTasks = replaceTaskInTaskList(tasks, updatedTask);

            expect(updatedTasks).toHaveLength(2);
            expect(updatedTasks[0].content).toBe('Updated task');
            expect(updatedTasks[1]).toEqual(otherTask);
        });

        it('should return the same list if task is not found', () => {
            const task1 = createMockTask({ id: 'task-1' });
            const task2 = createMockTask({ id: 'task-2' });
            const nonExistentTask = createMockTask({ id: 'task-3' });
            const tasks = [task1, task2];

            const updatedTasks = replaceTaskInTaskList(tasks, nonExistentTask);

            expect(updatedTasks).toHaveLength(2);
            expect(updatedTasks[0]).toEqual(task1);
            expect(updatedTasks[1]).toEqual(task2);
        });

        it('should handle empty task list', () => {
            const task = createMockTask({ id: 'task-1' });
            const tasks: Task[] = [];

            const updatedTasks = replaceTaskInTaskList(tasks, task);

            expect(updatedTasks).toEqual([]);
        });
    });

    describe('replaceTaskInCommentHierarchy', () => {
        it('should replace a task in a root comment', () => {
            const originalTask = createMockTask({ id: 'task-1', content: 'Original', commentId: 'comment-1' });
            const comment = createMockComment({ id: 'comment-1', tasks: [originalTask] });
            const updatedTask = createMockTask({ id: 'task-1', content: 'Updated', commentId: 'comment-1' });
            const comments = [comment];

            const [updatedComments, success] = replaceTaskInCommentHierarchy(comments, updatedTask);

            expect(success).toBe(true);
            expect(updatedComments[0].tasks[0].content).toBe('Updated');
        });

        it('should replace a task in a nested comment', () => {
            const originalTask = createMockTask({ id: 'task-1', content: 'Original', commentId: 'child-1' });
            const childComment = createMockComment({ id: 'child-1', tasks: [originalTask] });
            const parentComment = createMockComment({ id: 'parent-1', children: [childComment] });
            const updatedTask = createMockTask({ id: 'task-1', content: 'Updated', commentId: 'child-1' });
            const comments = [parentComment];

            const [updatedComments, success] = replaceTaskInCommentHierarchy(comments, updatedTask);

            expect(success).toBe(true);
            expect(updatedComments[0].children[0].tasks[0].content).toBe('Updated');
        });

        it('should return false when comment is not found', () => {
            const comment = createMockComment({ id: 'comment-1' });
            const task = createMockTask({ id: 'task-1', commentId: 'nonexistent' });
            const comments = [comment];

            const [updatedComments, success] = replaceTaskInCommentHierarchy(comments, task);

            expect(success).toBe(false);
            expect(updatedComments).toEqual(comments);
        });

        it('should handle multiple tasks in a comment', () => {
            const task1 = createMockTask({ id: 'task-1', content: 'Task 1', commentId: 'comment-1' });
            const task2 = createMockTask({ id: 'task-2', content: 'Task 2', commentId: 'comment-1' });
            const comment = createMockComment({ id: 'comment-1', tasks: [task1, task2] });
            const updatedTask1 = createMockTask({ id: 'task-1', content: 'Updated Task 1', commentId: 'comment-1' });
            const comments = [comment];

            const [updatedComments, success] = replaceTaskInCommentHierarchy(comments, updatedTask1);

            expect(success).toBe(true);
            expect(updatedComments[0].tasks).toHaveLength(2);
            expect(updatedComments[0].tasks[0].content).toBe('Updated Task 1');
            expect(updatedComments[0].tasks[1].content).toBe('Task 2');
        });
    });

    describe('fileDiffContainsComments', () => {
        it('should return true when fileDiff oldPath matches comment inline path', () => {
            const fileDiff = createMockFileDiff({ oldPath: 'src/test.js', newPath: 'src/test-renamed.js' });
            const comment = createMockComment({
                inline: { path: 'src/test.js', from: 10, to: 15 },
            });
            const inlineComments = [comment];

            const result = fileDiffContainsComments(fileDiff, inlineComments);

            expect(result).toBe(true);
        });

        it('should return true when fileDiff newPath matches comment inline path', () => {
            const fileDiff = createMockFileDiff({ oldPath: 'src/test.js', newPath: 'src/test-renamed.js' });
            const comment = createMockComment({
                inline: { path: 'src/test-renamed.js', from: 10, to: 15 },
            });
            const inlineComments = [comment];

            const result = fileDiffContainsComments(fileDiff, inlineComments);

            expect(result).toBe(true);
        });

        it('should return false when no paths match', () => {
            const fileDiff = createMockFileDiff({ oldPath: 'src/test.js', newPath: 'src/test-renamed.js' });
            const comment = createMockComment({
                inline: { path: 'src/other.js', from: 10, to: 15 },
            });
            const inlineComments = [comment];

            const result = fileDiffContainsComments(fileDiff, inlineComments);

            expect(result).toBe(false);
        });

        it('should return false when fileDiff has no paths', () => {
            const fileDiff = createMockFileDiff({ oldPath: undefined, newPath: undefined });
            const comment = createMockComment({
                inline: { path: 'src/test.js', from: 10, to: 15 },
            });
            const inlineComments = [comment];

            const result = fileDiffContainsComments(fileDiff, inlineComments);

            expect(result).toBe(false);
        });

        it('should return false when comment has no inline path', () => {
            const fileDiff = createMockFileDiff({ oldPath: 'src/test.js', newPath: 'src/test.js' });
            const comment = createMockComment({ inline: undefined });
            const inlineComments = [comment];

            const result = fileDiffContainsComments(fileDiff, inlineComments);

            expect(result).toBe(false);
        });

        it('should return false when inline comments array is empty', () => {
            const fileDiff = createMockFileDiff({ oldPath: 'src/test.js', newPath: 'src/test.js' });
            const inlineComments: Comment[] = [];

            const result = fileDiffContainsComments(fileDiff, inlineComments);

            expect(result).toBe(false);
        });

        it('should check multiple comments and return true if any match', () => {
            const fileDiff = createMockFileDiff({ oldPath: 'src/test.js', newPath: 'src/test-renamed.js' });
            const comment1 = createMockComment({
                inline: { path: 'src/other.js', from: 10, to: 15 },
            });
            const comment2 = createMockComment({
                inline: { path: 'src/test.js', from: 20, to: 25 },
            });
            const comment3 = createMockComment({
                inline: { path: 'src/another.js', from: 30, to: 35 },
            });
            const inlineComments = [comment1, comment2, comment3];

            const result = fileDiffContainsComments(fileDiff, inlineComments);

            expect(result).toBe(true);
        });

        it('should handle fileDiff with only oldPath', () => {
            const fileDiff = createMockFileDiff({ oldPath: 'src/deleted.js', newPath: undefined });
            const comment = createMockComment({
                inline: { path: 'src/deleted.js', from: 10, to: 15 },
            });
            const inlineComments = [comment];

            const result = fileDiffContainsComments(fileDiff, inlineComments);

            expect(result).toBe(true);
        });

        it('should handle fileDiff with only newPath', () => {
            const fileDiff = createMockFileDiff({ oldPath: undefined, newPath: 'src/added.js' });
            const comment = createMockComment({
                inline: { path: 'src/added.js', from: 10, to: 15 },
            });
            const inlineComments = [comment];

            const result = fileDiffContainsComments(fileDiff, inlineComments);

            expect(result).toBe(true);
        });

        it('should handle comment with inline object but no path', () => {
            const fileDiff = createMockFileDiff({ oldPath: 'src/test.js', newPath: 'src/test.js' });
            const comment = createMockComment({
                inline: { from: 10, to: 15 } as any, // Missing path property
            });
            const inlineComments = [comment];

            const result = fileDiffContainsComments(fileDiff, inlineComments);

            expect(result).toBe(false);
        });
    });
});
