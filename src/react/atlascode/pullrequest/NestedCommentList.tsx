import { Grid } from '@mui/material';
import { makeStyles } from '@mui/styles';
import React from 'react';

import { Comment, User } from '../../../bitbucket/model';
import { NestedComment } from './NestedComment';

type NestedCommentListProps = {
    comments: Comment[];
    currentUser: User;
    fetchUsers: (input: string) => Promise<User[]>;
    onDelete: (comment: Comment) => Promise<void>;
};

const useStyles = makeStyles({
    nestedComment: {
        marginTop: 16,
    },
});

export const NestedCommentList: React.FunctionComponent<NestedCommentListProps> = ({
    comments,
    currentUser,
    fetchUsers,
    onDelete,
}) => {
    const classes = useStyles();
    return (
        <Grid container spacing={1} direction="column" justifyContent="center">
            {comments.map((comment) => (
                <Grid item key={comment.id} className={classes.nestedComment}>
                    <NestedComment
                        comment={comment}
                        currentUser={currentUser}
                        fetchUsers={fetchUsers}
                        onDelete={onDelete}
                    />
                </Grid>
            ))}
        </Grid>
    );
};
