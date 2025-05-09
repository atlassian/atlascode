import Avatar from '@atlaskit/avatar';
import Comment, { CommentAction, CommentAuthor, CommentEdited } from '@atlaskit/comment';
import TextField from '@atlaskit/textfield';
import {
    Comment as JiraComment,
    CommentVisibility,
    JsdInternalCommentVisibility,
    User,
} from '@atlassianlabs/jira-pi-common-models';
import { Box } from '@material-ui/core';
import { formatDistanceToNow, parseISO } from 'date-fns';
import React from 'react';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';

import { RenderedContent } from '../../../RenderedContent';
import JiraIssueTextAreaEditor from '../../common/JiraIssueTextArea';

type IssueCommentComponentProps = {
    siteDetails: DetailedSiteInfo;
    currentUser: User;
    comments: JiraComment[];
    isServiceDeskProject: boolean;
    onSave: (commentBody: string, commentId?: string, restriction?: CommentVisibility) => void;
    onCreate: (commentBody: string, restriction?: CommentVisibility) => void;
    fetchUsers: (input: string) => Promise<any[]>;
    fetchImage: (url: string) => Promise<string>;
    onDelete: (commentId: string) => void;
};
const CommentComponent: React.FC<{
    siteDetails: DetailedSiteInfo;
    comment: JiraComment;
    onSave: (t: string, commentId?: string, restriction?: CommentVisibility) => void;
    fetchImage: (url: string) => Promise<string>;
    onDelete: (commentId: string) => void;
    fetchUsers: (input: string) => Promise<any[]>;
    isServiceDeskProject?: boolean;
}> = ({ siteDetails, comment, onSave, fetchImage, onDelete, fetchUsers, isServiceDeskProject }) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const bodyText = comment.renderedBody ? comment.renderedBody : comment.body;
    const [commentText, setCommentText] = React.useState(comment.body);
    const baseActions: JSX.Element[] = [
        <CommentAction
            onClick={() => {
                setIsEditing(true);
            }}
        >
            Edit
        </CommentAction>,
    ];

    const actions =
        comment.author.accountId === siteDetails.userId
            ? [
                  ...baseActions,
                  <CommentAction
                      onClick={() => {
                          onDelete(comment.id);
                          setIsSaving(true);
                          setCommentText('');
                      }}
                  >
                      Delete
                  </CommentAction>,
              ]
            : baseActions;
    return (
        <Comment
            avatar={
                <Avatar
                    src={comment.author.avatarUrls['48x48']}
                    size={'small'}
                    borderColor="var(--vscode-editor-background)!important"
                />
            }
            author={
                <CommentAuthor>
                    <div className="jira-comment-author">{comment.author.displayName}</div>
                </CommentAuthor>
            }
            isSaving={isSaving}
            edited={comment.created !== comment.updated ? <CommentEdited>Edited</CommentEdited> : null}
            content={
                <>
                    {isEditing && !isSaving ? (
                        <JiraIssueTextAreaEditor
                            value={commentText}
                            onChange={(e: string) => {
                                setCommentText(e);
                            }}
                            onSave={() => {
                                setIsSaving(true);
                                setIsEditing(false);
                                onSave(commentText, comment.id, undefined);
                            }}
                            onCancel={() => {
                                setIsSaving(false);
                                setIsEditing(false);
                                setCommentText(comment.body);
                            }}
                            fetchUsers={fetchUsers}
                            isServiceDeskProject={isServiceDeskProject}
                            onInternalCommentSave={() => {
                                setIsSaving(false);
                                setIsEditing(false);
                                onSave(commentText, comment.id, JsdInternalCommentVisibility);
                            }}
                        />
                    ) : (
                        <RenderedContent html={bodyText} fetchImage={fetchImage} />
                    )}
                </>
            }
            time={
                <div className="inlinePanelSubheading">{`${formatDistanceToNow(parseISO(comment.created))} ago`}</div>
            }
            actions={actions}
        />
    );
};

const AddCommentComponent: React.FC<{
    fetchUsers: (i: string) => Promise<any[]>;
    user: User;
    onCreate: (t: string, restriction?: CommentVisibility) => void;
    isServiceDeskProject?: boolean;
}> = ({ fetchUsers, user, onCreate, isServiceDeskProject }) => {
    const [commentText, setCommentText] = React.useState('');
    const [isEditing, setIsEditing] = React.useState(false);

    return (
        <Box style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <Box style={{ display: 'flex', flexDirection: 'row', alignItems: isEditing ? 'start' : 'center' }}>
                <Box style={{ marginRight: '8px', marginTop: isEditing ? '4px' : '0px' }}>
                    <Avatar
                        src={user.avatarUrls['48x48']}
                        size={'small'}
                        borderColor="var(--vscode-editor-background)!important"
                    />
                </Box>
                {!isEditing ? (
                    <TextField
                        readOnly
                        className="ac-inputField"
                        css={{
                            ':placeholder': {
                                color: 'var(--vscode-input-placeholderForeground) !important',
                            },
                        }}
                        onClick={() => {
                            setIsEditing(true);
                        }}
                        placeholder="Add a comment..."
                    />
                ) : (
                    <JiraIssueTextAreaEditor
                        value={commentText}
                        onChange={(e: string) => setCommentText(e)}
                        onSave={(i: string) => {
                            if (i !== '') {
                                onCreate(i, undefined);
                                setCommentText('');
                                setIsEditing(false);
                            }
                        }}
                        onCancel={() => {
                            setCommentText('');
                            setIsEditing(false);
                        }}
                        onEditorFocus={() => {
                            setIsEditing(true);
                        }}
                        fetchUsers={fetchUsers}
                        isServiceDeskProject={isServiceDeskProject}
                        onInternalCommentSave={() => {
                            onCreate(commentText, JsdInternalCommentVisibility);
                            setCommentText('');
                            setIsEditing(false);
                        }}
                    />
                )}
            </Box>
        </Box>
    );
};
export const IssueCommentComponent: React.FC<IssueCommentComponentProps> = ({
    siteDetails,
    currentUser,
    comments,
    isServiceDeskProject,
    onCreate,
    onSave,
    fetchUsers,
    fetchImage,
    onDelete,
}) => {
    return (
        <Box style={{ display: 'flex', flexDirection: 'column', paddingTop: '8px' }}>
            <AddCommentComponent fetchUsers={fetchUsers} user={currentUser} onCreate={onCreate} />
            {comments
                .sort((a, b) => (a.created > b.created ? -1 : 1))
                .map((comment: JiraComment) => (
                    <CommentComponent
                        key={`${comment.id}::${comment.updated}`}
                        siteDetails={siteDetails}
                        comment={comment}
                        onSave={onSave}
                        fetchImage={fetchImage}
                        onDelete={onDelete}
                        fetchUsers={fetchUsers}
                        isServiceDeskProject={isServiceDeskProject}
                    />
                ))}
        </Box>
    );
};
