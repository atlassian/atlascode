import { Box } from '@material-ui/core';
import TextArea from '@atlaskit/textarea';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import React from 'react';
import MentionPicker from './MentionPicker';

type Props = {
    value: string;
    onChange: (input: string) => void;
    onEditorFocus?: (e: any) => void;
    onSave: () => void;
    onCancel: () => void;
    fetchUsers?: (input: string) => Promise<{ displayName: string; mention: string; avatarUrl?: string }[]>;
    isServiceDeskProject?: boolean;
    onInternalCommentSave?: () => void;
};
const JiraIssueTextAreaEditor: React.FC<Props> = ({
    value,
    onChange,
    onEditorFocus,
    onCancel,
    onSave,
    fetchUsers,
    isServiceDeskProject,
    onInternalCommentSave,
}) => {
    const inputTextAreaRef = React.useRef<HTMLTextAreaElement>(null);
    const [cursorPosition, setCursorPosition] = React.useState(value?.length || 0);

    React.useEffect(() => {
        if (inputTextAreaRef.current && cursorPosition > 0) {
            inputTextAreaRef.current.selectionEnd = cursorPosition;
            inputTextAreaRef.current.selectionStart = cursorPosition;
            inputTextAreaRef.current.focus();
        }
    }, [inputTextAreaRef, cursorPosition]);

    const handleMention = React.useCallback(
        (user: any) => {
            if (!inputTextAreaRef.current) {
                return;
            }
            const { selectionStart, selectionEnd, value } = inputTextAreaRef.current;
            const mentionText: string = user.mention;
            const commentInputWithMention = `${value.slice(0, selectionStart)}${mentionText} ${value.slice(selectionEnd)}`;
            setCursorPosition(selectionStart + mentionText.length);
            onChange(commentInputWithMention);
        },
        [onChange],
    );
    return (
        <Box style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <TextArea
                style={{
                    background: 'var(--vscode-input-background)',
                    color: 'var(--vscode-input-foreground)',
                    border: '1px solid var(--vscode-input-border)',
                    caretColor: 'var(--vscode-editorCursor-background)',
                    minHeight: '100px',
                    overflow: 'auto',
                }}
                value={value}
                ref={inputTextAreaRef}
                autoFocus
                onFocus={onEditorFocus ? onEditorFocus : undefined}
                onChange={(e) => onChange(e.target.value)}
            />
            <Box
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '8px',
                }}
            >
                <Box
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <VSCodeButton appearance="primary" onClick={onSave} disabled={value === ''}>
                        {isServiceDeskProject ? 'Reply' : 'Save'}
                    </VSCodeButton>
                    {isServiceDeskProject && onInternalCommentSave && (
                        <VSCodeButton appearance="secondary" onClick={onInternalCommentSave} disabled={value === ''}>
                            Add internal note
                        </VSCodeButton>
                    )}
                    {fetchUsers && (
                        <MentionPicker
                            targetButtonContent="@"
                            targetButtonTooltip="Mention @"
                            loadUserOptions={fetchUsers}
                            onUserMentioned={handleMention}
                        />
                    )}
                </Box>
                <VSCodeButton appearance="secondary" onClick={onCancel}>
                    Cancel
                </VSCodeButton>
            </Box>
        </Box>
    );
};

export default JiraIssueTextAreaEditor;
