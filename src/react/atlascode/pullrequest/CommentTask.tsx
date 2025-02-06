import { Box, Button, Checkbox, CircularProgress, Grid, TextField, Typography } from '@material-ui/core';
import React, { useCallback, useEffect, useState } from 'react';
import { Task } from '../../../bitbucket/model';
import * as l10n from '@vscode/l10n';

type CommentTaskProps = {
    task: Task;
    onEdit: (task: Task) => Promise<void>;
    onDelete: (task: Task) => Promise<void>;
};
export const CommentTask: React.FunctionComponent<CommentTaskProps> = ({ task, onEdit, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [taskContent, setTaskContent] = useState(task.content);

    const handleEditPressed = useCallback(() => {
        setIsEditing(!isEditing);
    }, [isEditing]);

    const handleSave = useCallback(async () => {
        setIsLoading(true);
        await onEdit({ ...task, content: taskContent });
        setIsEditing(false);
    }, [taskContent, task, onEdit]);

    const handleCancel = useCallback(() => {
        setIsEditing(false);
    }, []);

    const handleDelete = useCallback(async () => {
        setIsLoading(true);
        await onDelete(task);
    }, [task, onDelete]);

    const handleMarkTaskComplete = useCallback(async () => {
        setIsLoading(true);
        await onEdit({ ...task, isComplete: !task.isComplete });
    }, [task, onEdit]);

    const handleTaskContentChange = useCallback(
        (event: React.ChangeEvent<{ value: string }>) => {
            setTaskContent(event.target.value);
        },
        [setTaskContent],
    );

    useEffect(() => {
        setTaskContent(task.content);
        setIsLoading(false);
    }, [task]);

    return (
        <React.Fragment>
            <Box hidden={isEditing}>
                <Grid container spacing={1} direction="row" alignItems="baseline">
                    <Grid item>
                        <Checkbox
                            color={'primary'}
                            checked={task.isComplete}
                            onChange={handleMarkTaskComplete}
                            disabled={isLoading}
                        />
                    </Grid>

                    <Grid item>
                        <Grid container direction={'column'}>
                            {isLoading ? <CircularProgress /> : <Typography variant="body1">{task.content}</Typography>}
                            <Grid item>
                                <Grid container direction={'row'}>
                                    <Grid item hidden={!task.editable}>
                                        <Button color={'primary'} onClick={handleEditPressed} disabled={isLoading}>
                                            {l10n.t('Edit')}
                                        </Button>
                                    </Grid>
                                    <Grid item hidden={!task.deletable}>
                                        <Button color={'primary'} onClick={handleDelete} disabled={isLoading}>
                                            {l10n.t('Delete')}
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Box>
            <Box hidden={!isEditing}>
                <Grid container spacing={1} direction="row" alignItems="flex-start">
                    <Checkbox color={'primary'} disabled />
                    <Grid item xs>
                        <Grid container direction={'column'}>
                            {isLoading ? (
                                <CircularProgress />
                            ) : (
                                <TextField
                                    size="small"
                                    value={taskContent}
                                    onChange={handleTaskContentChange}
                                    name="content"
                                />
                            )}
                            <Grid item>
                                <Grid container direction={'row'}>
                                    <Grid item>
                                        <Button
                                            color={'primary'}
                                            onClick={handleSave}
                                            disabled={taskContent.trim() === '' || isLoading}
                                        >
                                            {l10n.t('Save')}
                                        </Button>
                                    </Grid>
                                    <Grid item>
                                        <Button color={'primary'} onClick={handleCancel} disabled={isLoading}>
                                            {l10n.t('Cancel')}
                                        </Button>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Box>
        </React.Fragment>
    );
};
