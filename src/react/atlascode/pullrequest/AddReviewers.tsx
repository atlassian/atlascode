import { Button, Tooltip, Typography } from '@material-ui/core';
import React, { useCallback, useState } from 'react';
import { BitbucketSite, User } from '../../../bitbucket/model';
import DialogUserPicker from './DialogUserPicker';
import * as l10n from '@vscode/l10n';

type AddReviewersProps = {
    site: BitbucketSite;
    reviewers: User[];
    updateReviewers: (user: User[]) => Promise<void>;
};
export const AddReviewers: React.FunctionComponent<AddReviewersProps> = ({ site, reviewers, updateReviewers }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleUpdateReviewers = useCallback(
        async (newReviewers: User[]) => {
            setIsOpen(false);
            await updateReviewers(newReviewers);
        },
        [updateReviewers],
    );

    const handleToggleOpen = useCallback(() => {
        setIsOpen(true);
    }, [setIsOpen]);

    const handleToggleClosed = useCallback(() => {
        setIsOpen(false);
    }, [setIsOpen]);

    return (
        <React.Fragment>
            <Tooltip title={l10n.t('Add Reviewers')}>
                <Button color={'primary'} onClick={handleToggleOpen} value={l10n.t('Add Reviewers')}>
                    <Typography variant="button">{l10n.t('Add Reviewers')}</Typography>
                </Button>
            </Tooltip>
            <DialogUserPicker
                site={site}
                users={reviewers}
                defaultUsers={[]}
                onChange={handleUpdateReviewers}
                hidden={isOpen}
                onClose={handleToggleClosed}
            />
        </React.Fragment>
    );
};
