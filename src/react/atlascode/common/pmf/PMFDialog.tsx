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
} from '@mui/material';
import React, { useCallback } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { PMFData, PMFLevel } from '../../../../lib/ipc/models/common';

export type PMFDialogProps = {
    open: boolean;
    onCancel: () => void;
    onSave: (pmfData: PMFData) => void;
};

export const PMFDialog: React.FunctionComponent<PMFDialogProps> = ({ open, onCancel, onSave }) => {
    const {
        register,
        handleSubmit,
        formState: { errors, isValid },
        trigger,
        control,
        reset,
    } = useForm<PMFData>({
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
        trigger('level');
    }, [trigger]);

    // BUG: TextFields scroll when not focused. see: https://github.com/mui-org/material-ui/issues/20170
    return (
        <Dialog fullWidth maxWidth="md" open={open} onClose={onCancel}>
            <DialogTitle>
                <Typography variant="h4">Tell us about your experience</Typography>
            </DialogTitle>
            <DialogContent>
                <Grid container direction="column" spacing={2}>
                    <Grid item>
                        <Controller
                            name="level"
                            control={control}
                            rules={{ required: 'Level is required' }}
                            render={({ field }) => (
                                <FormControl component="fieldset" onBlur={handleLevelBlur}>
                                    <FormLabel component="legend" required error={errors.level !== undefined}>
                                        How disappointed would you feel if you could no longer use Atlassian for VS Code
                                        extension?
                                    </FormLabel>
                                    <RadioGroup aria-label="level" {...field}>
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
                            )}
                        />
                    </Grid>
                    <Grid item>
                        <TextField
                            {...register('improvements')}
                            multiline
                            rows={3}
                            variant="outlined"
                            autoComplete="off"
                            size="small"
                            id="improvements"
                            name="improvements"
                            label="How can we improve this extension for you?"
                            fullWidth
                        />
                    </Grid>
                    <Grid item>
                        <TextField
                            {...register('alternative')}
                            multiline
                            rows={3}
                            variant="outlined"
                            autoComplete="off"
                            size="small"
                            id="alternative"
                            name="alternative"
                            label="What would you use as an alternative if this extension were no longer available?"
                            fullWidth
                        />
                    </Grid>
                    <Grid item>
                        <TextField
                            {...register('benefits')}
                            multiline
                            rows={3}
                            variant="outlined"
                            autoComplete="off"
                            size="small"
                            id="benefits"
                            name="benefits"
                            label="What are the main benefits you receive from this extension?"
                            fullWidth
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button disabled={!isValid} onClick={handleSubmit(handleSave)} variant="contained" color="primary">
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
