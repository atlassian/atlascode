import { ButtonGroup } from '@atlaskit/button';
import Button from '@atlaskit/button';
import Comment from '@atlaskit/comment';
import React, { useState } from 'react';
import { RenderedContent } from '../RenderedContent';
import { TextAreaEditor } from './TextAreaEditor';
import * as l10n from '@vscode/l10n';

interface Props {
    text: string;
    renderedText?: string;
    fetchUsers: (input: string) => Promise<any[]>;
    onSave: (text: string) => Promise<void>;
    fetchImage?: (url: string) => Promise<string>;
}

export const EditRenderedTextArea: React.FC<Props> = ({
    text,
    renderedText,
    fetchUsers,
    onSave,
    fetchImage,
}: Props) => {
    const [editing, setEditing] = useState(false);
    const [commentInputValue, setCommentInputValue] = useState(text);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            setEditing(false);
            await onSave(commentInputValue);
        } finally {
            setIsSaving(false);
        }
    };

    if (editing) {
        return (
            <React.Fragment>
                <Comment
                    isSaving={isSaving}
                    content={
                        <TextAreaEditor
                            value={commentInputValue}
                            fetchUsers={fetchUsers}
                            disabled={isSaving}
                            onChange={(input: string) => setCommentInputValue(input)}
                        />
                    }
                />
                <ButtonGroup>
                    <Button className="ac-button" onClick={handleSave} isDisabled={isSaving}>
                        {l10n.t('Save')}
                    </Button>
                    <Button
                        appearance="default"
                        onClick={() => {
                            setEditing(false);
                            setCommentInputValue(text);
                        }}
                    >
                        {l10n.t('Cancel')}
                    </Button>
                </ButtonGroup>
            </React.Fragment>
        );
    }

    return isSaving ? (
        <Comment content={<p style={{ whiteSpace: 'pre-wrap', opacity: 0.5 }}>{commentInputValue}</p>} />
    ) : (
        <Comment
            content={
                <div className="ac-inline-input-view-p" onClick={() => setEditing(true)}>
                    {renderedText ? <RenderedContent html={renderedText} fetchImage={fetchImage} /> : <p>{text}</p>}
                </div>
            }
        />
    );
};
