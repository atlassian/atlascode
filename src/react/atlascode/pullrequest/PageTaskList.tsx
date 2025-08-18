import { Grid } from '@mui/material';
import React from 'react';

import { Task } from '../../../bitbucket/model';
import { CommentTask } from './CommentTask';
import { PageTaskAdder } from './PageTaskAdder';

type PageTaskListProps = {
    tasks: Task[];
    onEdit: (task: Task) => Promise<void>;
    onDelete: (task: Task) => Promise<void>;
};

export const PageTaskList: React.FunctionComponent<PageTaskListProps> = ({ tasks, onEdit, onDelete }) => {
    return (
        <Grid container spacing={1} direction="column">
            {tasks.map((task) => (
                <Grid key={task.id} item>
                    <CommentTask task={task} onEdit={onEdit} onDelete={onDelete} />
                </Grid>
            ))}
            <Grid item>
                <PageTaskAdder />
            </Grid>
        </Grid>
    );
};
