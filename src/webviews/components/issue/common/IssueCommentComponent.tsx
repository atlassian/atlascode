import React from 'react';
import Comment, { CommentAction } from '@atlaskit/comment';
import TextArea from '@atlaskit/textarea';
import TextField from '@atlaskit/textfield';
import { CommentVisibility, Comment as JiraComment, User } from '@atlassianlabs/jira-pi-common-models';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import { Box } from '@material-ui/core';
import Avatar from '@atlaskit/avatar';
import { CommentAuthor } from '@atlaskit/comment';
import { RenderedContent } from '../../RenderedContent';
import { CommentTime } from '@atlaskit/comment';
import { formatDistanceToNow, parseISO } from 'date-fns';

type IssueCommentComponentProps = {
    currentUser: User;
    comments: JiraComment[];
    onSave: (commentBody: string, commentId?: string, restriction?: CommentVisibility) => void;
    onCreate: (commentBody: string, restriction?: CommentVisibility) => void;
};
const baseActions: JSX.Element[] = [<CommentAction>Edit</CommentAction>, <CommentAction>Reply</CommentAction>];
const CommentComponent: React.FC<{
    user: User;
    comment: JiraComment;
    onSave: (t: string, commentId?: string, restriction?: CommentVisibility) => void;
}> = ({ user, comment, onSave }) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const bodyText = comment.renderedBody ? comment.renderedBody : comment.body;
    const [commentText, setCommentText] = React.useState(bodyText);
    const actions =
        comment.author.accountId === user.accountId
            ? [...baseActions, <CommentAction>Delete</CommentAction>]
            : baseActions;
    return (
        <Comment
            avatar={<Avatar src={comment.author.avatarUrls['48x48']} size={'small'} />}
            author={
                <CommentAuthor>
                    <div className="jira-comment-author">{comment.author.displayName}</div>
                </CommentAuthor>
            }
            content={
                <>
                    <RenderedContent html={bodyText} />
                    {isEditing && (
                        <>
                            <TextArea
                                isMonospaced
                                onChange={(e) => {
                                    setCommentText(e.target.value);
                                }}
                                defaultValue={bodyText}
                            />
                            <Box style={{ display: 'flex', justifyContent: 'space-between' }}>
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
            time={<CommentTime>{`${formatDistanceToNow(parseISO(comment.created))} ago`}</CommentTime>}
            actions={actions}
        />
    );
};

const AddCommentComponent: React.FC<{ user: User; onCreate: (t: string, restriction?: CommentVisibility) => void }> = ({
    user,
    onCreate,
}) => {
    const [commentText, setCommentText] = React.useState('');
    const [isEditing, setIsEditing] = React.useState(false);
    return (
        <Box style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <Box style={{ display: 'flex', flexDirection: 'row', alignItems: isEditing ? 'start' : 'center' }}>
                <Box style={{ marginRight: '8px', marginTop: isEditing ? '4px' : '0px' }}>
                    <Avatar src={user.avatarUrls['48x48']} size={'small'} />
                </Box>
                {!isEditing ? (
                    <TextField
                        value={commentText}
                        onClick={() => {
                            setIsEditing(true);
                        }}
                        placeholder="Add a comment..."
                    />
                ) : (
                    <Box style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <TextArea
                            value={commentText}
                            autoFocus
                            onFocus={() => {
                                setIsEditing(true);
                            }}
                            onBlur={() => {
                                if (commentText === '') {
                                    setIsEditing(false);
                                }
                            }}
                            onChange={(e) => {
                                setCommentText(e.target.value);
                            }}
                            placeholder="Add a comment..."
                        />
                        <Box
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                paddingTop: '8px',
                            }}
                        >
                            <VSCodeButton
                                appearance="primary"
                                onClick={() => {
                                    if (commentText !== '') {
                                        onCreate(commentText, undefined);
                                        setCommentText('');
                                        setIsEditing(false);
                                    }
                                }}
                            >
                                Add
                            </VSCodeButton>
                            <VSCodeButton
                                appearance="secondary"
                                onClick={() => {
                                    setCommentText('');
                                    setIsEditing(false);
                                }}
                            >
                                Cancel
                            </VSCodeButton>
                        </Box>
                    </Box>
                )}
            </Box>
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
            {comments.reverse().map((comment: JiraComment) => (
                <CommentComponent
                    key={`${comment.id}::${comment.updated}`}
                    user={currentUser}
                    comment={comment}
                    onSave={onSave}
                />
            ))}
        </Box>
    );
};
