import { Checkbox, IconButton, makeStyles, Tooltip } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import React, { useCallback, useState } from 'react';
import { Task } from '../../../bitbucket/model';
import { EditableTextComponent } from './EditableTextComponent';

type CommentTaskProps = {
    task: Task;
    onEdit: (task: Task) => Promise<void>;
    onDelete: (task: Task) => Promise<void>;
};

const useStyles = makeStyles({
    taskContainer: {
        display: 'flex',
        alignItems: 'flex-start',
        '&:hover .deleteButton': {
            opacity: 1,
        },
        width: '100%',
        minWidth: 0,
    },
    checkbox: {
        padding: 0,
        marginRight: 8,
        marginTop: 3,
    },
    deleteButton: {
        padding: 4,
        marginLeft: 4,
        marginTop: 3,
        opacity: 0,
        transition: 'opacity 0.2s',
        '&:hover': {
            color: 'var(--vscode-errorForeground)',
        },
    },
});

export const CommentTask: React.FunctionComponent<CommentTaskProps> = ({ task, onEdit, onDelete }) => {
    const classes = useStyles();
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const handleMarkTaskComplete = useCallback(async () => {
        setIsLoading(true);
        await onEdit({ ...task, isComplete: !task.isComplete });
        setIsLoading(false);
    }, [task, onEdit]);

    const handleEditContent = useCallback(
        async (newContent: string) => {
            if (newContent.trim() !== task.content) {
                setIsLoading(true);
                await onEdit({ ...task, content: newContent });
                setIsLoading(false);
            }
            setIsEditing(false);
        },
        [task, onEdit],
    );

    const handleDelete = useCallback(async () => {
        setIsLoading(true);
        await onDelete(task);
    }, [task, onDelete]);

    const handleCancel = useCallback(() => {
        setIsEditing(false);
    }, []);

    const handleFocus = useCallback(() => {
        setIsEditing(true);
    }, []);

    return (
        <div className={classes.taskContainer}>
            <Checkbox
                color="primary"
                checked={task.isComplete}
                onChange={handleMarkTaskComplete}
                disabled={isLoading}
                className={classes.checkbox}
            />
            <EditableTextComponent
                initialContent={task.content}
                onSave={handleEditContent}
                onCancel={handleCancel}
                onFocus={handleFocus}
                showCancelButton={isEditing}
                disabled={!task.editable || isLoading}
            />
            {!isEditing && task.deletable && (
                <Tooltip title="Delete task">
                    <IconButton
                        size="small"
                        onClick={handleDelete}
                        className={`${classes.deleteButton} deleteButton`}
                        disabled={isLoading}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}
        </div>
    );
};
