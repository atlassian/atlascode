import { ToggleWithLabel } from '@atlassianlabs/guipi-core-components';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    Grid,
    MenuItem,
    Switch,
    TextField,
} from '@mui/material';
import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';

import { CommonAction, CommonActionType } from '../../../../lib/ipc/fromUI/common';
import { FeedbackData, FeedbackType, FeedbackUser } from '../../../../lib/ipc/models/common';
import { PostMessageFunc } from '../../messagingApi';
type FeedbackDialogButtonProps = {
    user: FeedbackUser;
    postMessageFunc: PostMessageFunc<CommonAction>;
};

export const FeedbackDialogButton: React.FunctionComponent<FeedbackDialogButtonProps> = ({ user, postMessageFunc }) => {
    const [formOpen, setFormOpen] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isValid },
        watch,
        reset,
    } = useForm<FeedbackData>({
        mode: 'onChange',
    });

    const canBeContacted = watch('canBeContacted');

    const submitForm = useCallback(
        (data: FeedbackData) => {
            if (!data.canBeContacted) {
                data.emailAddress = 'do-not-reply@atlassian.com';
            }
            postMessageFunc({ type: CommonActionType.SubmitFeedback, feedback: data });
            setFormOpen(false);
            reset();
        },
        [postMessageFunc, reset],
    );

    const handleDialogClose = useCallback(() => {
        setFormOpen(false);
        reset();
    }, [reset]);

    const handleOpenDialog = useCallback(() => {
        setFormOpen(true);
    }, []);

    return (
        <>
            <Button variant="contained" color="primary" onClick={handleOpenDialog}>
                Send Feedback
            </Button>

            <Dialog fullWidth maxWidth="md" open={formOpen} onClose={handleDialogClose}>
                <DialogContent>
                    <DialogContentText>Send Feedback</DialogContentText>
                    <Grid container direction="column" spacing={2}>
                        <Grid item>
                            <TextField
                                {...register('type')}
                                defaultValue={FeedbackType.Question}
                                select
                                required
                                autoFocus
                                autoComplete="off"
                                size="small"
                                id="type"
                                label="Type of Feedback"
                                helperText={errors.type ? errors.type.message : undefined}
                                fullWidth
                                error={!!errors.type}
                            >
                                <MenuItem key={FeedbackType.Question} value={FeedbackType.Question}>
                                    Ask a question
                                </MenuItem>
                                <MenuItem key={FeedbackType.Comment} value={FeedbackType.Comment}>
                                    Leave a comment
                                </MenuItem>
                                <MenuItem key={FeedbackType.Bug} value={FeedbackType.Bug}>
                                    Report a bug
                                </MenuItem>
                                <MenuItem key={FeedbackType.Suggestion} value={FeedbackType.Suggestion}>
                                    Suggest an improvement
                                </MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item>
                            <TextField
                                {...register('description', {
                                    required: 'Description is required',
                                })}
                                required
                                multiline
                                rows={3}
                                id="description"
                                name="description"
                                label="Description"
                                helperText={errors.description ? errors.description.message : undefined}
                                fullWidth
                                error={!!errors.description}
                            />
                        </Grid>
                        <Grid item>
                            <TextField
                                {...register('userName', {
                                    required: 'Your name is required',
                                })}
                                defaultValue={user.userName}
                                required
                                autoComplete="off"
                                size="small"
                                id="userName"
                                label="Your name"
                                helperText={errors.userName ? errors.userName.message : undefined}
                                fullWidth
                                error={!!errors.userName}
                            />
                        </Grid>
                        <Grid item>
                            <ToggleWithLabel
                                control={
                                    <Switch
                                        {...register('canBeContacted')}
                                        defaultChecked={true}
                                        size="small"
                                        color="primary"
                                        id="canBeContacted"
                                    />
                                }
                                label="Atlassian can contact me about this feedback"
                                variant="body1"
                                spacing={1}
                            />
                        </Grid>
                        <Grid item>
                            {canBeContacted && (
                                <TextField
                                    {...register('emailAddress', {
                                        required: 'Your contact email is required',
                                    })}
                                    required
                                    defaultValue={user.emailAddress}
                                    autoComplete="off"
                                    size="small"
                                    id="emailAddress"
                                    label="Your contact email"
                                    helperText={errors.emailAddress ? errors.emailAddress.message : undefined}
                                    fullWidth
                                    error={!!errors.emailAddress}
                                />
                            )}
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button disabled={!isValid} onClick={handleSubmit(submitForm)} variant="contained" color="primary">
                        Submit
                    </Button>
                    <Button onClick={handleDialogClose} color="primary">
                        Cancel
                    </Button>
                </DialogActions>
                <Box marginBottom={2} />
            </Dialog>
        </>
    );
};
