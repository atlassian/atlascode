import { Button, Chip, CircularProgress, Tooltip } from '@mui/material';
import React from 'react';

interface DraftStatusToggleProps {
    isDraft: boolean;
    isAuthor: boolean;
    isLoading: boolean;
    onToggle: (isDraft: boolean) => void;
}

export const DraftStatusToggle: React.FC<DraftStatusToggleProps> = ({ isDraft, isAuthor, isLoading, onToggle }) => {
    if (!isAuthor) {
        // Non authors can only see the status, not change it
        if (isDraft) {
            return (
                <Tooltip title="This pull request is a draft">
                    <Chip label="Draft" size="small" color="warning" variant="outlined" />
                </Tooltip>
            );
        }
        return null;
    }

    const handleClick = () => {
        onToggle(!isDraft);
    };

    if (isDraft) {
        return (
            <Tooltip title="Mark this pull request as ready for review">
                <Button
                    variant="outlined"
                    size="small"
                    color="warning"
                    onClick={handleClick}
                    disabled={isLoading}
                    startIcon={isLoading ? <CircularProgress size={16} /> : null}
                >
                    Draft - Mark Ready
                </Button>
            </Tooltip>
        );
    }

    return (
        <Tooltip title="Convert this pull request to a draft">
            <Button
                variant="text"
                size="small"
                color="inherit"
                onClick={handleClick}
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={16} /> : null}
            >
                Convert to Draft
            </Button>
        </Tooltip>
    );
};
