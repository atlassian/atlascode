import Avatar from '@atlaskit/avatar';
import Comment, { CommentAction, CommentAuthor, CommentEdited } from '@atlaskit/comment';
import TextField from '@atlaskit/textfield';
import {
    Comment as JiraComment,
    CommentVisibility,
    JsdInternalCommentVisibility,
    User,
} from '@atlassianlabs/jira-pi-common-models';
import { Box } from '@mui/material';
import { formatDistanceToNow, parseISO } from 'date-fns';
import React from 'react';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';

import { AdfAwareContent } from '../../../AdfAwareContent';
import { RenderedContent } from '../../../RenderedContent';
import AtlaskitEditor from '../../common/AtlaskitEditor/AtlaskitEditor';
import JiraIssueTextAreaEditor from '../../common/JiraIssueTextArea';
import { useEditorState } from '../EditorStateContext';
import { useEditorForceClose } from '../hooks/useEditorForceClose';

export type IssueCommentComponentProps = {
    siteDetails: DetailedSiteInfo;
    currentUser: User;
    comments: JiraComment[];
    isServiceDeskProject: boolean;
    onSave: (commentBody: string, commentId?: string, restriction?: CommentVisibility) => void;
    onCreate: (commentBody: string, restriction?: CommentVisibility) => void;
    fetchUsers: (input: string) => Promise<any[]>;
    fetchImage: (url: string) => Promise<string>;
    onDelete: (commentId: string) => void;
    commentText: string;
    onCommentTextChange: (text: string) => void;
    isEditingComment: boolean;
    onEditingCommentChange: (editing: boolean) => void;
    isAtlaskitEditorEnabled?: boolean;
};
const CommentComponent: React.FC<{
    siteDetails: DetailedSiteInfo;
    comment: JiraComment;
    onSave: (t: string, commentId?: string, restriction?: CommentVisibility) => void;
    fetchImage: (url: string) => Promise<string>;
    onDelete: (commentId: string) => void;
    fetchUsers: (input: string) => Promise<any[]>;
    isServiceDeskProject?: boolean;
    isAtlaskitEditorEnabled?: boolean;
}> = ({
    siteDetails,
    comment,
    onSave,
    fetchImage,
    onDelete,
    fetchUsers,
    isServiceDeskProject,
    isAtlaskitEditorEnabled,
}) => {
    const { openEditor, closeEditor, isEditorActive } = useEditorState();
    const editorId = `edit-comment-${comment.id}` as const;
    const [localIsEditing, setLocalIsEditing] = React.useState(false);
    const isEditing = isAtlaskitEditorEnabled ? isEditorActive(editorId) : localIsEditing;

    // Define editor handlers based on feature flag
    const openEditorHandler = React.useMemo(
        () => (isAtlaskitEditorEnabled ? () => openEditor(editorId) : () => setLocalIsEditing(true)),
        [isAtlaskitEditorEnabled, openEditor, editorId],
    );

    const closeEditorHandler = React.useMemo(
        () => (isAtlaskitEditorEnabled ? () => closeEditor(editorId) : () => setLocalIsEditing(false)),
        [isAtlaskitEditorEnabled, closeEditor, editorId],
    );
    const [isSaving, setIsSaving] = React.useState(false);
    const bodyText = comment.renderedBody ? comment.renderedBody : comment.body;

    const [commentText, setCommentText] = React.useState(comment.body);
    // Update commentText when comment.body changes (after save)
    React.useEffect(() => {
        if (!isEditing) {
            setCommentText(comment.body);
        }
    }, [comment.body, isEditing]);

    // Listen for forced editor close events
    useEditorForceClose(
        editorId,
        React.useCallback(() => {
            // Reset comment editor state when it's forcibly closed
            setCommentText(comment.body);
            setIsSaving(false);
            closeEditorHandler();
        }, [comment.body, closeEditorHandler]),
        isAtlaskitEditorEnabled,
    );

    const baseActions: JSX.Element[] = [<CommentAction onClick={openEditorHandler}>Edit</CommentAction>];

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
                        isAtlaskitEditorEnabled ? (
                            <AtlaskitEditor
                                defaultValue={commentText}
                                onSave={(content) => {
                                    setIsSaving(true);
                                    closeEditorHandler();
                                    onSave(content, comment.id, undefined);
                                }}
                                onCancel={() => {
                                    setCommentText(comment.body);
                                    setIsSaving(false);
                                    closeEditorHandler();
                                }}
                                onContentChange={(content) => {
                                    setCommentText(content);
                                }}
                            />
                        ) : (
                            <JiraIssueTextAreaEditor
                                value={commentText}
                                onChange={(e: string) => {
                                    setCommentText(e);
                                }}
                                onSave={() => {
                                    setIsSaving(true);
                                    closeEditorHandler();
                                    onSave(commentText, comment.id, undefined);
                                }}
                                onCancel={() => {
                                    setIsSaving(false);
                                    closeEditorHandler();
                                    setCommentText(comment.body);
                                }}
                                onInternalCommentSave={() => {
                                    setIsSaving(false);
                                    closeEditorHandler();
                                    onSave(commentText, comment.id, JsdInternalCommentVisibility);
                                }}
                                fetchUsers={fetchUsers}
                                isServiceDeskProject={isServiceDeskProject}
                            />
                        )
                    ) : isAtlaskitEditorEnabled ? (
                        <AdfAwareContent content={comment.body} fetchImage={fetchImage} />
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
    isAtlaskitEditorEnabled?: boolean;
    commentText: string;
    setCommentText: (text: string) => void;
    isEditing: boolean;
    setIsEditing: (editing: boolean) => void;
}> = ({
    fetchUsers,
    user,
    onCreate,
    isServiceDeskProject,
    isAtlaskitEditorEnabled,
    commentText,
    setCommentText,
    isEditing,
    setIsEditing,
}) => {
    const { openEditor, closeEditor } = useEditorState();

    // Define editor handlers based on feature flag
    const openEditorHandler = React.useMemo(
        () =>
            isAtlaskitEditorEnabled
                ? () => {
                      openEditor('add-comment');
                      setIsEditing(true);
                  }
                : () => setIsEditing(true),
        [isAtlaskitEditorEnabled, openEditor, setIsEditing],
    );

    const closeEditorHandler = React.useMemo(
        () =>
            isAtlaskitEditorEnabled
                ? () => {
                      closeEditor('add-comment');
                      setIsEditing(false);
                  }
                : () => setIsEditing(false),
        [isAtlaskitEditorEnabled, closeEditor, setIsEditing],
    );

    // Listen for forced editor close events
    useEditorForceClose(
        'add-comment',
        React.useCallback(() => {
            // Reset add comment editor state when it's forcibly closed
            setCommentText('');
            closeEditorHandler();
        }, [closeEditorHandler, setCommentText]),
        isAtlaskitEditorEnabled,
    );

    return (
        <Box style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <Box
                data-testid="issue.new-comment"
                style={{ display: 'flex', flexDirection: 'row', alignItems: isEditing ? 'start' : 'center' }}
            >
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
                        onClick={openEditorHandler}
                        placeholder="Add a comment..."
                    />
                ) : isAtlaskitEditorEnabled ? (
                    <Box sx={{ width: '100%' }}>
                        <AtlaskitEditor
                            defaultValue={commentText}
                            onSave={(content) => {
                                if (content && content.trim() !== '') {
                                    onCreate(content, undefined);
                                    setCommentText('');
                                    closeEditorHandler();
                                }
                            }}
                            onCancel={() => {
                                setCommentText('');
                                closeEditorHandler();
                            }}
                            onContentChange={(content) => {
                                setCommentText(content);
                            }}
                        />
                    </Box>
                ) : (
                    <JiraIssueTextAreaEditor
                        value={commentText}
                        onChange={(e: string) => setCommentText(e)}
                        onSave={(i: string) => {
                            if (i !== '') {
                                onCreate(i, undefined);
                                setCommentText('');
                                closeEditorHandler();
                            }
                        }}
                        onInternalCommentSave={() => {
                            onCreate(commentText, JsdInternalCommentVisibility);
                            setCommentText('');
                            closeEditorHandler();
                        }}
                        onCancel={() => {
                            setCommentText('');
                            closeEditorHandler();
                        }}
                        onEditorFocus={openEditorHandler}
                        fetchUsers={fetchUsers}
                        isServiceDeskProject={isServiceDeskProject}
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
    commentText,
    onCommentTextChange,
    isEditingComment,
    onEditingCommentChange,
    isAtlaskitEditorEnabled,
}) => {
    return (
        <Box
            data-testid="issue.comments-section"
            style={{ display: 'flex', flexDirection: 'column', paddingTop: '8px' }}
        >
            <AddCommentComponent
                fetchUsers={fetchUsers}
                user={currentUser}
                onCreate={onCreate}
                isServiceDeskProject={isServiceDeskProject}
                isAtlaskitEditorEnabled={isAtlaskitEditorEnabled}
                commentText={commentText}
                setCommentText={onCommentTextChange}
                isEditing={isEditingComment}
                setIsEditing={onEditingCommentChange}
            />
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
                        isAtlaskitEditorEnabled={isAtlaskitEditorEnabled}
                    />
                ))}
        </Box>
    );
};
