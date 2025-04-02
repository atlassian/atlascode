import { Avatar, Box, Button, CircularProgress, Grid, Tooltip, Typography, makeStyles } from '@material-ui/core';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Comment, User } from '../../../bitbucket/model';
import CommentForm from '../common/CommentForm';
import { formatTime } from '../util/date-fns';
import { CommentTaskList } from './CommentTaskList';
import { NestedCommentList } from './NestedCommentList';
import { PullRequestDetailsControllerContext } from './pullRequestDetailsController';
import { TaskAdder } from './CommentTaskAdder';
import { format, parseISO } from 'date-fns';

const useStyles = makeStyles({
    actionButton: {
        textTransform: 'none',
        minWidth: 'auto',
        padding: '0',
        '&:hover': {
            background: 'transparent',
            textDecoration: 'underline',
        },
        fontWeight: 'normal',
        fontSize: '14px',
        color: 'inherit',
    },
    buttonSeparator: {
        color: 'inherit',
        content: '.',
        display: 'inline-Lock',
        textAlign: 'left',
        verticalAlign: 'middle',
        marginRight: '8px',
        marginLeft: '8px',
    },
    avatar: {
        width: '24',
        height: '24',
    },
    userName: {
        fontWeight: 'bold',
    },
    timestamp: {
        marginLeft: '8px',
        cursor: 'default',
    },
    commentTaskList: {
        marginTop: '8px',
    },
});

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
    const classes = useStyles();
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
                        <Avatar
                            className={classes.avatar}
                            src={comment.user.avatarUrl}
                            alt={comment.user.displayName}
                        />
                    </Grid>
                    <Grid item xs>
                        <Grid container direction="column">
                            <Grid item>
                                <Typography variant="subtitle2">
                                    <span className={classes.userName}>{comment.user.displayName}</span>
                                    <Tooltip title={format(parseISO(comment.ts), "MMMM d, yyyy 'at' HH:mm:ss a zzz")}>
                                        <span className={classes.timestamp}>
                                            {formatTime(comment.ts, { daysPreference: 7 })}
                                        </span>
                                    </Tooltip>
                                </Typography>
                            </Grid>
                            <Box hidden={!isLoading}>
                                <CircularProgress />
                            </Box>
                            <Box hidden={isLoading}>
                                <Typography dangerouslySetInnerHTML={{ __html: comment.htmlContent }} />
                            </Box>
                            <Grid item>
                                <Grid container direction={'row'} alignItems="center">
                                    <Button className={classes.actionButton} disableRipple onClick={handleReplyPressed}>
                                        Reply
                                    </Button>
                                    <span className={classes.buttonSeparator}>·</span>
                                    <Box hidden={!comment.editable}>
                                        <Button
                                            className={classes.actionButton}
                                            disableRipple
                                            onClick={handleEditPressed}
                                        >
                                            Edit
                                        </Button>
                                        <span className={classes.buttonSeparator}>·</span>
                                    </Box>
                                    <Box hidden={comment.deleted || !comment.deletable}>
                                        <Button className={classes.actionButton} disableRipple onClick={handleDelete}>
                                            Delete
                                        </Button>
                                        <span className={classes.buttonSeparator}>·</span>
                                    </Box>
                                    <Button
                                        className={classes.actionButton}
                                        disableRipple
                                        onClick={handleCreateTaskPressed}
                                    >
                                        Create task
                                    </Button>
                                </Grid>
                            </Grid>
                            <Grid item className={classes.commentTaskList}>
                                <CommentTaskList
                                    tasks={comment.tasks}
                                    onEdit={controller.editTask}
                                    onDelete={controller.deleteTask}
                                />
                            </Grid>
                            <Grid item>
                                <Box hidden={!isCreatingTask}>
                                    <TaskAdder handleCancel={handleCancelTask} addTask={handleAddTask} />
                                </Box>
                            </Grid>
                            <Grid item>
                                <Box hidden={!isReplying}>
                                    <CommentForm
                                        currentUser={currentUser}
                                        onSave={handleSave}
                                        onCancel={handleCancel}
                                        fetchUsers={fetchUsers}
                                    />
                                </Box>
                            </Grid>
                            <Grid item>
                                <Box hidden={comment.children.length === 0}>
                                    <NestedCommentList
                                        comments={comment.children}
                                        currentUser={currentUser}
                                        onDelete={onDelete}
                                        fetchUsers={fetchUsers}
                                    />
                                </Box>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Box>
            {/* Edit form */}
            <Box hidden={!isEditing}>
                <CommentForm
                    initialContent={comment.rawContent}
                    currentUser={currentUser}
                    onSave={handleEdit}
                    onCancel={handleCancelEdit}
                    fetchUsers={fetchUsers}
                />
            </Box>
        </React.Fragment>
    );
};
