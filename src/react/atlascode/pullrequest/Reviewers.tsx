import {
    Avatar,
    Badge,
    Box,
    CircularProgress,
    Grid,
    IconButton,
    Tooltip,
    Typography,
    makeStyles,
} from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CloseIcon from '@material-ui/icons/Close';
import React, { useCallback, useEffect, useState } from 'react';
import { BitbucketSite, Reviewer, User } from '../../../bitbucket/model';
import { AddReviewers } from './AddReviewers';
import RequestedChangesIcon from './RequestedChangesIcon';
import { token } from '@atlaskit/tokens';

const useStyles = makeStyles({
    reviewerContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: 0,
        marginBottom: 8,
        '&:hover .removeButton': {
            opacity: 1,
        },
    },
    reviewerInfo: {
        display: 'flex',
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
    },
    avatarBadge: {
        marginRight: 8,
        borderWidth: 0,
        paddingLeft: 0,
    },
    avatar: {
        width: 24,
        height: 24,
    },
    approvedIcon: {
        fontSize: 14,
        width: 14,
        height: 14,
    },
    name: {
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    removeButton: {
        padding: 4,
        opacity: 0,
        transition: 'opacity 0.2s',
        '&:hover': {
            color: 'var(--vscode-errorForeground)',
        },
    },
});

type ReviewersProps = {
    site: BitbucketSite;
    onUpdateReviewers: (reviewers: User[]) => Promise<void>;
    participants: Reviewer[];
    isLoading: boolean;
};

export const Reviewers: React.FunctionComponent<ReviewersProps> = ({
    site,
    onUpdateReviewers,
    participants,
    isLoading,
}) => {
    const classes = useStyles();
    const [activeParticipants, setActiveParticipants] = useState<Reviewer[]>([]);
    const [isFetchingReviewer, setIsFetchingReviewers] = useState<boolean>(false);

    const handleUpdateReviewers = useCallback(
        async (newReviewers: User[]) => {
            setIsFetchingReviewers(true);
            try {
                await onUpdateReviewers(newReviewers);
            } finally {
                setIsFetchingReviewers(false);
            }
        },
        [onUpdateReviewers],
    );

    const handleRemoveReviewer = useCallback(
        async (reviewerToRemove: Reviewer) => {
            const newReviewers = activeParticipants
                .filter((p) => p.accountId !== reviewerToRemove.accountId)
                .map(({ accountId, displayName, avatarUrl, url, mention }) => ({
                    accountId,
                    displayName,
                    avatarUrl,
                    url,
                    mention,
                }));
            await handleUpdateReviewers(newReviewers);
        },
        [activeParticipants, handleUpdateReviewers],
    );

    useEffect(() => {
        setActiveParticipants(
            participants
                .filter((p) => p.status !== 'UNAPPROVED' || p.role === 'REVIEWER')
                .sort((a, b) => (a.status < b.status ? 0 : 1)),
        );
    }, [participants]);

    if (isLoading || isFetchingReviewer) {
        return <CircularProgress />;
    }

    return (
        <Grid container direction="column" style={{ padding: '0', width: '100%' }}>
            {activeParticipants.length === 0 ? (
                <Typography variant="body2">No reviewers!</Typography>
            ) : (
                activeParticipants.map((participant) => (
                    <div key={participant.accountId} className={classes.reviewerContainer}>
                        <div className={classes.reviewerInfo}>
                            <Badge
                                className={classes.avatarBadge}
                                overlap="circle"
                                anchorOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                invisible={
                                    participant.status !== 'APPROVED' && participant.status !== 'CHANGES_REQUESTED'
                                }
                                badgeContent={
                                    participant.status === 'APPROVED' ? (
                                        <Tooltip title="Approved">
                                            <Box bgcolor={'white'} borderRadius={'100%'}>
                                                <CheckCircleIcon
                                                    className={classes.approvedIcon}
                                                    htmlColor={'var(--ds-icon-success)'}
                                                />
                                            </Box>
                                        </Tooltip>
                                    ) : participant.status === 'CHANGES_REQUESTED' ? (
                                        <Tooltip title="Changes requested">
                                            <Box bgcolor={'white'} borderRadius={'100%'}>
                                                <RequestedChangesIcon
                                                    primaryColor={token('color.icon.warning')}
                                                    label=""
                                                />
                                            </Box>
                                        </Tooltip>
                                    ) : null
                                }
                            >
                                <Avatar
                                    alt={participant.displayName}
                                    src={participant.avatarUrl}
                                    className={classes.avatar}
                                />
                            </Badge>
                            <Typography className={classes.name}>{participant.displayName}</Typography>
                        </div>
                        <Tooltip title="Remove reviewer">
                            <IconButton
                                size="small"
                                onClick={() => handleRemoveReviewer(participant)}
                                className={`removeButton ${classes.removeButton}`}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </div>
                ))
            )}
            <Box mt={1}>
                <AddReviewers site={site} reviewers={activeParticipants} updateReviewers={handleUpdateReviewers} />
            </Box>
        </Grid>
    );
};
