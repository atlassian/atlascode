import React from 'react';
import { RovoDevContextItem } from 'src/rovo-dev/rovoDevTypes';

const isHighContrastTheme = (): boolean => {
    return (
        document.body.classList.contains('vscode-high-contrast') ||
        document.body.classList.contains('vscode-high-contrast-light')
    );
};

// Shared styles for context chips and buttons
const chipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '1.5px 6px',
    backgroundColor: 'var(--vscode-editorWidget-background)',
    color: 'var(--vscode-editorWidget-foreground)',
    border: isHighContrastTheme()
        ? '2px solid var(--vscode-contrastBorder)'
        : '1px solid var(--vscode-editorWidget-border)',
    borderRadius: 5,
    fontWeight: 400,
    fontSize: 11,
    userSelect: 'none',
    boxShadow: 'none',
    marginRight: 2,
    opacity: 0.85,
    lineHeight: 1.1,
    maxWidth: 220,
};

const iconStyle: React.CSSProperties = {
    fontSize: 13,
    marginRight: 4,
};

const buttonBaseStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--vscode-editorWidget-foreground)',
    padding: 0,
    ...{
        fontSize: 13,
        height: 16,
        width: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
};

const toggleButtonStyle = (enabled: boolean): React.CSSProperties => ({
    ...buttonBaseStyle,
    opacity: enabled ? 1 : 0.5,
});

const removeButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    opacity: 0.85,
};

const addButtonStyle: React.CSSProperties = {
    ...chipStyle,
    marginBottom: 4,
    padding: '1.5px 3px',
    cursor: 'pointer',
};

export type PromptContextItemToggleProps = {
    onToggle?: (enabled: boolean) => void;
};

export type PromptContextItemRemoveProps = {
    onRemove?: () => void;
};

export const PromptContextItem: React.FC<
    RovoDevContextItem & PromptContextItemToggleProps & PromptContextItemRemoveProps
> = ({ file: openFile, selection, enabled, onToggle, onRemove }) => {
    // Calculate line numbers if selection is present
    let lineInfo: string | null = null;
    if (selection) {
        // Show as 1-based line numbers, inclusive
        const startLine = selection.start + 1;
        const endLine = selection.end + 1;
        if (startLine !== endLine) {
            lineInfo = `:${startLine}-${endLine}`;
        } else {
            lineInfo = `:${startLine}`;
        }
    }
    return (
        <span style={chipStyle}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
                <i className="codicon codicon-file" style={iconStyle} />
                <span
                    style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 110,
                        marginRight: 4,
                    }}
                >
                    {openFile.name}
                </span>
                {lineInfo && (
                    <span
                        style={{
                            color: 'var(--vscode-editorWidget-foreground)',
                            opacity: 0.55,
                            marginLeft: 2,
                            fontSize: 10,
                        }}
                    >
                        {lineInfo}
                    </span>
                )}
            </span>

            {onToggle && (
                <button
                    type="button"
                    onClick={(e) => {
                        onToggle?.(!enabled);
                        e.stopPropagation();
                    }}
                    style={toggleButtonStyle(!!enabled)}
                    title={enabled ? 'Disable context' : 'Enable context'}
                >
                    <i className={enabled ? 'codicon codicon-eye' : 'codicon codicon-eye-closed'} />
                </button>
            )}

            {onRemove && (
                <button type="button" onClick={onRemove} style={removeButtonStyle} title="Remove context">
                    <i className="codicon codicon-close" />
                </button>
            )}
        </span>
    );
};

export const AddContextButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
    <span style={addButtonStyle} onClick={onClick} title="Add context">
        <i className="codicon codicon-add" style={buttonBaseStyle} />
    </span>
);
