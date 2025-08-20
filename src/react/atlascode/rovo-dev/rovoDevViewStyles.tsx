import React from 'react';

export const rovoDevTextareaStyles: React.CSSProperties = {
    width: '100%',
    minHeight: '20px',
    background: 'inherit',
    color: 'var(--vscode-input-foreground)',
    resize: 'none',
    outline: 'none',
    border: 'none',
    fontFamily: 'var(--vscode-font-family)',
    fontSize: 'var(--vscode-font-size)',
};

export const rovoDevPromptButtonStyles: React.CSSProperties = {
    color: 'var(--vscode-input-foreground) !important',
    border: '1px solid var(--vscode-button-border)',
    backgroundColor: 'var(--vscode-input-background)',
    marginLeft: '4px',
    marginTop: '1px',
    marginBottom: '1px',
};

export const rovoDevPromptButtonDisabledStyles: React.CSSProperties = {
    color: 'var(--vscode-disabledForeground) !important',
    backgroundColor: 'unset',
};

export const rovoDevPromptButtonToggledStyles: React.CSSProperties = {
    ...rovoDevPromptButtonStyles,
    margin: '0 4px',
    padding: '0 4px',
    gap: '2px',
    color: 'var(--vscode-inputOption-activeForeground) !important',
    backgroundColor: 'var(--vscode-inputOption-activeBackground)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: '4px',
    border: '1px solid var(--vscode-inputOption-activeBorder)',
};

export function rovoDevDeepPlanStylesSelector(isClicked: boolean, isDisabled: boolean): React.CSSProperties {
    if (isClicked && isDisabled) {
        return { ...rovoDevPromptButtonToggledStyles, ...rovoDevPromptButtonDisabledStyles };
    } else if (isDisabled) {
        return { ...rovoDevPromptButtonStyles, ...rovoDevPromptButtonDisabledStyles };
    } else if (isClicked) {
        return rovoDevPromptButtonToggledStyles;
    } else {
        return rovoDevPromptButtonStyles;
    }
}

export const chatMessageStyles: React.CSSProperties = {
    maxWidth: '100%',
    marginBottom: '8px',
    padding: '8px 12px',
    borderRadius: '8px',
    position: 'relative',
};

export const agentMessageStyles: React.CSSProperties = {
    backgroundColor: 'var(--vscode-sideBar-background)',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: '0px',
};

export const errorMessageStyles: React.CSSProperties = {
    alignSelf: 'flex-start',
    width: '100%',
    border: '1px solid var(--vscode-editorWidget-border)',
    borderBottomLeftRadius: '8px',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
};

export const messageContentStyles: React.CSSProperties = {
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    color: 'var(--vscode-editor-foreground)',
};

export const inChatButtonStyles: React.CSSProperties = {
    padding: '6px 12px',
    background: 'var(--vscode-button-background)',
    color: 'var(--vscode-button-foreground)',
    border: '1px solid var(--vscode-button-border)',
    borderRadius: '4px',
};
