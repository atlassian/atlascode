import { Grid } from '@mui/material';
import { makeStyles } from '@mui/styles';
import React from 'react';
import { AtlascodeMentionProvider } from 'src/webviews/components/issue/common/AtlaskitEditor/AtlascodeMentionsProvider';

import { Comment, PullRequestState, User } from '../../../bitbucket/model';
import { NestedComment } from './NestedComment';

type NestedCommentListProps = {
    comments: Comment[];
    currentUser: User;
    fetchUsers: (input: string) => Promise<User[]>;
    onDelete: (comment: Comment) => Promise<void>;
    pullRequestState: PullRequestState;
    mentionsProvider?: AtlascodeMentionProvider;
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
    pullRequestState,
    mentionsProvider,
}) => {
    const classes = useStyles();
    return (
        <Grid container spacing={1} direction="column" justifyContent="center" data-testid="pullrequest.comment-list">
            {comments.map((comment) => (
                <Grid item key={comment.id} className={classes.nestedComment}>
                    <NestedComment
                        comment={comment}
                        currentUser={currentUser}
                        fetchUsers={fetchUsers}
                        onDelete={onDelete}
                        pullRequestState={pullRequestState}
                        mentionsProvider={mentionsProvider}
                    />
                </Grid>
            ))}
        </Grid>
    );
};
