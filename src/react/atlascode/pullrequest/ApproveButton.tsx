import { Box, Button, Typography } from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import React, { useCallback } from 'react';
import { ApprovalStatus } from '../../../bitbucket/model';
import * as l10n from '@vscode/l10n';

type ApproveButtonProps = {
    hidden?: boolean;
    status: ApprovalStatus;
    onApprove: (status: ApprovalStatus) => void;
};

export const ApproveButton: React.FunctionComponent<ApproveButtonProps> = ({ hidden, status, onApprove }) => {
    const handleOnApprove = useCallback(() => {
        onApprove(status === 'APPROVED' ? 'UNAPPROVED' : 'APPROVED');
    }, [onApprove, status]);

    return (
        <Box hidden={hidden}>
            <Button startIcon={<CheckCircleIcon />} color={'primary'} variant={'contained'} onClick={handleOnApprove}>
                <Typography variant={'button'} noWrap>
                    {status === 'APPROVED' ? l10n.t('Unapprove') : l10n.t('Approve')}
                </Typography>
            </Button>
        </Box>
    );
};
