import CloseIcon from '@mui/icons-material/Close';
import { Alert, AlertTitle, IconButton, Snackbar } from '@mui/material';
import React, { useCallback } from 'react';

interface SnackbarNotificationProps {
    open: boolean;
    onClose: () => void;
    message: string;
    title?: string;
    severity?: 'success' | 'error' | 'warning' | 'info';
    autoHideDuration?: number;
}

export const SnackbarNotification: React.FC<SnackbarNotificationProps> = ({
    open,
    onClose,
    message,
    title,
    severity = 'success',
    autoHideDuration = 6000,
}) => {
    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    return (
        <Snackbar
            open={open}
            onClose={handleClose}
            autoHideDuration={autoHideDuration}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
            <Alert
                variant="standard"
                severity={severity}
                action={
                    <IconButton aria-label="close" color="inherit" size="small" onClick={handleClose}>
                        <CloseIcon fontSize="inherit" />
                    </IconButton>
                }
            >
                {title && <AlertTitle>{title}</AlertTitle>}
                <p>{message}</p>
            </Alert>
        </Snackbar>
    );
};
