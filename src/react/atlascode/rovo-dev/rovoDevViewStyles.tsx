import React from 'react';

export const rovoDevContainerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxSizing: 'border-box',
    backgroundColor: 'var(--vscode-editor-background)',
    fontSize: 'var(--vscode-font-size)',
    fontFamily: 'var(--vscode-font-family)',
    height: '100vh',
    margin: 'auto',
    maxWidth: '800px',
};

export const rovoDevInputSectionStyles: React.CSSProperties = {
    width: '100%',
    borderTop: '1px solid var(--vscode-panel-border)',
    background: 'var(--vscode-sideBar-background)',
    padding: '16px',
    borderRadius: '12px 12px 0px 0px',
};

export const rovoDevPromptContainerStyles: React.CSSProperties = {
    display: 'flex',
    width: '100%',
};

export const rovoDevTextareaStyles: React.CSSProperties = {
    width: '100%',
    background: 'inherit',
    color: 'var(--vscode-input-foreground)',
    resize: 'none',
    outline: 'none',
    border: 'none',
};

export const rovoDevButtonStyles: React.CSSProperties = {
    marginLeft: 'auto',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
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

export const rovoDevTextareaContainerStyles: React.CSSProperties = {
    width: '100%',
    border: '1px solid var(--vscode-input-border)',
    borderRadius: '2px',
    background: 'var(--vscode-input-background)',
    padding: '8px',
};

export const outerChatContainerStyles: React.CSSProperties = {
    width: '100%',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: '1',
    gap: '12px',
    padding: '10px 16px 0 16px',
};

export const chatMessagesContainerStyles: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
};

export const chatMessageStyles: React.CSSProperties = {
    maxWidth: '100%',
    marginBottom: '8px',
    padding: '8px 12px',
    borderRadius: '8px',
    position: 'relative',
};

export const userMessageStyles: React.CSSProperties = {
    backgroundColor: 'var(--vscode-editor-selectionBackground)',
    alignSelf: 'flex-end',
    borderBottomRightRadius: '0px',
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

export const undoKeepButtonStyles: React.CSSProperties = {
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '2px',
};

export const inlineModifyButtonStyles: React.CSSProperties = {
    padding: '2px 4px !important',
    backgroundColor: 'var(--vscode-list-hoverBackground)',
};

export const inChatButtonStyles: React.CSSProperties = {
    padding: '6px 12px',
    background: 'var(--vscode-button-background)',
    color: 'var(--vscode-button-foreground)',
    border: '1px solid var(--vscode-button-border)',
    borderRadius: '4px',
};
