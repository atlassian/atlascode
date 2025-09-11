import { render, screen } from '@testing-library/react';
import React from 'react';
import { Comment, PullRequestState, Task, User } from 'src/bitbucket/model';

import { NestedComment } from './NestedComment';
import { PullRequestDetailsControllerApi, PullRequestDetailsControllerContext } from './pullRequestDetailsController';

jest.mock('./CommentTaskList', () => ({
    CommentTaskList: ({ tasks }: { tasks: Task[] }) => <div data-testid="comment-task-list">{tasks.length} tasks</div>,
}));

jest.mock('./CommentTaskAdder', () => ({
    TaskAdder: ({ handleCancel, addTask }: { handleCancel: () => void; addTask: (content: string) => void }) => (
        <div data-testid="task-adder">
            <button onClick={handleCancel}>Cancel</button>
            <button onClick={() => addTask('Test task')}>Add Task</button>
        </div>
    ),
}));

jest.mock('../common/CommentForm', () => ({
    __esModule: true,
    default: ({ onSave, onCancel }: { onSave: (content: string) => void; onCancel: () => void }) => (
        <div data-testid="comment-form">
            <button onClick={() => onSave('Test reply')}>Save</button>
            <button onClick={onCancel}>Cancel</button>
        </div>
    ),
}));

jest.mock('./EditableTextComponent', () => ({
    EditableTextComponent: ({ onSave, onCancel }: { onSave: (content: string) => void; onCancel: () => void }) => (
        <div data-testid="editable-text">
            <button onClick={() => onSave('Edited content')}>Save</button>
            <button onClick={onCancel}>Cancel</button>
        </div>
    ),
}));

jest.mock('./NestedCommentList', () => ({
    NestedCommentList: ({ comments }: { comments: Comment[] }) => (
        <div data-testid="nested-comment-list">{comments.length} nested comments</div>
    ),
}));

const mockUser: User = {
    accountId: 'user1',
    displayName: 'Test User',
    avatarUrl: 'avatar.jpg',
    url: 'https://user1.com',
    mention: '@user1',
};

const mockComment: Comment = {
    id: 'comment1',
    deletable: true,
    editable: true,
    user: mockUser,
    htmlContent: '<p>Test comment content</p>',
    rawContent: 'Test comment content',
    ts: '2023-01-01T00:00:00Z',
    updatedTs: '2023-01-01T00:00:00Z',
    deleted: false,
    tasks: [],
    children: [],
};

const mockController: PullRequestDetailsControllerApi = {
    addTask: jest.fn(),
    editTask: jest.fn(),
    deleteTask: jest.fn(),
    updateReviewers: jest.fn(),
    openBuildStatus: jest.fn(),
    refresh: jest.fn(),
    copyLink: jest.fn(),
    updateApprovalStatus: jest.fn(),
    merge: jest.fn(),
    postComment: jest.fn(),
    editComment: jest.fn(),
    deleteComment: jest.fn(),
    postMessage: jest.fn(),
    fetchUsers: jest.fn(),
    updateSummary: jest.fn(),
    updateTitle: jest.fn(),
    checkoutBranch: jest.fn(),
    openDiff: jest.fn(),
    openJiraIssue: jest.fn(),
} as PullRequestDetailsControllerApi;

const renderWithContext = (pullRequestState: PullRequestState, comment: Comment = mockComment) => {
    return render(
        <PullRequestDetailsControllerContext.Provider value={mockController}>
            <NestedComment
                comment={comment}
                currentUser={mockUser}
                fetchUsers={jest.fn()}
                onDelete={jest.fn()}
                pullRequestState={pullRequestState}
            />
        </PullRequestDetailsControllerContext.Provider>,
    );
};

describe('NestedComment', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('create task button visibility', () => {
        it('shows create task button when pull request state is OPEN', () => {
            renderWithContext('OPEN');

            const createTaskButton = screen.getByText('Create task');
            expect(createTaskButton).toBeTruthy();

            const buttonContainer = createTaskButton.closest('[hidden]');
            expect(buttonContainer).not.toBeTruthy();
        });

        it.each([['MERGED'], ['SUPERSEDED'], ['DECLINED']])('hides create task button for %s state', (state) => {
            renderWithContext(state as PullRequestState);

            const createTaskButton = screen.getByText('Create task');
            const buttonContainer = createTaskButton.closest('[hidden]');
            expect(buttonContainer).toBeTruthy();
        });
    });
});
