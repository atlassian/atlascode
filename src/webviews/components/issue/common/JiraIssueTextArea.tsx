import { Spacing } from '@atlaskit/button';
import { ButtonAppearance } from '@atlaskit/button/dist/types/new-button/variants/types';
import TextArea from '@atlaskit/textarea';
import Toggle from '@atlaskit/toggle';
import Tooltip from '@atlaskit/tooltip';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import React from 'react';

import { useEditor } from '../../editor/Editor';
import PopoutMentionPicker from '../../pullrequest/PopoutMentionPicker';

type Props = {
    value: string;
    onChange: (input: string) => void;
    onEditorFocus?: (e: any) => void;
    onSave?: (i: string) => void;
    onCancel?: () => void;
    fetchUsers?: (input: string) => Promise<{ displayName: string; mention: string; avatarUrl?: string }[]>;
    isServiceDeskProject?: boolean;
    onInternalCommentSave?: () => void;
    isDescription?: boolean;
    saving?: boolean;
};

interface User {
    displayName: string;
    mention: string;
    avatarUrl?: string;
}

const JiraIssueTextAreaEditor: React.FC<Props> = ({
    value,
    onChange,
    onEditorFocus,
    onCancel,
    onSave,
    fetchUsers,
    isServiceDeskProject,
    onInternalCommentSave,
    isDescription,
    saving,
}) => {
    const inputTextAreaRef = React.useRef<HTMLTextAreaElement>(null);
    const [cursorPosition, setCursorPosition] = React.useState(value?.length || 0);
    const buttonProps = {
        spacing: 'compact' as Spacing,
        appearance: 'subtle' as ButtonAppearance,
    };

    const [rteEnabled, setRteEnabled] = React.useState(true);

    const { viewHost, handleSave } = useEditor<User>({
        value,
        onSave: (i: string) => {
            onChange(i);
            onSave?.(i);
        },
        onChange,
        enabled: rteEnabled,
        fetchUsers,
    });

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
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <div role="textbox" hidden={!rteEnabled} ref={viewHost} aria-label="Jira rich text editor" />
            <div hidden={rteEnabled}>
                <TextArea
                    style={{
                        background: 'var(--vscode-input-background)',
                        color: 'var(--vscode-input-foreground)',
                        border: '1px solid var(--vscode-input-border)',
                        caretColor: 'var(--vscode-editorCursor-background)',
                        minHeight: isDescription ? '175px' : '100px',
                        borderRadius: '2px',
                        overflow: 'auto',
                    }}
                    value={value}
                    ref={inputTextAreaRef}
                    autoFocus
                    onFocus={onEditorFocus ? onEditorFocus : undefined}
                    onChange={(e) => onChange(e.target.value)}
                    isDisabled={saving}
                />
            </div>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '8px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    {onSave && (
                        <VSCodeButton
                            appearance="primary"
                            onClick={() => {
                                rteEnabled ? handleSave() : onSave(value);
                            }}
                            disabled={saving}
                        >
                            {isServiceDeskProject ? 'Reply' : 'Save'}
                        </VSCodeButton>
                    )}
                    {isServiceDeskProject && onInternalCommentSave && (
                        <VSCodeButton appearance="secondary" onClick={onInternalCommentSave} disabled={saving}>
                            Add internal note
                        </VSCodeButton>
                    )}
                    {onCancel && (
                        <VSCodeButton appearance="secondary" onClick={onCancel} disabled={saving}>
                            Cancel
                        </VSCodeButton>
                    )}
                    {fetchUsers && !rteEnabled && (
                        <PopoutMentionPicker
                            targetButtonContent="@"
                            targetButtonTooltip="Mention @"
                            targetButtonProps={buttonProps}
                            loadUserOptions={fetchUsers}
                            onUserMentioned={handleMention}
                        />
                    )}
                </div>
                <Tooltip content="Toggle rich text editor" position="top">
                    <Toggle label="rte toggle" defaultChecked onChange={(e) => setRteEnabled(e.target.checked)} />
                </Tooltip>
            </div>
        </div>
    );
};

export default JiraIssueTextAreaEditor;
