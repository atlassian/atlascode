import Avatar from '@atlaskit/avatar';
import Comment, { CommentAction, CommentAuthor, CommentEdited } from '@atlaskit/comment';
import { EmojiPicker } from '@atlaskit/emoji/picker';
import { EmojiResource, EmojiResourceConfig } from '@atlaskit/emoji/resource';
import EmojiAddIcon from '@atlaskit/icon/core/emoji-add';
import ThumbsUpIcon from '@atlaskit/icon/core/thumbs-up';
import Popup from '@atlaskit/popup';
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
import { IntlProvider } from 'react-intl-next';
import { DetailedSiteInfo } from 'src/atlclients/authInfo';

import { AdfAwareContent } from '../../../AdfAwareContent';
import { RenderedContent } from '../../../RenderedContent';
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
    fetchEmoji: (url: string) => Promise<any>;
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
    fetchEmoji: (url: string) => Promise<any>;
    onDelete: (commentId: string) => void;
    fetchUsers: (input: string) => Promise<any[]>;
    isServiceDeskProject?: boolean;
    isAtlaskitEditorEnabled?: boolean;
    mentionProvider: AtlascodeMentionProvider;
    handleEditorFocus: (isFocused: boolean) => void;
    currentUserId: string;
}> = ({
    siteDetails,
    comment,
    onSave,
    fetchImage,
    fetchEmoji,
    onDelete,
    fetchUsers,
    isServiceDeskProject,
    isAtlaskitEditorEnabled,
    mentionProvider,
    handleEditorFocus,
    currentUserId,
}) => {
    const { openEditor, closeEditor, isEditorActive } = useEditorState();
    const editorId = `edit-comment-${comment.id}` as const;
    const [localIsEditing, setLocalIsEditing] = React.useState(false);
    const isEditing = isAtlaskitEditorEnabled ? isEditorActive(editorId) : localIsEditing;

    const [thumbsUpCount, setThumbsUpCount] = React.useState(0);
    const [hasUserLiked, setHasUserLiked] = React.useState(false);

    const [reactions, setReactions] = React.useState<
        Map<string, { emoji: any; count: number; hasUserReacted: boolean }>
    >(new Map());

    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = React.useState(false);

    const originalFetchRef = React.useRef<typeof window.fetch | null>(null);

    React.useEffect(() => {
        if (isEmojiPickerOpen && !originalFetchRef.current) {
            originalFetchRef.current = window.fetch;

            const proxyFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
                let url: string;
                if (typeof input === 'string') {
                    url = input;
                } else if (input instanceof URL) {
                    url = input.toString();
                } else if (input instanceof Request) {
                    url = input.url;
                } else {
                    url = String(input);
                }

                if (url.includes('api-private.atlassian.com/emoji')) {
                    try {
                        const data = await fetchEmoji(url);
                        return new Response(JSON.stringify(data), {
                            status: 200,
                            statusText: 'OK',
                            headers: { 'Content-Type': 'application/json' },
                        });
                    } catch (error) {
                        return new Response(
                            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
                            {
                                status: 500,
                                statusText: 'Internal Server Error',
                                headers: { 'Content-Type': 'application/json' },
                            },
                        );
                    }
                }

                return originalFetchRef.current!(input, init);
            };

            window.fetch = proxyFetch as typeof fetch;
        } else if (!isEmojiPickerOpen && originalFetchRef.current) {
            window.fetch = originalFetchRef.current;
            originalFetchRef.current = null;
        }

        return () => {
            if (originalFetchRef.current) {
                window.fetch = originalFetchRef.current;
                originalFetchRef.current = null;
            }
        };
    }, [isEmojiPickerOpen, fetchEmoji]);

    const emojiProvider = React.useMemo(() => {
        const config: EmojiResourceConfig = {
            providers: [
                {
                    url: 'https://api-private.atlassian.com/emoji/standard',
                },
                ...(siteDetails.isCloud && siteDetails.id
                    ? [
                          {
                              url: `https://api-private.atlassian.com/emoji/${siteDetails.id}/site`,
                          },
                      ]
                    : []),
            ],
            currentUser: currentUserId ? { id: currentUserId } : undefined,
        };

        return Promise.resolve(new EmojiResource(config));
    }, [siteDetails.isCloud, siteDetails.id, currentUserId]);

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

    const handleThumbsUpClick = React.useCallback(() => {
        if (hasUserLiked) {
            setThumbsUpCount((prev) => Math.max(0, prev - 1));
            setHasUserLiked(false);
        } else {
            setThumbsUpCount((prev) => prev + 1);
            setHasUserLiked(true);
        }
    }, [hasUserLiked]);

    const handleEmojiSelection = React.useCallback((emoji: any) => {
        const emojiKey = emoji.id || emoji.shortName;
        setReactions((prevReactions) => {
            const newReactions = new Map(prevReactions);
            const existing = newReactions.get(emojiKey);

            if (existing) {
                if (existing.hasUserReacted) {
                    const newCount = existing.count - 1;
                    if (newCount === 0) {
                        newReactions.delete(emojiKey);
                    } else {
                        newReactions.set(emojiKey, { ...existing, count: newCount, hasUserReacted: false });
                    }
                } else {
                    newReactions.set(emojiKey, { ...existing, count: existing.count + 1, hasUserReacted: true });
                }
            } else {
                newReactions.set(emojiKey, { emoji, count: 1, hasUserReacted: true });
            }

            return newReactions;
        });
        setIsEmojiPickerOpen(false);
    }, []);

    const handleReactionClick = React.useCallback((emojiKey: string) => {
        setReactions((prevReactions) => {
            const newReactions = new Map(prevReactions);
            const existing = newReactions.get(emojiKey);

            if (existing) {
                if (existing.hasUserReacted) {
                    const newCount = existing.count - 1;
                    if (newCount === 0) {
                        newReactions.delete(emojiKey);
                    } else {
                        newReactions.set(emojiKey, { ...existing, count: newCount, hasUserReacted: false });
                    }
                } else {
                    newReactions.set(emojiKey, { ...existing, count: existing.count + 1, hasUserReacted: true });
                }
            }

            return newReactions;
        });
    }, []);

    const thumbsUpAction = (
        <CommentAction
            key="thumbs-up"
            onClick={handleThumbsUpClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: hasUserLiked ? 'var(--vscode-textLink-foreground)' : undefined,
            }}
        >
            <ThumbsUpIcon label="Thumbs up" size="small" />
            {thumbsUpCount > 0 && <span>{thumbsUpCount}</span>}
        </CommentAction>
    );

    const reactionActions = Array.from(reactions.entries()).map(([emojiKey, { emoji, count, hasUserReacted }]) => (
        <CommentAction
            key={`reaction-${emojiKey}`}
            onClick={() => handleReactionClick(emojiKey)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: hasUserReacted ? 'var(--vscode-textLink-foreground)' : undefined,
            }}
        >
            <span style={{ fontSize: '16px' }}>{emoji.fallback || emoji.shortName}</span>
            <span>{count}</span>
        </CommentAction>
    ));

    const baseActions: JSX.Element[] = [
        thumbsUpAction,
        ...reactionActions,
        <Popup
            key="add-reaction"
            isOpen={isEmojiPickerOpen}
            onClose={() => setIsEmojiPickerOpen(false)}
            placement="bottom-start"
            content={() => (
                <IntlProvider locale="en">
                    <div style={{ zIndex: 1000 }}>
                        <EmojiPicker emojiProvider={emojiProvider} onSelection={handleEmojiSelection} />
                    </div>
                </IntlProvider>
            )}
            trigger={(triggerProps) => (
                <CommentAction
                    {...triggerProps}
                    onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                    style={{ display: 'flex', alignItems: 'center' }}
                >
                    <EmojiAddIcon label="Add reaction" size="small" />
                </CommentAction>
            )}
        />,
        <CommentAction key="edit" onClick={openEditorHandler}>
            Edit
        </CommentAction>,
    ];

    const actions =
        comment.author.accountId === siteDetails.userId
            ? [
                  ...baseActions,
                  <CommentAction
                      key="delete"
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
    fetchEmoji,
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
                        fetchEmoji={fetchEmoji}
                        onDelete={onDelete}
                        fetchUsers={fetchUsers}
                        isServiceDeskProject={isServiceDeskProject}
                        isAtlaskitEditorEnabled={isAtlaskitEditorEnabled}
                        mentionProvider={mentionProvider}
                        handleEditorFocus={handleEditorFocus}
                        currentUserId={currentUser.accountId}
                    />
                ))}
        </Box>
    );
};
