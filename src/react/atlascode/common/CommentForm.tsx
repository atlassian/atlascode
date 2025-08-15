import { Avatar, Grid } from '@mui/material';
import React from 'react';

import { User } from '../../../bitbucket/model';
import { MarkdownEditor } from './editor/MarkdownEditor';

type CommentFormProps = {
    currentUser: User;
    initialContent?: string;
    onSave: (content: string) => Promise<void>;
    onCancel?: () => void;
    fetchUsers?: (input: string) => Promise<User[]>;
};

const CommentForm: React.FC<CommentFormProps> = (props: CommentFormProps) => {
    return (
        <Grid container spacing={1} alignItems="flex-start">
            <Grid item>
                <Avatar src={props.currentUser.avatarUrl} />
            </Grid>
            <Grid item xs={10}>
                <Grid container spacing={1} direction="column">
                    <Grid item>
                        <MarkdownEditor
                            initialContent={props.initialContent}
                            onSave={props.onSave}
                            onCancel={props.onCancel}
                            fetchUsers={props.fetchUsers}
                        />
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
};

export default CommentForm;
