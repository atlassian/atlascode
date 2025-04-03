import { makeStyles } from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import React, { useContext } from 'react';
import { PullRequestDetailsControllerContext } from './pullRequestDetailsController';
import { EditableTextComponent } from './EditableTextComponent';

const useStyles = makeStyles({
    container: {
        display: 'flex',
        alignItems: 'flex-start',
    },
    addIcon: {
        padding: 0,
        marginRight: 8,
        marginTop: 3,
        fontSize: 20,
        color: 'var(--vscode-editor-foreground)',
        opacity: 0.8,
        marginLeft: 4,
    },
    taskInput: {
        '&:empty:before': {
            content: '"Create task"',
            color: 'var(--vscode-input-placeholderForeground)',
            fontStyle: 'italic',
        },
    },
});

export const PageTaskAdder: React.FC = () => {
    const classes = useStyles();
    const controller = useContext(PullRequestDetailsControllerContext);

    return (
        <div className={classes.container}>
            <AddIcon className={classes.addIcon} />
            <EditableTextComponent
                onSave={controller.addTask}
                className={classes.taskInput}
                placeholder="Create task"
            />
        </div>
    );
};
