import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    FormHelperText,
    FormLabel,
    Grid,
    Radio,
    RadioGroup,
    TextField,
    Typography,
} from '@material-ui/core';
import React, { useCallback } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { PMFData, PMFLevel } from '../../../../lib/ipc/models/common';
import * as l10n from '@vscode/l10n';

export type PMFDialogProps = {
    open: boolean;
    onCancel: () => void;
    onSave: (pmfData: PMFData) => void;
};

export const PMFDialog: React.FunctionComponent<PMFDialogProps> = ({ open, onCancel, onSave }) => {
    const { register, handleSubmit, errors, formState, triggerValidation, control, reset } = useForm<PMFData>({
        mode: 'onChange',
    });

    const handleSave = useCallback(
        (data: PMFData) => {
            onSave(data);
        },
        [onSave],
    );

    const handleDialogClose = useCallback(() => {
        reset();
        onCancel();
    }, [onCancel, reset]);

    const handleLevelBlur = useCallback(() => {
        triggerValidation('level');
    }, [triggerValidation]);

    // BUG: TextFields scroll when not focused. see: https://github.com/mui-org/material-ui/issues/20170
    return (
        <Dialog fullWidth maxWidth="md" open={open} onClose={onCancel}>
            <DialogTitle>
                <Typography variant="h4">{l10n.t('How Are We Doing?')}</Typography>
            </DialogTitle>
            <DialogContent>
                <Grid container direction="column" spacing={2}>
                    <Grid item>
                        <Controller
                            as={
                                <FormControl component="fieldset" onBlur={handleLevelBlur}>
                                    <FormLabel component="legend" required error={errors.level !== undefined}>
                                        {l10n.t('How would you feel if you could no longer use this extension?')}
                                    </FormLabel>
                                    <RadioGroup aria-label="level" name="level">
                                        <FormControlLabel
                                            value={PMFLevel.VERY}
                                            control={<Radio autoFocus color="primary" />}
                                            label={PMFLevel.VERY}
                                        />
                                        <FormControlLabel
                                            value={PMFLevel.SOMEWHAT}
                                            control={<Radio color="primary" />}
                                            label={PMFLevel.SOMEWHAT}
                                        />
                                        <FormControlLabel
                                            value={PMFLevel.NOT}
                                            control={<Radio color="primary" />}
                                            label={PMFLevel.NOT}
                                        />
                                    </RadioGroup>
                                    <FormHelperText error={errors.level !== undefined}>
                                        {errors.level ? errors.level.message : ''}
                                    </FormHelperText>
                                </FormControl>
                            }
                            rules={{ required: l10n.t('Level is required') }}
                            name="level"
                            control={control}
                        />
                    </Grid>
                    <Grid item>
                        <TextField
                            multiline
                            rows={3}
                            variant="outlined"
                            autoComplete="off"
                            margin="dense"
                            id="improvements"
                            name="improvements"
                            label={l10n.t('How can we improve this extension for you?')}
                            fullWidth
                            inputRef={register}
                        />
                    </Grid>
                    <Grid item>
                        <TextField
                            multiline
                            rows={3}
                            variant="outlined"
                            autoComplete="off"
                            margin="dense"
                            id="alternative"
                            name="alternative"
                            label={l10n.t(
                                'What would you use as an alternative if this extension were no longer available?',
                            )}
                            fullWidth
                            inputRef={register}
                        />
                    </Grid>
                    <Grid item>
                        <TextField
                            multiline
                            rows={3}
                            variant="outlined"
                            autoComplete="off"
                            margin="dense"
                            id="benefits"
                            name="benefits"
                            label={l10n.t('What are the main benefits you receive from this extension?')}
                            fullWidth
                            inputRef={register}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button
                    disabled={!formState.isValid}
                    onClick={handleSubmit(handleSave)}
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
    );
};
