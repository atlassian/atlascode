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
};

export const rovoDevTextareaContainerStyles: React.CSSProperties = {
    width: '100%',
    border: '1px solid var(--vscode-input-border)',
    borderRadius: '2px',
    background: 'var(--vscode-input-background)',
    padding: '8px',
};

export const chatMessagesContainerStyles: React.CSSProperties = {
    width: '100%',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: '1',
    padding: '10px 16px 0 16px',
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
    backgroundColor: 'var(--vscode-sideBar-background)',
    alignSelf: 'flex-start',
    width: '100%',
    border: 'red solid 1px',
    borderBottomLeftRadius: '8px',
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

export const inlineMofidyButtonStyles: React.CSSProperties = {
    padding: '2px 4px !important',
    backgroundColor: 'var(--vscode-list-hoverBackground)',
};
