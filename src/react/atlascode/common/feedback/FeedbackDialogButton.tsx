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
} from '@material-ui/core';
import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CommonAction, CommonActionType } from '../../../../lib/ipc/fromUI/common';
import { FeedbackData, FeedbackType, FeedbackUser } from '../../../../lib/ipc/models/common';
import { PostMessageFunc } from '../../messagingApi';
import * as l10n from '@vscode/l10n';

type FeedbackDialogButtonProps = {
    user: FeedbackUser;
    postMessageFunc: PostMessageFunc<CommonAction>;
};

export const FeedbackDialogButton: React.FunctionComponent<FeedbackDialogButtonProps> = ({ user, postMessageFunc }) => {
    const [formOpen, setFormOpen] = useState(false);

    const { register, handleSubmit, errors, watch, formState, reset } = useForm<FeedbackData>({
        mode: 'onChange',
    });

    const watches = watch(['canBeContacted']);

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
                {l10n.t('Send Feedback')}
            </Button>

            <Dialog fullWidth maxWidth="md" open={formOpen} onClose={handleDialogClose}>
                <DialogContent>
                    <DialogContentText>{l10n.t('Send Feedback')}</DialogContentText>
                    <Grid container direction="column" spacing={2}>
                        <Grid item>
                            <TextField
                                name="type"
                                defaultValue={FeedbackType.Question}
                                select
                                required
                                autoFocus
                                autoComplete="off"
                                margin="dense"
                                id="type"
                                label={l10n.t('Type of Feedback')}
                                helperText={errors.type ? errors.type.message : undefined}
                                fullWidth
                                error={!!errors.type}
                                inputRef={register}
                            >
                                <MenuItem key={FeedbackType.Question} value={FeedbackType.Question}>
                                    {l10n.t('Ask a question')}
                                </MenuItem>
                                <MenuItem key={FeedbackType.Comment} value={FeedbackType.Comment}>
                                    {l10n.t('Leave a comment')}
                                </MenuItem>
                                <MenuItem key={FeedbackType.Bug} value={FeedbackType.Bug}>
                                    {l10n.t('Report a bug')}
                                </MenuItem>
                                <MenuItem key={FeedbackType.Suggestion} value={FeedbackType.Suggestion}>
                                    {l10n.t('Suggest an improvement')}
                                </MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item>
                            <TextField
                                required
                                multiline
                                rows={3}
                                id="description"
                                name="description"
                                label={l10n.t('Description')}
                                helperText={errors.description ? errors.description.message : undefined}
                                fullWidth
                                error={!!errors.description}
                                inputRef={register({
                                    required: l10n.t('Description URL is required'),
                                })}
                            />
                        </Grid>
                        <Grid item>
                            <TextField
                                name="userName"
                                defaultValue={user.userName}
                                required
                                autoComplete="off"
                                margin="dense"
                                id="userName"
                                label={l10n.t('Your name')}
                                helperText={errors.userName ? errors.userName.message : undefined}
                                fullWidth
                                error={!!errors.userName}
                                inputRef={register({
                                    required: l10n.t('Your name is required'),
                                })}
                            />
                        </Grid>
                        <Grid item>
                            <ToggleWithLabel
                                control={
                                    <Switch
                                        name="canBeContacted"
                                        defaultChecked={true}
                                        size="small"
                                        color="primary"
                                        id="canBeContacted"
                                        value="canBeContacted"
                                        inputRef={register}
                                    />
                                }
                                label={l10n.t('Atlassian can contact me about this feedback')}
                                variant="body1"
                                spacing={1}
                            />
                        </Grid>
                        <Grid item>
                            {watches.canBeContacted && (
                                <TextField
                                    required
                                    name="emailAddress"
                                    defaultValue={user.emailAddress}
                                    autoComplete="off"
                                    margin="dense"
                                    id="emailAddress"
                                    label={l10n.t('Your contact email')}
                                    helperText={errors.emailAddress ? errors.emailAddress.message : undefined}
                                    fullWidth
                                    error={!!errors.emailAddress}
                                    inputRef={register({
                                        required: l10n.t('Your contact email is required'),
                                    })}
                                />
                            )}
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button
                        disabled={!formState.isValid}
                        onClick={handleSubmit(submitForm)}
                        variant="contained"
                        color="primary"
                    >
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
