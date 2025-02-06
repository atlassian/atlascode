import { Box, Button, Typography } from '@material-ui/core';
import BuildIcon from '@material-ui/icons/Build';
import React, { useCallback } from 'react';
import { ApprovalStatus } from '../../../bitbucket/model';
import * as l10n from '@vscode/l10n';

type NeedsWorkButtonProps = {
    hidden?: boolean;
    status: ApprovalStatus;
    onApprove: (status: ApprovalStatus) => void;
};

export const NeedsWorkButton: React.FunctionComponent<NeedsWorkButtonProps> = ({ hidden, status, onApprove }) => {
    const handleOnApprove = useCallback(() => {
        onApprove(status === 'NEEDS_WORK' ? 'UNAPPROVED' : 'NEEDS_WORK');
    }, [onApprove, status]);

    return (
        <Box hidden={hidden}>
            <Button startIcon={<BuildIcon />} color={'primary'} variant={'contained'} onClick={handleOnApprove}>
                <Typography variant={'button'} noWrap>
                    {status === 'NEEDS_WORK' ? l10n.t('Remove Needs work') : l10n.t('Mark as Needs work')}
                </Typography>
            </Button>
        </Box>
    );
};
