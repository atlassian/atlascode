import { Avatar, Grid } from '@mui/material';
import React from 'react';
import { AtlascodeMentionProvider } from 'src/webviews/components/issue/common/AtlaskitEditor/AtlascodeMentionsProvider';
import AtlaskitEditor from 'src/webviews/components/issue/common/AtlaskitEditor/AtlaskitEditor';

import { User } from '../../../bitbucket/model';

type CommentFormProps = {
    currentUser: User;
    initialContent?: string;
    onSave: (content: string) => Promise<void>;
    onCancel?: () => void;
    fetchUsers?: (input: string) => Promise<User[]>;
    handleEditorFocus: (isFocused: boolean) => void;
    mentionsProvider: AtlascodeMentionProvider | undefined;
};

const CommentForm: React.FC<CommentFormProps> = (props: CommentFormProps) => {
    return (
        <Grid container spacing={1} alignItems="flex-start" data-testid="common.comment-form">
            <Grid item>
                <Avatar src={props.currentUser.avatarUrl} />
            </Grid>
            <Grid item xs={10}>
                <Grid container spacing={1} direction="column">
                    <Grid item>
                        <div data-testid="common.atlaskit-editor">
                            <AtlaskitEditor
                                defaultValue={props.initialContent}
                                onSave={props.onSave}
                                onCancel={props.onCancel}
                                mentionProvider={
                                    props.mentionsProvider ? Promise.resolve(props.mentionsProvider) : undefined
                                }
                                isBitbucket={true}
                                onFocus={() => props.handleEditorFocus(true)}
                                onBlur={() => props.handleEditorFocus(false)}
                            />
                        </div>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
};

export default CommentForm;
