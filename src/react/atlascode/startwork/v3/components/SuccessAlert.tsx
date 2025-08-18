import { Alert, AlertTitle, List, ListItem, Typography } from '@mui/material';
import React from 'react';

interface SuccessAlertProps {
    submitResponse: {
        transistionStatus?: string;
        branch?: string;
        upstream?: string;
    };
}

export const SuccessAlert: React.FC<SuccessAlertProps> = ({ submitResponse }) => {
    return (
        <Alert variant="standard" severity="success" style={{ marginBottom: 16 }}>
            <AlertTitle>Success!</AlertTitle>
            <List dense>
                <ListItem disableGutters>
                    <Typography>- Assigned the issue to you</Typography>
                </ListItem>
                {submitResponse.transistionStatus && (
                    <ListItem disableGutters>
                        <Typography>
                            - Transitioned status to <strong>{submitResponse.transistionStatus}</strong>
                        </Typography>
                    </ListItem>
                )}
                {submitResponse.branch && (
                    <ListItem disableGutters>
                        <Typography>
                            - Switched to <strong>{submitResponse.branch}</strong> branch with upstream set to{' '}
                            <strong>
                                {submitResponse.upstream}/{submitResponse.branch}
                            </strong>
                        </Typography>
                    </ListItem>
                )}
            </List>
        </Alert>
    );
};
