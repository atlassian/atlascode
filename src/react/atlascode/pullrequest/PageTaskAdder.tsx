import AddIcon from '@mui/icons-material/Add';
import { makeStyles } from '@mui/styles';
import React, { useContext } from 'react';
import { PullRequestState } from 'src/bitbucket/model';

import { EditableTextComponent } from './EditableTextComponent';
import { PullRequestDetailsControllerContext } from './pullRequestDetailsController';

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

type PageTaskAdderProps = {
    pullRequestState: PullRequestState;
};

export const PageTaskAdder: React.FC<PageTaskAdderProps> = ({ pullRequestState }) => {
    const classes = useStyles();
    const controller = useContext(PullRequestDetailsControllerContext);

    if (pullRequestState !== 'OPEN') {
        return null;
    }

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
