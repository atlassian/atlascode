import Button from '@atlaskit/button';
import CheckIcon from '@atlaskit/icon/glyph/check';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import { Marked } from '@ts-stack/markdown';
import React, { useCallback } from 'react';

import {
    agentMessageStyles,
    chatMessageStyles,
    inlineMofidyButtonStyles,
    messageContentStyles,
    toolCallArgsStyles,
    toolReturnListItemStyles,
    undoAcceptButtonStyles,
    userMessageStyles,
} from './rovoDevViewStyles';
import {
    ChatMessage,
    DefaultMessage,
    parseToolReturnMessage,
    ToolCallMessage,
    ToolReturnGenericMessage,
    ToolReturnParseResult,
} from './utils';

Marked.setOptions({
    sanitize: false,
    breaks: true,
    smartLists: true,
    gfm: true,
});

interface OpenFileFunc {
    (filePath: string, tryShowDiff?: boolean, lineRange?: number[]): void;
}

// TODO unused - should it be cleaned up?
export const ToolDrawer: React.FC<{
    content: ToolReturnGenericMessage[];
    openFile: OpenFileFunc;
    isStreaming?: boolean;
}> = ({ content, openFile, isStreaming = false }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    const parsedMessages = content.flatMap((message) => parseToolReturnMessage(message));
    return (
        <div
            style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                marginBottom: '8px',
            }}
            onClick={() => setIsOpen(!isOpen)}
        >
            <div
                style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: '8px',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'row', gap: '4px', alignItems: 'center' }}>
                    {isStreaming ? (
                        <i className="codicon codicon-loading codicon-modifier-spin" />
                    ) : (
                        <i className="codicon codicon-tools"></i>
                    )}
                    <div style={{ fontWeight: 'bold' }}>Tool Calls</div>
                    {!isOpen && <div style={{ fontSize: '9px' }}>{`+${parsedMessages.length}`}</div>}
                </div>
                {isOpen ? <i className="codicon codicon-chevron-down" /> : <i className="codicon codicon-chevron-up" />}
            </div>
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto',
                    gap: '4px',
                }}
            >
                {isOpen &&
                    parsedMessages.map((parsedMsg, index) => {
                        return <ToolReturnParsedItem key={index} msg={parsedMsg} openFile={openFile} />;
                    })}
            </div>
        </div>
    );
};

export const ToolCallItem: React.FC<{ msg: ToolCallMessage }> = ({ msg }) => {
    if (!msg.tool_name || !msg.args) {
        return <div key="invalid-tool-call">Error: Invalid tool call message</div>;
    }

    return (
        <div key="tool-call" style={chatMessageStyles}>
            <div style={toolCallArgsStyles}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="codicon codicon-loading codicon-modifier-spin" />
                    {msg.tool_name}
                </div>
            </div>
        </div>
    );
};

const ToolReturnParsedItem: React.FC<{
    msg: ToolReturnParseResult;
    openFile: OpenFileFunc;
}> = ({ msg, openFile }) => {
    const [isHovered, setIsHovered] = React.useState(false);

    return (
        <div
            style={toolReturnListItemStyles}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <a
                onClick={() => msg.filePath && openFile(msg.filePath)}
                style={
                    msg.filePath && isHovered
                        ? {
                              ...toolCallArgsStyles,
                              cursor: 'pointer',
                              backgroundColor: 'var(--vscode-list-hoverBackground)',
                          }
                        : toolCallArgsStyles
                }
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {msg.title && <div style={{ fontWeight: 'bold' }}>{msg.title}</div>}
                </div>
                <div style={{ fontSize: '9px', textAlign: 'right' }}>{msg.content}</div>
            </a>
        </div>
    );
};

export const ChatMessageItem: React.FC<{
    msg: DefaultMessage;
    index?: number;
    openFile: OpenFileFunc;
}> = ({ msg, index, openFile }) => {
    const messageTypeStyles = msg.author.toLowerCase() === 'user' ? userMessageStyles : agentMessageStyles;

    const text = msg.text || '';

    const parts = text.trim().split(/(<TOOL_RETURN>.*<\/TOOL_RETURN>)/g);
    const content = parts.flatMap((part) => {
        try {
            if (part.match(/^<TOOL_RETURN>.*<\/TOOL_RETURN>$/)) {
                const toolReturnContent = part
                    .replace(/^<TOOL_RETURN>/, '')
                    .replace(/<\/TOOL_RETURN>$/, '')
                    .trim();

                const toolReturnMessage: ToolReturnGenericMessage = JSON.parse(toolReturnContent);
                console.log('Parsed Tool Return Message:', toolReturnMessage);
                const parsedMessages = parseToolReturnMessage(toolReturnMessage);
                return parsedMessages.map((message, idx) => (
                    <ToolReturnParsedItem key={idx} msg={message} openFile={openFile} />
                ));
            } else {
                const htmlContent = Marked.parse(part);

                return (
                    <div
                        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                        key="parsed-content"
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                );
            }
        } catch (error) {
            console.error('Error parsing message content:', error);
            return <div key="error-content">Error parsing content</div>;
        }
    });

    return (
        <div key={index} style={{ ...chatMessageStyles, ...messageTypeStyles }}>
            <div style={messageContentStyles}>{content}</div>
        </div>
    );
};

export const renderChatHistory = (msg: ChatMessage, index: number, openFile: OpenFileFunc) => {
    switch (msg.author) {
        case 'ToolReturn':
            const parsedMessages = parseToolReturnMessage(msg);
            return parsedMessages.map((message) => (
                <ToolReturnParsedItem key={index} msg={message} openFile={openFile} />
            ));
        case 'RovoDev':
        case 'User':
            return <ChatMessageItem index={index} msg={msg} openFile={openFile} />;
        default:
            return <div key={index}>Unknown message type</div>;
    }
};

export const UpdatedFilesComponent: React.FC<{
    modifiedFiles: ToolReturnParseResult[];
    onUndo: (filePath: string[]) => void;
    onAccept: (filePath: string[]) => void;
    openDiff: OpenFileFunc;
}> = ({ modifiedFiles, onUndo, onAccept, openDiff }) => {
    const [isUndoHovered, setIsUndoHovered] = React.useState(false);
    const [isAcceptHovered, setIsAcceptHovered] = React.useState(false);

    const handleAcceptAll = useCallback(() => {
        const filePaths = modifiedFiles.map((msg) => msg.filePath).filter((path) => path !== undefined);
        onAccept(filePaths);
    }, [onAccept, modifiedFiles]);

    const handleUndoAll = useCallback(() => {
        const filePaths = modifiedFiles.map((msg) => msg.filePath).filter((path) => path !== undefined);
        onUndo(filePaths);
    }, [onUndo, modifiedFiles]);

    if (!modifiedFiles || modifiedFiles.length === 0) {
        return null;
    }

    return (
        <div
            style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: 'var(--vscode-sideBar-background)',
                paddingBottom: '4px',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: ' 0 8px',
                    alignItems: 'center',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px' }}>
                    <i className="codicon codicon-source-control" />
                    <span style={{ fontWeight: 'bold' }}>{modifiedFiles.length} Updated file(s)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
                    <button
                        style={{
                            color: 'var(--vscode-button-secondaryForeground)',
                            backgroundColor: isUndoHovered
                                ? 'var(--vscode-button-secondaryHoverBackground)'
                                : 'var(--vscode-button-secondaryBackground)',
                            border: '1px solid var(--vscode-button-secondaryBorder)',
                            ...undoAcceptButtonStyles,
                        }}
                        onClick={() => handleUndoAll()}
                        onMouseEnter={() => setIsUndoHovered(true)}
                        onMouseLeave={() => setIsUndoHovered(false)}
                    >
                        Undo
                    </button>
                    <button
                        style={{
                            color: 'var(--vscode-button-foreground)',
                            backgroundColor: isAcceptHovered
                                ? 'var(--vscode-button-hoverBackground)'
                                : 'var(--vscode-button-background)',
                            border: '1px solid var(--vscode-button-border)',
                            ...undoAcceptButtonStyles,
                        }}
                        onClick={() => handleAcceptAll()}
                        onMouseEnter={() => setIsAcceptHovered(true)}
                        onMouseLeave={() => setIsAcceptHovered(false)}
                    >
                        Accept
                    </button>
                </div>
            </div>
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    overflowY: 'auto',
                    maxHeight: '100px',
                    padding: '4px 8px',
                    borderTop: '1px solid var(--vscode-panel-border)',
                }}
            >
                {modifiedFiles.map((msg, index) => {
                    return (
                        <ModifiedFileItem
                            key={index}
                            msg={msg}
                            onFileClick={(path: string) => openDiff(path, true)}
                            onUndo={(path: string) => onUndo([path])}
                            onAccept={(path: string) => onAccept([path])}
                        />
                    );
                })}
            </div>
        </div>
    );
};

const ModifiedFileItem: React.FC<{
    msg: ToolReturnParseResult;
    onUndo: (filePath: string) => void;
    onAccept: (filePath: string) => void;
    onFileClick: (filePath: string) => void;
}> = ({ msg, onUndo, onAccept, onFileClick }) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const [isUndoHovered, setIsUndoHovered] = React.useState(false);
    const [isAcceptHovered, setIsAcceptHovered] = React.useState(false);

    const filePath = msg.filePath;
    if (!filePath) {
        return null;
    }

    const handleUndo = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUndo(filePath);
    };

    const handleAccept = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAccept(filePath);
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: isHovered ? 'var(--vscode-list-hoverBackground)' : 'inherit',
                cursor: 'pointer',
                padding: '2px 8px',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                width: '100%',
            }}
            onClick={() => onFileClick(filePath)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div>{filePath}</div>
            <div
                style={{ display: isHovered ? 'flex' : 'none', alignItems: 'center', flexDirection: 'row', gap: '4px' }}
            >
                <Button
                    spacing="none"
                    style={{
                        ...inlineMofidyButtonStyles,
                        color: isUndoHovered
                            ? 'var(--vscode-textLink-foreground) !important'
                            : 'var(--vscode-textForeground) !important',
                    }}
                    onMouseEnter={() => setIsUndoHovered(true)}
                    onMouseLeave={() => setIsUndoHovered(false)}
                    iconBefore={<CrossIcon size="small" label="Close" />}
                    onClick={handleUndo}
                />
                <Button
                    style={{
                        ...inlineMofidyButtonStyles,
                        color: isAcceptHovered
                            ? 'var(--vscode-textLink-foreground) !important'
                            : 'var(--vscode-textForeground) !important',
                    }}
                    onMouseEnter={() => setIsAcceptHovered(true)}
                    onMouseLeave={() => setIsAcceptHovered(false)}
                    spacing="none"
                    iconBefore={<CheckIcon size="small" label="Accept" />}
                    onClick={handleAccept}
                />
            </div>
        </div>
    );
};
