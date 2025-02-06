import Avatar from '@atlaskit/avatar';
import { ButtonGroup } from '@atlaskit/button';
import Button from '@atlaskit/button';
import Comment, { CommentAction, CommentAuthor, CommentEdited, CommentTime } from '@atlaskit/comment';
import {
    Comment as JiraComment,
    CommentVisibility,
    JsdInternalCommentVisibility,
} from '@atlassianlabs/jira-pi-common-models';
import { formatDistanceToNow, parseISO } from 'date-fns';
import React, { useState } from 'react';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { RenderedContent } from '../RenderedContent';
import { TextAreaEditor } from './TextAreaEditor';
import * as l10n from '@vscode/l10n';

type Props = {
    siteDetails: DetailedSiteInfo;
    comment: JiraComment;
    isServiceDeskProject: boolean;
    fetchUsers: (input: string) => Promise<any[]>;
    onSave: (commentBody: string, commentId?: string, restriction?: CommentVisibility) => void;
    onDelete: (commentId: string) => void;
    fetchImage?: (url: string) => Promise<string>;
};

export const CommentComponent: React.FC<Props> = ({
    siteDetails,
    comment,
    isServiceDeskProject,
    fetchUsers,
    onSave,
    onDelete,
    fetchImage,
}: Props) => {
    const [editing, setEditing] = useState(false);
    const [commentInputValue, setCommentInputValue] = useState(comment.body);
    const [isSaving, setIsSaving] = useState(false);

    const prettyCreated = `${formatDistanceToNow(parseISO(comment.created))} ago`;
    const body = comment.renderedBody ? comment.renderedBody : comment.body;
    const type = isServiceDeskProject ? (comment.jsdPublic ? 'external' : 'internal') : undefined;

    if (editing && !isSaving) {
        return (
            <React.Fragment>
                <Comment
                    avatar={
                        <Avatar
                            src={comment.author.avatarUrls['48x48']}
                            label={l10n.t('Atlaskit avatar')}
                            size="medium"
                        />
                    }
                    author={
                        <CommentAuthor>
                            <div className="jira-comment-author">{comment.author.displayName}</div>
                        </CommentAuthor>
                    }
                    content={
                        <React.Fragment>
                            <TextAreaEditor
                                value={commentInputValue}
                                fetchUsers={async (input: string) =>
                                    (await fetchUsers(input)).map((user) => ({
                                        displayName: user.displayName,
                                        avatarUrl: user.avatarUrls?.['48x48'],
                                        mention: siteDetails.isCloud
                                            ? `[~accountid:${user.accountId}]`
                                            : `[~${user.name}]`,
                                    }))
                                }
                                disabled={isSaving}
                                onChange={(input: string) => setCommentInputValue(input)}
                            />
                            <ButtonGroup>
                                <Button
                                    className="ac-button"
                                    onClick={() => {
                                        onSave(commentInputValue, comment.id, undefined);
                                        setIsSaving(true);
                                    }}
                                    isDisabled={isSaving}
                                >
                                    {isServiceDeskProject ? l10n.t('Reply to customer') : l10n.t('Save')}
                                </Button>
                                {isServiceDeskProject && (
                                    <Button
                                        className="ac-button"
                                        onClick={() => {
                                            onSave(commentInputValue, comment.id, JsdInternalCommentVisibility);
                                            setIsSaving(true);
                                        }}
                                        isDisabled={isSaving}
                                    >
                                        {l10n.t('Add internal note')}
                                    </Button>
                                )}
                                <Button
                                    appearance="default"
                                    onClick={() => {
                                        setEditing(false);
                                        setCommentInputValue(comment.body);
                                    }}
                                >
                                    {l10n.t('Cancel')}
                                </Button>
                            </ButtonGroup>
                        </React.Fragment>
                    }
                />
            </React.Fragment>
        );
    }

    return (
        <Comment
            avatar={<Avatar src={comment.author.avatarUrls['48x48']} label={l10n.t('Atlaskit avatar')} size="medium" />}
            author={
                <CommentAuthor>
                    <div className="jira-comment-author">{comment.author.displayName}</div>
                </CommentAuthor>
            }
            time={<CommentTime>{prettyCreated}</CommentTime>}
            edited={comment.created !== comment.updated ? <CommentEdited>Edited</CommentEdited> : null}
            type={type}
            content={
                isSaving ? (
                    <p style={{ whiteSpace: 'pre-wrap', opacity: 0.5 }}>{commentInputValue}</p>
                ) : (
                    <div className="jira-comment">
                        <RenderedContent html={body} fetchImage={fetchImage} />
                    </div>
                )
            }
            isSaving={isSaving}
            actions={
                siteDetails.userId === comment.author.accountId
                    ? [
                          <CommentAction onClick={() => setEditing(true)}>Edit</CommentAction>,
                          <CommentAction
                              onClick={() => {
                                  onDelete(comment.id);
                                  setCommentInputValue('');
                                  setIsSaving(true);
                              }}
                          >
                              {l10n.t('Delete')}
                          </CommentAction>,
                      ]
                    : []
            }
        />
    );
};
