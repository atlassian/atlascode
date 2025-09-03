import { ComposableEditor } from '@atlaskit/editor-core/composable-editor';
import { createDefaultPreset } from '@atlaskit/editor-core/preset-default';
import { usePreset } from '@atlaskit/editor-core/use-preset';
import TextArea from '@atlaskit/textarea';
import Toggle from '@atlaskit/toggle';
import Tooltip from '@atlaskit/tooltip';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

// Add CSS for placeholder functionality
const editorStyles = `
.rich-text-editor:empty:before {
    content: attr(data-placeholder);
    color: var(--vscode-input-placeholderForeground);
    pointer-events: none;
}
.rich-text-editor:focus:before {
    display: none;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('style');
    styleElement.textContent = editorStyles;
    document.head.appendChild(styleElement);
}

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
    featureGateEnabled?: boolean;
};

const AtlassianEditor: React.FC<Props> = ({
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
    featureGateEnabled = false,
}) => {
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [useRichEditor, setUseRichEditor] = useState(featureGateEnabled);
    const [currentValue, setCurrentValue] = useState(value);

    // Setup the composable editor preset with default comment features
    const createPreset = useCallback(
        () =>
            createDefaultPreset({
                featureFlags: {},
                paste: {},
            }),
        [],
    );

    const { preset } = usePreset(createPreset);

    // Update current value when prop changes
    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    // Handle editor content changes
    const handleEditorChange = useCallback(
        (content: any) => {
            // Convert ADF to markdown or string as needed
            const stringContent = typeof content === 'string' ? content : JSON.stringify(content);
            setCurrentValue(stringContent);
            onChange(stringContent);
        },
        [onChange],
    );

    const handleSave = () => {
        onSave?.(currentValue);
    };

    const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setCurrentValue(newValue);
        onChange(newValue);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            {/* Atlassian Rich Text Editor */}
            {useRichEditor && (
                <div
                    style={{
                        border: '1px solid var(--vscode-input-border)',
                        borderRadius: '2px',
                        minHeight: isDescription ? '175px' : '100px',
                        background: 'var(--vscode-input-background)',
                        overflow: 'hidden',
                    }}
                >
                    <ComposableEditor
                        appearance="comment"
                        preset={preset}
                        onChange={handleEditorChange}
                        disabled={saving}
                    />
                </div>
            )}

            {/* Fallback TextArea */}
            {!useRichEditor && (
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
                    value={currentValue}
                    ref={textAreaRef}
                    autoFocus
                    onFocus={onEditorFocus}
                    onChange={handleTextAreaChange}
                    isDisabled={saving}
                />
            )}

            {/* Action Buttons */}
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
                        <VSCodeButton appearance="primary" onClick={handleSave} disabled={saving}>
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
                </div>
                <Tooltip content="Toggle between rich text editor and plain text" position="top">
                    <Toggle
                        label="Atlassian Editor"
                        isChecked={useRichEditor}
                        onChange={(e) => setUseRichEditor(e.target.checked)}
                    />
                </Tooltip>
            </div>
        </div>
    );
};

export { AtlassianEditor };
export default AtlassianEditor;
