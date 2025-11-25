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
import { convertAdfToWikimarkup, convertWikimarkupToAdf } from '../../common/adfToWikimarkup';
import { AtlascodeMentionProvider } from '../../common/AtlaskitEditor/AtlascodeMentionsProvider';
import AtlaskitEditor from '../../common/AtlaskitEditor/AtlaskitEditor';
import JiraIssueTextAreaEditor from '../../common/JiraIssueTextArea';
import { useEditorState } from '../EditorStateContext';
import { useEditorForceClose } from '../hooks/useEditorForceClose';

export type IssueCommentComponentProps = {
    siteDetails: DetailedSiteInfo;
    currentUser: User;
    comments: JiraComment[];
    isServiceDeskProject: boolean;
    onSave: (commentBody: any, commentId?: string, restriction?: CommentVisibility) => void; // Can be string or ADF object
    onCreate: (commentBody: any, restriction?: CommentVisibility) => void; // Can be string or ADF object
    fetchUsers: (input: string) => Promise<any[]>;
    fetchImage: (url: string) => Promise<string>;
    onDelete: (commentId: string) => void;
    commentText: string;
    onCommentTextChange: (text: string) => void;
    isEditingComment: boolean;
    onEditingCommentChange: (editing: boolean) => void;
    isAtlaskitEditorEnabled?: boolean;
    mentionProvider: AtlascodeMentionProvider;
    handleEditorFocus: (isFocused: boolean) => void;
};
const CommentComponent: React.FC<{
    siteDetails: DetailedSiteInfo;
    comment: JiraComment;
    onSave: (t: any, commentId?: string, restriction?: CommentVisibility) => void; // Can be string or ADF object
    fetchImage: (url: string) => Promise<string>;
    onDelete: (commentId: string) => void;
    fetchUsers: (input: string) => Promise<any[]>;
    isServiceDeskProject?: boolean;
    isAtlaskitEditorEnabled?: boolean;
    mentionProvider: AtlascodeMentionProvider;
    handleEditorFocus: (isFocused: boolean) => void;
}> = ({
    siteDetails,
    comment,
    onSave,
    fetchImage,
    onDelete,
    fetchUsers,
    isServiceDeskProject,
    isAtlaskitEditorEnabled,
    mentionProvider,
    handleEditorFocus,
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

    // Convert comment body to appropriate format for editor
    const getCommentTextForEditor = React.useCallback(
        (body: any) => {
            if (typeof body === 'object' && body.version === 1 && body.type === 'doc') {
                // For new Atlaskit editor: convert ADF to JSON string
                if (isAtlaskitEditorEnabled) {
                    return JSON.stringify(body);
                }
                // For legacy editor: convert ADF to WikiMarkup
                return convertAdfToWikimarkup(body);
            }
            return body || '';
        },
        [isAtlaskitEditorEnabled],
    );

    const [commentText, setCommentText] = React.useState(() => getCommentTextForEditor(comment.body));
    // Update commentText when comment.body changes (after save)
    React.useEffect(() => {
        if (!isEditing) {
            setCommentText(getCommentTextForEditor(comment.body));
        }
    }, [comment.body, isEditing, getCommentTextForEditor]);

    // Listen for forced editor close events
    useEditorForceClose(
        editorId,
        React.useCallback(() => {
            // Reset comment editor state when it's forcibly closed
            setCommentText(getCommentTextForEditor(comment.body));
            setIsSaving(false);
            closeEditorHandler();
        }, [comment.body, closeEditorHandler, getCommentTextForEditor]),
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
                                mentionProvider={Promise.resolve(mentionProvider)}
                                onFocus={() => handleEditorFocus(true)}
                                onBlur={() => handleEditorFocus(false)}
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
                                    // Convert WikiMarkup to ADF before saving (API v3 requires ADF)
                                    const adfContent = convertWikimarkupToAdf(commentText);
                                    onSave(adfContent, comment.id, undefined);
                                }}
                                onCancel={() => {
                                    setIsSaving(false);
                                    closeEditorHandler();
                                    setCommentText(getCommentTextForEditor(comment.body));
                                }}
                                onInternalCommentSave={() => {
                                    setIsSaving(false);
                                    closeEditorHandler();
                                    // Convert WikiMarkup to ADF before saving (API v3 requires ADF)
                                    const adfContent = convertWikimarkupToAdf(commentText);
                                    onSave(adfContent, comment.id, JsdInternalCommentVisibility);
                                }}
                                fetchUsers={fetchUsers}
                                isServiceDeskProject={isServiceDeskProject}
                                onEditorFocus={() => handleEditorFocus(true)}
                                onEditorBlur={() => handleEditorFocus(false)}
                            />
                        )
                    ) : isAtlaskitEditorEnabled ? (
                        <AdfAwareContent content={comment.body} mentionProvider={mentionProvider} />
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
    onCreate: (t: any, restriction?: CommentVisibility) => void; // Can be string or ADF object
    isServiceDeskProject?: boolean;
    isAtlaskitEditorEnabled?: boolean;
    commentText: string;
    setCommentText: (text: string) => void;
    isEditing: boolean;
    setIsEditing: (editing: boolean) => void;
    mentionProvider: AtlascodeMentionProvider;
    handleEditorFocus: (isFocused: boolean) => void;
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
    mentionProvider,
    handleEditorFocus,
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
                                // For v3 API: content is ADF object, not string
                                // Check if it's empty by checking the content structure
                                const isEmpty =
                                    !content ||
                                    (typeof content === 'object' &&
                                        (!content.content ||
                                            content.content.length === 0 ||
                                            (content.content.length === 1 &&
                                                content.content[0].type === 'paragraph' &&
                                                (!content.content[0].content ||
                                                    content.content[0].content.length === 0)))) ||
                                    (typeof content === 'string' && content.trim() === '');

                                if (!isEmpty) {
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
                            mentionProvider={Promise.resolve(mentionProvider)}
                            onFocus={() => handleEditorFocus(true)}
                            onBlur={() => handleEditorFocus(false)}
                        />
                    </Box>
                ) : (
                    <JiraIssueTextAreaEditor
                        value={commentText}
                        onChange={(e: string) => setCommentText(e)}
                        onSave={(i: string) => {
                            if (i !== '') {
                                // Convert WikiMarkup to ADF before saving (API v3 requires ADF)
                                const adfContent = convertWikimarkupToAdf(i);
                                onCreate(adfContent, undefined);
                                setCommentText('');
                                closeEditorHandler();
                            }
                        }}
                        onInternalCommentSave={() => {
                            // Convert WikiMarkup to ADF before saving (API v3 requires ADF)
                            const adfContent = convertWikimarkupToAdf(commentText);
                            onCreate(adfContent, JsdInternalCommentVisibility);
                            setCommentText('');
                            closeEditorHandler();
                        }}
                        onCancel={() => {
                            setCommentText('');
                            closeEditorHandler();
                        }}
                        onEditorFocus={() => {
                            openEditorHandler();
                            handleEditorFocus(true);
                        }}
                        onEditorBlur={() => handleEditorFocus(false)}
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
    mentionProvider,
    handleEditorFocus,
}) => {
    return (
        <Box
            data-testid="issue.comments-section"
            style={{ display: 'flex', flexDirection: 'column', paddingTop: '8px', gap: '16px' }}
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
                mentionProvider={mentionProvider}
                handleEditorFocus={handleEditorFocus}
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
                        mentionProvider={mentionProvider}
                        handleEditorFocus={handleEditorFocus}
                    />
                ))}
        </Box>
    );
};
