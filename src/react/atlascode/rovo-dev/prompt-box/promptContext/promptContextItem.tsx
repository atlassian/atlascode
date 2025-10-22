import React from 'react';
import { RovoDevFileContext } from 'src/rovo-dev/rovoDevTypes';

import { OpenFileFunc, OpenJiraFunc } from '../../common/common';

const isHighContrastTheme = (): boolean => {
    return (
        document.body.classList.contains('vscode-high-contrast') ||
        document.body.classList.contains('vscode-high-contrast-light')
    );
};

const JiraLogo: React.FC<{
    size: number;
    marginRight: number;
}> = ({ size, marginRight }) => (
    <svg
        width={size}
        height={size}
        style={{ marginRight }}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M0 12C0 5.37258 5.37258 0 12 0H36C42.6274 0 48 5.37258 48 12V36C48 42.6274 42.6274 48 36 48H12C5.37258 48 0 42.6274 0 36V12Z"
            fill="#1868DB"
        />
        <g clip-path="url(#clip0_1_5403)">
            <path
                d="M17.9475 31.0469H15.2429C11.1638 31.0469 8.23755 28.5484 8.23755 24.8899H22.7804C23.5341 24.8899 24.0218 25.4252 24.0218 26.1837V40.8178C20.3861 40.8178 17.9475 37.8731 17.9475 33.7684V31.0469ZM25.1303 23.7745H22.4257C18.3466 23.7745 15.4203 21.3206 15.4203 17.6621H29.9631C30.7168 17.6621 31.2489 18.1528 31.2489 18.9113V33.5454C27.6132 33.5454 25.1303 30.6007 25.1303 26.496V23.7745ZM32.3573 16.5467H29.6527C25.5736 16.5467 22.6473 14.0482 22.6473 10.3896H37.1902C37.9439 10.3896 38.4316 10.925 38.4316 11.6389V26.273C34.7959 26.273 32.3573 23.3283 32.3573 19.2236V16.5467Z"
                fill="white"
            />
        </g>
        <defs>
            <clipPath id="clip0_1_5403">
                <rect width="30.1941" height="30.4281" fill="white" transform="translate(8.23755 10.3901)" />
            </clipPath>
        </defs>
    </svg>
);

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

export type PromptContextItemOpenFileProps = {
    openFile: OpenFileFunc;
};

export const PromptContextFileItem: React.FC<
    Omit<RovoDevFileContext, 'contextType'> &
        PromptContextItemToggleProps &
        PromptContextItemRemoveProps &
        PromptContextItemOpenFileProps
> = ({ file, selection, enabled, onToggle, onRemove, openFile }) => {
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
                <i className="codicon codicon-file" style={{ fontSize: 13, marginRight: 4 }} />
                <span
                    style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 110,
                        marginRight: 4,
                        cursor: 'pointer',
                    }}
                    onClick={() => {
                        if (openFile && selection) {
                            openFile(file.absolutePath, false, [selection.start + 1, selection.end + 1]);
                        } else if (openFile) {
                            openFile(file.absolutePath);
                        }
                    }}
                    title={file.absolutePath}
                >
                    {file.name}
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

export const PromptContextJiraItem: React.FC<
    { name: string; url: string; openJira: OpenJiraFunc } & PromptContextItemRemoveProps
> = ({ name, url, onRemove, openJira }) => {
    return (
        <span style={chipStyle}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
                <JiraLogo size={13} marginRight={4} />
                <span
                    style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 110,
                        marginRight: 4,
                        cursor: 'pointer',
                    }}
                    onClick={() => openJira(url)}
                    title={name}
                >
                    {name}
                </span>
            </span>

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
