import React, { useCallback } from 'react';
import { ApprovalStatus } from '../../../bitbucket/model';
import { ReviewerActionButton } from './ReviewActionButton';
import RequestedChangesIcon from './RequestedChangesIcon';
import { token } from '@atlaskit/tokens';

type RequestChangesButtonProps = {
    status: ApprovalStatus;
    onApprove: (status: ApprovalStatus) => void;
    isDisabled: boolean;
};
export const RequestChangesButton: React.FunctionComponent<RequestChangesButtonProps> = ({
    status,
    onApprove,
    isDisabled,
}) => {
    const handleOnApprove = useCallback(() => {
        onApprove(status === 'CHANGES_REQUESTED' ? 'NO_CHANGES_REQUESTED' : 'CHANGES_REQUESTED');
    }, [onApprove, status]);
    return (
        <ReviewerActionButton
            mainIcon={
                <RequestedChangesIcon
                    primaryColor={status === 'CHANGES_REQUESTED' ? token('color.icon.warning') : 'default'}
                    label=""
                />
            }
            label={status === 'CHANGES_REQUESTED' ? 'Changes Requested' : 'Request Changes'}
            isSelected={status === 'CHANGES_REQUESTED'}
            onClick={handleOnApprove}
            isLoading={false}
            isDisabled={isDisabled}
            isError={false}
        />
    );
};
