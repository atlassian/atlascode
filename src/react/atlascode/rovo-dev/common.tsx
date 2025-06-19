import { Marked } from '@ts-stack/markdown';
import React from 'react';

import {
    agentMessageStyles,
    chatMessageStyles,
    messageContentStyles,
    toolCallArgsStyles,
    toolReturnListItemStyles,
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
    sanitize: true,
    breaks: true,
});

export const ToolDrawer: React.FC<{
    content: ToolReturnGenericMessage[];
    openFile: (filePath: string, lineRange?: any[]) => void;
    isStreaming?: boolean;
}> = ({ content, openFile, isStreaming = false }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    const parsedMessages = content.flatMap((message) => parseToolReturnMessage(message));
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
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
    openFile: (filePath: string, lineRange?: any[]) => void;
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

export const ChatMessageItem: React.FC<{ msg: DefaultMessage; index?: number }> = ({ msg, index }) => {
    const messageTypeStyles = msg.author.toLowerCase() === 'user' ? userMessageStyles : agentMessageStyles;

    const htmlContent = Marked.parse(msg.text);

    return (
        <div key={index} style={{ ...chatMessageStyles, ...messageTypeStyles }}>
            <div style={messageContentStyles}>
                <div
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                    key="parsed-content"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
            </div>
        </div>
    );
};

export const renderChatHistory = (
    msg: ChatMessage,
    index: number,
    openFile: (filePath: string, lineRange?: any[]) => void,
) => {
    switch (msg.author) {
        case 'ReturnGroup':
            return <ToolDrawer key={index} content={msg.tool_returns} openFile={openFile} />;
        case 'RovoDev':
        case 'User':
            return <ChatMessageItem index={index} msg={msg} />;
        default:
            return <div key={index}>Unknown message type</div>;
    }
};

export const UpdatedFilesComponent: React.FC<{
    modidiedFiles: ToolReturnGenericMessage[];
    onUndo: () => void;
    onAccept: () => void;
    openDiff: (filePath: string) => void;
}> = ({ modidiedFiles, onUndo, onAccept, openDiff }) => {
    const [isUndoHovered, setIsUndoHovered] = React.useState(false);
    const [isAcceptHovered, setIsAcceptHovered] = React.useState(false);

    const parsedReturns = modidiedFiles.flatMap((msg) => parseToolReturnMessage(msg));

    const uniqueParsedReturns = Array.from(new Map(parsedReturns.map((item) => [item.filePath, item])).values()); // Ensure unique file paths

    return modidiedFiles && modidiedFiles.length > 0 ? (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                background: 'var(--vscode-sideBar-background)',
                borderRadius: '4px 4px 0 0',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '8px',
                    alignItems: 'center',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px' }}>
                    <i className="codicon codicon-source-control" />
                    <span style={{ fontWeight: 'bold' }}>{uniqueParsedReturns.length} Updated file(s)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
                    <button
                        style={{
                            color: 'var(--vscode-button-secondaryForeground)',
                            backgroundColor: isUndoHovered
                                ? 'var(--vscode-button-secondaryHoverBackground)'
                                : 'var(--vscode-button-secondaryBackground)',
                            border: '1px solid var(--vscode-button-secondaryBorder)',
                            cursor: 'pointer',
                            padding: '2px 6px',
                        }}
                        onClick={() => onUndo()}
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
                            cursor: 'pointer',
                            padding: '2px 6px',
                        }}
                        onClick={() => onAccept()}
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
                    padding: '0 8px 8px',
                }}
            >
                {uniqueParsedReturns &&
                    uniqueParsedReturns.length > 0 &&
                    uniqueParsedReturns.map((msg, index) => {
                        return <ModifiedFileItem key={index} msg={msg} openDiff={openDiff} />;
                    })}
            </div>
        </div>
    ) : null;
};

export const ModifiedFileItem: React.FC<{
    msg: ToolReturnParseResult;
    openDiff: (filePath: string) => void;
}> = ({ msg, openDiff }) => {
    const [isHovered, setIsHovered] = React.useState(false);

    if (!msg.filePath || !msg.title) {
        return null;
    }

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
                lineHeight: '22px',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                borderRadius: '4px',
                width: '100%',
            }}
            onClick={() => msg.filePath && openDiff(msg.filePath)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div>{msg.title}</div>
            <div style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '11px' }}>{msg.filePath}</div>
        </div>
    );
};
