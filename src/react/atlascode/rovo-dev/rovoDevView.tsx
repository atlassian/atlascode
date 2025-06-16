import LoadingButton from '@atlaskit/button/loading-button';
import SendIcon from '@atlaskit/icon/glyph/send';
import { highlightElement } from '@speed-highlight/core';
import { detectLanguage } from '@speed-highlight/core/detect';
import { Marked } from '@ts-stack/markdown';
import React, { useCallback, useState } from 'react';
import { RovoDevResponse } from 'src/rovo-dev/responseParser';

import { useMessagingApi } from '../messagingApi';
import * as styles from './rovoDevViewStyles';
import { ChatMessage, parseToolReturnMessage, ToolCallMessage, toolNameIconMap, ToolReturnMessage } from './utils';

Marked.setOptions({
    sanitize: true,
});

const RovoDevView: React.FC = () => {
    const [sendButtonDisabled, setSendButtonDisabled] = useState(true);
    const [promptContainerFocused, setPromptContainerFocused] = useState(false);

    const [promptText, setPromptText] = useState('');
    const [currentResponse, setCurrentResponse] = useState('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [pendingToolCall, setPendingToolCall] = useState<ToolCallMessage | null>(null);
    const chatEndRef = React.useRef<HTMLDivElement>(null);

    // Scroll to bottom when chat updates
    React.useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }

        const codeBlocks = document.querySelectorAll('pre code');

        codeBlocks.forEach((block) => {
            highlightElement(block, detectLanguage(block.textContent || ''));
        });
    }, [chatHistory, currentResponse]);

    const handleAppendChatHistory = useCallback(
        (message: ChatMessage) => {
            setChatHistory((prev) => [...prev, message]);
        },
        [setChatHistory],
    );

    const appendCurrentResponse = useCallback(
        (text) => {
            if (text) {
                setCurrentResponse((currentText) => {
                    if (!currentText || !currentText.trim() || currentText === '...') {
                        return text;
                    } else {
                        return currentText + text;
                    }
                });
            }
        },
        [setCurrentResponse],
    );

    const handleResponse = useCallback(
        (data: RovoDevResponse) => {
            console.log('Received response data:', data);
            switch (data.event_kind) {
                case 'text':
                    if (data.content === '' || !data.content) {
                        break;
                    }
                    appendCurrentResponse(data.content || '');
                    break;
                case 'tool-call':
                    const callMessage: ToolCallMessage = {
                        author: 'ToolCall',
                        tool_name: data.tool_name,
                        args: data.args,
                        tool_call_id: data.tool_call_id, // Optional ID for tracking
                    };

                    setPendingToolCall(callMessage);
                    break;
                case 'tool-return':
                    const returnMessage: ToolReturnMessage = {
                        author: 'ToolReturn',
                        tool_name: data.tool_name,
                        content: data.content || '',
                        tool_call_id: data.tool_call_id, // Optional ID for tracking
                        args: pendingToolCall?.args || undefined, // Use args from pending tool call if available
                    };
                    setPendingToolCall(null); // Clear pending tool call
                    handleAppendChatHistory(returnMessage);
                    break;
                default:
                    appendCurrentResponse(`\n\nUnknown part_kind: ${data.event_kind}\n\n`);
                    break;
            }
        },
        [appendCurrentResponse, handleAppendChatHistory, pendingToolCall],
    );

    const onMessageHandler = useCallback(
        (event: any): void => {
            switch (event.type) {
                case 'response': {
                    handleResponse(event.dataObject);
                    break;
                }

                case 'userChatMessage': {
                    handleAppendChatHistory(event.message);
                    break;
                }

                case 'completeMessage': {
                    const message: ChatMessage = {
                        text: currentResponse === '...' ? 'Error: Unable to retrieve the response' : currentResponse,
                        author: 'RovoDev',
                        timestamp: Date.now(),
                    };
                    handleAppendChatHistory(message);
                    setCurrentResponse('');
                    setSendButtonDisabled(false);
                    break;
                }

                case 'toolCall': {
                    if (currentResponse !== '...' && currentResponse.trim()) {
                        const message: ChatMessage = {
                            text: currentResponse,
                            author: 'RovoDev',
                            timestamp: Date.now(),
                        };

                        handleAppendChatHistory(message);
                        setCurrentResponse('');
                    } else {
                        setCurrentResponse(''); // Reset current response if it was just '...'
                    }

                    handleResponse(event.dataObject);
                    break;
                }

                case 'toolReturn': {
                    if (currentResponse !== '...' && currentResponse.trim()) {
                        const message: ChatMessage = {
                            text: currentResponse,
                            author: 'RovoDev',
                            timestamp: Date.now(),
                        };
                        handleAppendChatHistory(message);
                        setCurrentResponse('');
                    } else {
                        setCurrentResponse(''); // Reset current response if it was just '...'
                    }
                    handleResponse(event.dataObject);
                    break;
                }

                case 'errorMessage': {
                    handleAppendChatHistory(event.message);
                    setCurrentResponse('');
                    setSendButtonDisabled(false);
                    break;
                }

                case 'newSession': {
                    setChatHistory([]);
                    break;
                }

                case 'initialized': {
                    setSendButtonDisabled(false);
                    break;
                }

                default:
                    console.warn('Unknown message type:', event.type);
                    break;
            }
        },
        [handleResponse, handleAppendChatHistory, currentResponse],
    );

    const [postMessage] = useMessagingApi<any, any, any>(onMessageHandler);

    const sendPrompt = useCallback(
        (text: string): void => {
            if (sendButtonDisabled || text.trim() === '') {
                return;
            }

            setCurrentResponse('...');

            // Disable the send button
            setSendButtonDisabled(true);

            // Send the prompt to backend
            postMessage({
                type: 'prompt',
                text,
            });

            // Clear the input field
            setPromptText('');
        },
        [postMessage, setCurrentResponse, sendButtonDisabled, setSendButtonDisabled],
    );
    const openFile = useCallback(
        (filePath: string, range?: any[]) => {
            // Implement file opening logic here
            postMessage({
                type: 'openFile',
                filePath,
                range,
            });
        },
        [postMessage],
    );

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendPrompt(promptText);
            }
        },
        [sendPrompt, promptText],
    );

    // Function to render message content with tool highlighting
    const renderMessageContent = (message: ChatMessage) => {
        // Split the text by tool markers
        try {
            switch (message.author) {
                case 'ToolCall':
                    const toolCall = message as ToolCallMessage;

                    if (!toolCall.tool_name || !toolCall.args) {
                        return <div>Error: Invalid tool call message</div>;
                    }

                    return (
                        <div style={styles.chatMessageStyles}>
                            <div style={styles.toolCallBubbleStyles}>
                                <div style={styles.toolCallArgsStyles}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <i className="codicon codicon-loading codicon-modifier-spin" />
                                        {toolCall.tool_name}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                case 'ToolReturn':
                    const toolReturn = message as ToolReturnMessage;

                    if (!toolReturn.tool_name || !toolReturn.content) {
                        return <div>Error: Invalid tool return message</div>;
                    }

                    const parsed = parseToolReturnMessage(toolReturn);

                    return parsed.map(({ content, filePath, title }) => {
                        const iconClass = toolNameIconMap[toolReturn.tool_name] || 'codicon codicon-tools';
                        return (
                            <div style={styles.chatMessageStyles}>
                                <div style={styles.toolCallBubbleStyles}>
                                    <a
                                        onClick={() => filePath && openFile(filePath)}
                                        style={
                                            filePath
                                                ? { ...styles.toolCallArgsStyles, cursor: 'pointer' }
                                                : styles.toolCallArgsStyles
                                        }
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <i className={iconClass} />
                                            {title && <div style={{ fontWeight: 'bold' }}>{title}</div>}
                                        </div>
                                        <div style={{ fontSize: '9px', textAlign: 'right' }}>{content}</div>
                                    </a>
                                </div>
                            </div>
                        );
                    });
                default:
                    const htmlContent = Marked.parse(message.text);

                    return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
            }
        } catch (error) {
            console.error('Error rendering message content:', error);
            return <div>Error rendering message content</div>;
        }
    };

    // const toolContent = (content: string, filePath?: string, range?: any[]) =>
    //     filePath ? (
    //         <pre style={styles.toolCallArgsPreStyles}>
    //             {content} <a onClick={() => openFile(filePath, range)}>{filePath}</a>
    //         </pre>
    //     ) : (
    //         <pre style={styles.toolCallArgsPreStyles}>{content}</pre>
    //     );

    // Render chat message
    const renderChatMessage = (message: ChatMessage, index: number) => {
        const messageTypeStyles =
            message.author.toLowerCase() === 'user' ? styles.userMessageStyles : styles.agentMessageStyles;
        return (
            <div key={index} style={{ ...styles.chatMessageStyles, ...messageTypeStyles }}>
                <div style={styles.messageHeaderStyles}>
                    <span style={styles.messageAuthorStyles}>{message.author}</span>
                </div>
                <div style={styles.messageContentStyles}>{renderMessageContent(message)}</div>
            </div>
        );
    };

    return (
        <div className="rovoDevChat" style={styles.rovoDevContainerStyles}>
            <div style={styles.chatMessagesContainerStyles}>
                {chatHistory.map((msg, index) => {
                    if (msg.author === 'ToolCall' || msg.author === 'ToolReturn') {
                        return renderMessageContent(msg);
                    } else {
                        return renderChatMessage(msg, index);
                    }
                })}
                {pendingToolCall && renderMessageContent(pendingToolCall)}
                {/* Show streaming response if available */}
                {currentResponse && (
                    <div
                        style={{
                            ...styles.chatMessageStyles,
                            ...styles.agentMessageStyles,
                            ...styles.streamingMessageStyles,
                        }}
                    >
                        <div style={styles.messageHeaderStyles}>
                            <span style={styles.messageAuthorStyles}>RovoDev is typing...</span>
                            <span style={styles.messageTimestampStyles}>{new Date().toLocaleTimeString()}</span>
                        </div>
                        <div style={styles.messageContentStyles}>
                            {renderMessageContent({ text: currentResponse, author: 'RovoDev', timestamp: Date.now() })}
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <div style={styles.rovoDevPromptContainerStyles}>
                <div
                    onFocus={() => setPromptContainerFocused(true)}
                    onBlur={() => setPromptContainerFocused(false)}
                    style={
                        promptContainerFocused
                            ? {
                                  ...styles.rovoDevTextareaContainerStyles,
                                  outline: 'var(--vscode-focusBorder) solid 1px',
                              }
                            : styles.rovoDevTextareaContainerStyles
                    }
                >
                    <textarea
                        style={styles.rovoDevTextareaStyles}
                        placeholder="Write a prompt to get started"
                        onChange={(element) => setPromptText(element.target.value)}
                        onKeyDown={handleKeyDown}
                        value={promptText}
                    />
                    <div style={styles.rovoDevButtonStyles}>
                        <LoadingButton
                            style={{
                                color: 'var(--vscode-input-foreground) !important',
                                border: '1px solid var(--vscode-button-border) !important',
                                backgroundColor: 'var(--vscode-input-background) !important',
                            }}
                            label="Send button"
                            iconBefore={<SendIcon size="small" label="Send" />}
                            isDisabled={sendButtonDisabled}
                            onClick={() => sendPrompt(promptText)}
                        />
                    </div>
                </div>
            </div>

            <br />
            <br />
        </div>
    );
};

export default RovoDevView;
