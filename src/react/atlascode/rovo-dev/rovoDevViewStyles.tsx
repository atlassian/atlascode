export const rovoDevContainerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxSizing: 'border-box',
    backgroundColor: 'var(--vscode-editor-background)',
    fontSize: 'var(--vscode-font-size)',
    fontFamily: 'var(--vscode-font-family)',
    height: '100vh',
    margin: '0 -20px',
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
    display: 'flex',
    flexDirection: 'column',
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

export const toolReturnListItemStyles: React.CSSProperties = {
    width: '100%',
    margin: '4px 0',
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

export const streamingMessageStyles: React.CSSProperties = {
    border: '1px dashed var(--vscode-activityBarBadge-background)',
};

export const messageHeaderStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
};

export const messageAuthorStyles: React.CSSProperties = {
    fontWeight: 'bold',
    color: 'var(--vscode-editor-foreground)',
    opacity: 0.8,
};

export const messageTimestampStyles: React.CSSProperties = {
    fontSize: '12px',
    color: 'var(--vscode-editor-foreground)',
    opacity: 0.6,
};

export const messageContentStyles: React.CSSProperties = {
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    color: 'var(--vscode-editor-foreground)',
};

export const toolCallBubbleStyles: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '4px',
};

export const toolCallHeaderStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
    fontWeight: 'bold',
    color: 'var(--vscode-terminal-foreground)',
};

export const toolCallArgsStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 8px',
    width: '100%',
    backgroundColor: 'inherit',
    borderRadius: '4px',
    border: '1px solid var(--vscode-editorGroup-border)',
    color: 'var(--vscode-input-placeholderForeground)',
    maxLines: 1,
    overflow: 'ellipsis',
    lineHeight: '1.5em',
};

export const toolCallArgsPreStyles: React.CSSProperties = {
    margin: 0,
    fontSize: '12px',
    background: 'inherit',
    color: 'var(--vscode-descriptionForeground)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
};

export const toolIconStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 'auto',
};

export const modifiedFileComponentStyles: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px',
    borderRadius: '4px',
    backgroundColor: 'var(--vscode-editorWidget-background)',
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
