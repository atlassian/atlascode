import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import { AvatarGroup } from '@mui/lab';
import { Avatar, Badge, Box, CircularProgress, Grid, IconButton, Tooltip, Typography } from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';

import { BitbucketSite, Reviewer, User } from '../../../bitbucket/model';
import StoppedIcon from '../icons/StoppedIcon';
import { AddReviewers } from './AddReviewers';

type RemovableReviewerAvatarProps = {
    participant: Reviewer;
    onRemove?: (participant: Reviewer) => void;
    showRemoveButton?: boolean;
};

const RemovableReviewerAvatar: React.FunctionComponent<RemovableReviewerAvatarProps> = ({
    participant,
    onRemove,
    showRemoveButton = false,
}) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Box position="relative" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <Badge
                style={{ borderWidth: '0px' }}
                overlap="circular"
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                invisible={participant.status === 'UNAPPROVED'}
                badgeContent={
                    participant.status === 'CHANGES_REQUESTED' ? (
                        <Tooltip title="Requested changes">
                            <Box bgcolor={'white'} borderRadius={'100%'}>
                                <StoppedIcon fontSize={'small'} htmlColor={'#FFAB00'} />
                            </Box>
                        </Tooltip>
                    ) : (
                        <Tooltip title="Approved">
                            <Box bgcolor={'white'} borderRadius={'100%'}>
                                <CheckCircleIcon fontSize={'small'} htmlColor={'#07b82b'} />
                            </Box>
                        </Tooltip>
                    )
                }
            >
                <Tooltip title={participant.displayName}>
                    <Avatar alt={participant.displayName} src={participant.avatarUrl} />
                </Tooltip>
            </Badge>
            {showRemoveButton && isHovered && onRemove && (
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(participant);
                    }}
                    style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        backgroundColor: 'var(--vscode-button-background)',
                        color: 'var(--vscode-button-foreground)',
                        padding: 2,
                        width: 20,
                        height: 20,
                        zIndex: 1,
                    }}
                    title={`Remove ${participant.displayName}`}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            )}
        </Box>
    );
};

type ReviewersProps = {
    site: BitbucketSite;
    onUpdateReviewers: (reviewers: User[]) => Promise<void>;
    participants: Reviewer[];
    isLoading: boolean;
    allowRemoveReviewers?: boolean;
};

export const Reviewers: React.FunctionComponent<ReviewersProps> = ({
    site,
    onUpdateReviewers,
    participants,
    isLoading,
    allowRemoveReviewers = true,
}) => {
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
            if (!allowRemoveReviewers) {
                return;
            }

            const updatedReviewers = participants
                .filter((p) => p.accountId !== reviewerToRemove.accountId)
                .map((p) => ({
                    accountId: p.accountId,
                    displayName: p.displayName,
                    avatarUrl: p.avatarUrl,
                    url: p.url,
                    mention: p.mention,
                    userName: p.userName,
                    emailAddress: p.emailAddress,
                }));

            await handleUpdateReviewers(updatedReviewers);
        },
        [participants, allowRemoveReviewers, handleUpdateReviewers],
    );

    useEffect(() => {
        setActiveParticipants(
            participants // always show reviewers & show non-reviewers if they have approved or marked needs work
                .filter((p) => p.status !== 'UNAPPROVED' || p.role === 'REVIEWER')
                .sort((a, b) => (a.status < b.status ? 0 : 1)),
        );
    }, [participants]);

    return (
        <Grid container direction="row" spacing={2} alignItems={'center'}>
            {isLoading || isFetchingReviewer ? (
                <Grid item>
                    <CircularProgress />
                </Grid>
            ) : (
                <Grid item>
                    {activeParticipants.length === 0 ? (
                        <Typography variant="body2">No reviewers!</Typography>
                    ) : (
                        <AvatarGroup max={5}>
                            {activeParticipants.map((participant) => (
                                <RemovableReviewerAvatar
                                    key={participant.accountId}
                                    participant={participant}
                                    onRemove={allowRemoveReviewers ? handleRemoveReviewer : undefined}
                                    showRemoveButton={allowRemoveReviewers && participant.role === 'REVIEWER'}
                                />
                            ))}
                        </AvatarGroup>
                    )}
                </Grid>
            )}
            <Grid style={{ width: '100%' }} item>
                <AddReviewers site={site} reviewers={activeParticipants} updateReviewers={handleUpdateReviewers} />
            </Grid>
        </Grid>
    );
};
