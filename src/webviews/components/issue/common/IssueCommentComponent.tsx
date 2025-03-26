import React from 'react';
import Comment, { CommentAction } from '@atlaskit/comment';
import TextArea from '@atlaskit/textarea';
import { CommentVisibility, Comment as JiraComment, User } from '@atlassianlabs/jira-pi-common-models';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import { Box, Typography } from '@material-ui/core';
import Avatar from '@atlaskit/avatar';
import { CommentAuthor } from '@atlaskit/comment';

type IssueCommentComponentProps = {
    currentUser: User;
    comments: any;
    onSave: (commentBody: string, commentId?: string, restriction?: CommentVisibility) => void;
    onCreate: (commentBody: string, restriction?: CommentVisibility) => void;
};

const CommentComponent: React.FC<{
    comment: JiraComment;
    onSave: (t: string, commentId?: string, restriction?: CommentVisibility) => void;
}> = ({ comment, onSave }) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const bodyText = comment.renderedBody ?? comment.body;
    const [commentText, setCommentText] = React.useState(bodyText);
    return (
        <Comment
            avatar={<Avatar src={comment.author.avatarUrls['24x24']} size={'small'} />}
            author={
                <CommentAuthor>
                    <div className="jira-comment-author">{comment.author.displayName}</div>
                </CommentAuthor>
            }
            content={
                <>
                    <Typography>{bodyText}</Typography>
                    {isEditing && (
                        <>
                            <TextArea
                                isMonospaced
                                onChange={(e) => {
                                    setCommentText(e.target.value);
                                }}
                                isReadOnly={!isEditing}
                                defaultValue={bodyText}
                            />
                            <Box style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <VSCodeButton
                                    appearance="primary"
                                    onClick={() => {
                                        setIsEditing(false);
                                        onSave(commentText);
                                    }}
                                >
                                    Save
                                </VSCodeButton>
                                <VSCodeButton
                                    appearance="secondary"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setCommentText('');
                                    }}
                                >
                                    Cancel
                                </VSCodeButton>
                            </Box>
                        </>
                    )}
                </>
            }
            createdTime={new Date(comment.created).getTime()}
            actions={[<CommentAction>Edit</CommentAction>, <CommentAction>Reply</CommentAction>]}
        />
    );
};

const AddCommentComponent: React.FC<{ user: User; onCreate: (t: string, restriction?: CommentVisibility) => void }> = ({
    user,
    onCreate,
}) => {
    const [commentText, setCommentText] = React.useState('');
    const [isFocused, setIsFocused] = React.useState(false);
    return (
        <Box style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <Box style={{ marginRight: '8px' }}>
                    <Avatar src={user.avatarUrls['24x24']} size={'small'} />
                </Box>
                <TextArea
                    isMonospaced
                    onFocus={() => {
                        setIsFocused(true);
                    }}
                    onBlur={() => {
                        setIsFocused(false);
                    }}
                    onChange={(e) => {
                        setCommentText(e.target.value);
                    }}
                    placeholder="Add a comment..."
                />
            </Box>
            {(isFocused || commentText !== '') && (
                <Box style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <VSCodeButton
                        appearance="primary"
                        onClick={() => {
                            if (commentText !== '') {
                                onCreate(commentText, undefined);
                                setCommentText('');
                            }
                        }}
                    >
                        Add
                    </VSCodeButton>
                    <VSCodeButton
                        appearance="secondary"
                        onClick={() => {
                            setCommentText('');
                        }}
                    >
                        Cancel
                    </VSCodeButton>
                </Box>
            )}
        </Box>
    );
};
export const IssueCommentComponent: React.FC<IssueCommentComponentProps> = ({
    currentUser,
    comments,
    onCreate,
    onSave,
}) => {
    return (
        <Box style={{ display: 'flex', flexDirection: 'column' }}>
            <AddCommentComponent user={currentUser} onCreate={onCreate} />
            {comments.map((comment: JiraComment) => (
                <CommentComponent key={`${comment.id}::${comment.updated}`} comment={comment} onSave={onSave} />
            ))}
        </Box>
    );
};
