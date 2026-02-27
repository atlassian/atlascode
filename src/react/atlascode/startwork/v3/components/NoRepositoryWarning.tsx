import CloseIcon from '@mui/icons-material/Close';
import { Alert, AlertTitle, Box, IconButton } from '@mui/material';
import React, { useCallback, useState } from 'react';

export const NoRepositoryWarning: React.FC = () => {
    const [dismissed, setDismissed] = useState(false);

    const handleDismiss = useCallback(() => {
        setDismissed(true);
    }, []);

    return (
        !dismissed && (
            <Box marginBottom={2}>
                <Alert
                    severity="warning"
                    action={
                        <IconButton aria-label="close" color="inherit" size="small" onClick={handleDismiss}>
                            <CloseIcon fontSize="inherit" />
                        </IconButton>
                    }
                >
                    <AlertTitle>No repository available</AlertTitle>
                    Please open a folder containing a Git repository.
                </Alert>
            </Box>
        )
    );
};
