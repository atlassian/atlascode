import { Avatar, Box, Button, CircularProgress, Grid, Typography } from '@material-ui/core';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Comment, User } from '../../../bitbucket/model';
import CommentForm from '../common/CommentForm';
import { formatDate } from './bitbucketDateFormatter';
import { CommentTaskList } from './CommentTaskList';
import { NestedCommentList } from './NestedCommentList';
import { PullRequestDetailsControllerContext } from './pullRequestDetailsController';
import { TaskAdder } from './TaskAdder';
import * as l10n from '@vscode/l10n';

type NestedCommentProps = {
    comment: Comment;
    currentUser: User;
    fetchUsers: (input: string) => Promise<User[]>;
    onDelete: (comment: Comment) => Promise<void>;
};
export const NestedComment: React.FunctionComponent<NestedCommentProps> = ({
    comment,
    currentUser,
    fetchUsers,
    onDelete,
}) => {
    const [isReplying, setIsReplying] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const controller = useContext(PullRequestDetailsControllerContext);

    const handleReplyPressed = useCallback(() => {
        setIsReplying(true);
    }, []);

    const handleCreateTaskPressed = useCallback(() => {
        setIsCreatingTask(true);
    }, []);

    const handleCancelTask = useCallback(() => {
        setIsCreatingTask(false);
    }, []);

    const handleAddTask = useCallback(
        async (content: string) => {
            await controller.addTask(content, comment.id);
            setIsCreatingTask(false);
        },
        [controller, comment.id],
    );

    const handleSave = useCallback(
        async (content: string) => {
            await controller.postComment(content, comment.id);
            setIsReplying(false);
        },
        [controller, comment.id],
    );

    const handleEditPressed = useCallback(() => {
        setIsEditing(true);
    }, []);

    const handleEdit = useCallback(
        async (content: string) => {
            await controller.editComment(content, comment.id);
            setIsEditing(false);
        },
        [controller, comment.id],
    );

    const handleCancelEdit = useCallback(() => {
        setIsEditing(false);
    }, []);

    const handleCancel = useCallback(() => {
        setIsReplying(false);
    }, []);

    const handleDelete = useCallback(async () => {
        setIsLoading(true);
        await onDelete(comment);
    }, [comment, onDelete]);

    useEffect(() => {
        setIsLoading(false);
    }, [comment]);

    return (
        <React.Fragment>
            <Box hidden={isEditing}>
                <Grid container spacing={1} direction="row" alignItems="flex-start">
                    <Grid item>
                        <Avatar src={comment.user.avatarUrl} alt={comment.user.displayName} />
                    </Grid>
                    <Grid item>
                        <Grid container direction={'column'}>
                            <Grid item>
                                <Typography variant="subtitle2">
                                    {comment.user.displayName}
                                    {'  '}
                                    {formatDate(comment.ts)}
                                </Typography>
                            </Grid>

                            <Box hidden={!isLoading}>
                                <CircularProgress />
                            </Box>
                            <Box hidden={isLoading}>
                                <Typography dangerouslySetInnerHTML={{ __html: comment.htmlContent }} />
                            </Box>
                            <Grid item>
                                <Grid container direction={'row'}>
                                    <Grid item>
                                        <Button color={'primary'} onClick={handleReplyPressed}>
                                            {l10n.t('Reply')}
                                        </Button>
                                    </Grid>
                                    <Grid item>
                                        <Box hidden={!comment.editable}>
                                            <Button color={'primary'} onClick={handleEditPressed}>
                                                {l10n.t('Edit')}
                                            </Button>
                                        </Box>
                                    </Grid>
                                    <Grid item>
                                        <Box hidden={comment.deleted || !comment.deletable}>
                                            <Button color={'primary'} onClick={handleDelete}>
                                                {l10n.t('Delete')}
                                            </Button>
                                        </Box>
                                    </Grid>
                                    <Grid item>
                                        <Box marginLeft={2}>
                                            <Button color={'primary'} onClick={handleCreateTaskPressed}>
                                                {l10n.t('Create Task')}
                                            </Button>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Box>
            <Box hidden={!isEditing}>
                <Grid item>
                    <CommentForm
                        initialContent={comment.rawContent}
                        currentUser={currentUser}
                        onSave={handleEdit}
                        onCancel={handleCancelEdit}
                        fetchUsers={fetchUsers}
                    />
                </Grid>
            </Box>
            <Box hidden={!isCreatingTask}>
                <Grid item>
                    <TaskAdder handleCancel={handleCancelTask} addTask={handleAddTask} />
                </Grid>
            </Box>

            <Grid item>
                <CommentTaskList tasks={comment.tasks} onEdit={controller.editTask} onDelete={controller.deleteTask} />
            </Grid>
            <Box hidden={!isReplying}>
                <Grid item>
                    <Box marginLeft={5}>
                        <CommentForm
                            currentUser={currentUser}
                            onSave={handleSave}
                            onCancel={handleCancel}
                            fetchUsers={fetchUsers}
                        />
                    </Box>
                </Grid>
            </Box>

            <Box hidden={comment.children.length === 0}>
                <Grid item>
                    <Box marginLeft={5}>
                        <NestedCommentList
                            comments={comment.children}
                            currentUser={currentUser}
                            onDelete={onDelete}
                            fetchUsers={fetchUsers}
                        />
                    </Box>
                </Grid>
            </Box>
        </React.Fragment>
    );
};
