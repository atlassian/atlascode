import { Alert, AlertTitle, Box, Button } from '@mui/material';
import React from 'react';

interface DraftBannerProps {
    isAuthor: boolean;
    onMarkReady: () => void;
}

export const DraftBanner: React.FC<DraftBannerProps> = ({ isAuthor, onMarkReady }) => {
    return (
        <Alert
            severity="info"
            action={
                isAuthor ? (
                    <Button color="success" size="small" variant="outlined" onClick={onMarkReady}>
                        Mark as ready
                    </Button>
                ) : null
            }
        >
            <AlertTitle>This is a draft pull request</AlertTitle>
            <Box component="span">
                The work is still ongoing. The pull request cannot be merged until it's marked as ready for review.
            </Box>
        </Alert>
    );
};
