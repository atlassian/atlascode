import { Button, Checkbox, CircularProgress, Grid, TextField } from '@material-ui/core';
import React, { useCallback, useState } from 'react';
import * as l10n from '@vscode/l10n';

type TaskAdderProps = {
    addTask: (content: string) => Promise<void>;
    handleCancel: () => void;
};
export const TaskAdder: React.FunctionComponent<TaskAdderProps> = ({ addTask, handleCancel }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [taskContent, setTaskContent] = useState('');

    const handleSave = useCallback(async () => {
        setIsLoading(true);
        try {
            await addTask(taskContent);
        } finally {
            setTaskContent('');
            setIsLoading(false);
        }
    }, [taskContent, addTask]);

    const handleCancelClicked = useCallback(() => {
        handleCancel();
    }, [handleCancel]);

    const handleTaskContentChange = useCallback(
        (event: React.ChangeEvent<{ value: string }>) => {
            setTaskContent(event.target.value);
        },
        [setTaskContent],
    );

    return (
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
                            autoComplete={'off'}
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
                                <Button color={'primary'} onClick={handleCancelClicked} disabled={isLoading}>
                                    {l10n.t('Cancel')}
                                </Button>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
};
