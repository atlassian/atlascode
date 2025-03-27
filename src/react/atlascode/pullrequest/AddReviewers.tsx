import { Typography, Tooltip, Button } from '@material-ui/core';
import React, { useCallback, useState } from 'react';
import { BitbucketSite, User } from '../../../bitbucket/model';
import DialogUserPicker from './DialogUserPicker';

type AddReviewersProps = {
    site: BitbucketSite;
    reviewers: User[];
    updateReviewers: (user: User[]) => Promise<void>;
};

export const AddReviewers: React.FunctionComponent<AddReviewersProps> = ({ site, reviewers, updateReviewers }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleUpdateReviewers = useCallback(
        async (newUser: User) => {
            setIsOpen(false);
            const updatedReviewers = [...reviewers, newUser];
            await updateReviewers(updatedReviewers);
        },
        [reviewers, updateReviewers],
    );

    const handleToggleOpen = useCallback(() => {
        setIsOpen(true);
    }, [setIsOpen]);

    const handleToggleClosed = useCallback(() => {
        setIsOpen(false);
    }, [setIsOpen]);

    return (
        <React.Fragment>
            <Tooltip title="Add Reviewers">
                <Button color={'primary'} onClick={handleToggleOpen} value={'Add Reviewers'}>
                    <Typography variant="button">Add Reviewers</Typography>
                </Button>
            </Tooltip>
            <DialogUserPicker
                site={site}
                users={reviewers}
                onChange={handleUpdateReviewers}
                hidden={isOpen}
                onClose={handleToggleClosed}
            />
        </React.Fragment>
    );
};
