import { Box, Button, Typography } from '@material-ui/core';
import React, { useCallback } from 'react';

import { ApprovalStatus } from '../../../bitbucket/model';
import StoppedIcon from '../icons/StoppedIcon';
type RequestChangesButtonProps = {
    hidden?: boolean;
    status: ApprovalStatus;
    onApprove: (status: ApprovalStatus) => void;
};
export const RequestChangesButton: React.FunctionComponent<RequestChangesButtonProps> = ({
    hidden,
    status,
    onApprove,
}) => {
    const handleOnApprove = useCallback(() => {
        onApprove(status === 'CHANGES_REQUESTED' ? 'NO_CHANGES_REQUESTED' : 'CHANGES_REQUESTED');
    }, [onApprove, status]);
    return (
        <Box hidden={hidden}>
            <Button
                startIcon={<StoppedIcon htmlColor={'#FFAB00'} />}
                color={'primary'}
                variant={'contained'}
                onClick={handleOnApprove}
            >
                <Typography variant={'button'} noWrap>
                    {status === 'CHANGES_REQUESTED' ? 'Changes Requested' : 'Request Changes'}
                </Typography>
            </Button>
        </Box>
    );
};
