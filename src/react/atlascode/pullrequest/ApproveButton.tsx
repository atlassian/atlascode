import React, { useCallback } from 'react';
import { ApprovalStatus } from '../../../bitbucket/model';
import CheckCircleIcon from '@atlaskit/icon/glyph/check-circle';
import { ReviewerActionButton } from './ReviewActionButton';
import { token } from '@atlaskit/tokens';

type ApproveButtonProps = {
    status: ApprovalStatus;
    onApprove: (status: ApprovalStatus) => void;
    isDisabled: boolean;
};

export const ApproveButton: React.FunctionComponent<ApproveButtonProps> = ({ status, onApprove, isDisabled }) => {
    const handleOnApprove = useCallback(() => {
        onApprove(status === 'APPROVED' ? 'UNAPPROVED' : 'APPROVED');
    }, [onApprove, status]);

    return (
        <ReviewerActionButton
            mainIcon={
                <CheckCircleIcon
                    primaryColor={status === 'APPROVED' ? token('color.icon.success') : 'default'}
                    label=""
                    size="small"
                />
            }
            label={status === 'APPROVED' ? 'Approved' : 'Approve'}
            isSelected={status === 'APPROVED'}
            onClick={handleOnApprove}
            isLoading={false}
            isDisabled={isDisabled}
            isError={false}
        />
    );
};
