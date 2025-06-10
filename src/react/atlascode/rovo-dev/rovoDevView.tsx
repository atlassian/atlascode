import IconButton from '@atlaskit/button';
import SearchIcon from '@atlaskit/icon/glyph/search';
import SendIcon from '@atlaskit/icon/glyph/send';
import { Marked } from '@ts-stack/markdown';
import hljs from 'highlight.js';
import React, { useCallback, useState } from 'react';
import { ChatMessage, FetchResponseData } from 'src/rovo-dev/utils';

import { useMessagingApi } from '../messagingApi';
import * as styles from './rovoDevViewStyles';

Marked.setOptions({
    sanitize: true,
    breaks: false,
    highlight: (code, lang) => {
        console.log('Highlighting code:', code, 'with language:', lang);
        return lang ? hljs.highlight(code, { language: lang }).value : hljs.highlightAuto(code).value;
    },
});

const RovoDevView: React.FC = () => {
    const [sendButtonDisabled, setSendButtonDisabled] = useState(false);
    const [promptContainerFocused, setPromptContainerFocused] = useState(false);

    const [promptText, setPromptText] = useState('');
    const [currentResponse, setCurrentResponse] = useState('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const chatEndRef = React.useRef<HTMLDivElement>(null);

    // Scroll to bottom when chat updates
    React.useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
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
        (data: FetchResponseData) => {
            console.log('Received response data:', data);
            switch (data.part_kind) {
                case 'text-chunk':
                    if (data.content === '' || !data.content) {
                        break;
                    }
                    appendCurrentResponse(data.content || '');
                    break;
                case 'tool-call':
                    const message: ChatMessage = {
                        text: `\n\n<TOOL_CALL>${data.tool_name}@@@@${data.args}</TOOL_CALL>\n\n`,
                        author: 'Tool',
                        timestamp: Date.now(),
                    };

                    handleAppendChatHistory(message);
                    break;
                case 'tool-return':
                    appendCurrentResponse(`\n\nTool return: ${data.tool_name} -> ${data.content}\n\n`);
                    break;
                default:
                    appendCurrentResponse(`\n\nUnknown part_kind: ${data.part_kind}\n\n`);
                    break;
            }
        },
        [appendCurrentResponse, handleAppendChatHistory],
    );

    const onMessageHandler = useCallback(
        (event: any): void => {
            switch (event.type) {
                case 'response': {
                    const data = event.dataObject;
                    handleResponse(data);
                    break;
                }

                case 'userChatMessage': {
                    handleAppendChatHistory(event.message);
                    break;
                }

                case 'completeMessage': {
                    const message: ChatMessage = {
                        text: currentResponse,
                        author: 'Agent',
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
                            author: 'Agent',
                            timestamp: Date.now(),
                        };

                        handleAppendChatHistory(message);
                        setCurrentResponse('');
                    } else {
                        setCurrentResponse(''); // Reset current response if it was just '...'
                    }

                    const dataObject = event.dataObject;

                    handleResponse(dataObject);
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

    // Function to render message content with tool call highlighting
    const renderMessageContent = (text: string) => {
        // Split the text by tool call markers
        const parts = text.trim().split(/(<TOOL_CALL>.*?<\/TOOL_CALL>)/g);

        return parts.map((part, index) => {
            if (part.match(/^<TOOL_CALL>.*<\/TOOL_CALL>$/)) {
                // Extract tool call information
                const toolCallContent = part.replace(/^<TOOL_CALL>/, '').replace(/<\/TOOL_CALL>$/, '');
                const [toolName, argsStr] = toolCallContent.split('@@@@');

                return (
                    <div style={styles.chatMessageStyles}>
                        <div key={index} style={styles.toolCallBubbleStyles}>
                            <div style={styles.toolIconStyles}>
                                <SearchIcon size="medium" label="Tool Call" />
                            </div>
                            <div style={styles.toolCallArgsStyles}>{handleToolCallArgs(toolName, argsStr)}</div>
                        </div>
                    </div>
                );
            } else {
                const htmlContent = Marked.parse(part);

                return (
                    <div
                        key={index}
                        // style={styles.messageContentStyles}
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                );
            }
        });
    };

    const handleToolCallArgs = useCallback(
        (toolName: string, args: string) => {
            console.log('Handling tool call args:', toolName, args);
            try {
                switch (toolName) {
                    case 'open_files':
                        const openFilesObj = JSON.parse(args);

                        if (openFilesObj.file_paths) {
                            return openFilesObj.file_paths.map((filePath: string) => {
                                return (
                                    <pre style={styles.toolCallArgsPreStyles}>
                                        Opening file{' '}
                                        <a onClick={() => openFile(filePath)} key={filePath}>
                                            {filePath}
                                        </a>
                                    </pre>
                                );
                            });
                        }
                        break;

                    case 'expand_code_chunks':
                        const expandCodeObj = JSON.parse(args);
                        if (!expandCodeObj.file_path) {
                            return;
                        }

                        if (expandCodeObj.line_ranges) {
                            const lineRanges = expandCodeObj.line_ranges;
                            return lineRanges.map((lineRange: any[]) => {
                                return (
                                    <pre style={styles.toolCallArgsPreStyles}>
                                        Expanding code chunks in{' '}
                                        <a
                                            onClick={() => openFile(expandCodeObj.file_path, lineRange)}
                                            key={expandCodeObj.file_path}
                                        >
                                            {`${expandCodeObj.file_path} lines ${lineRange[0]}-${lineRange[1]}`}
                                        </a>
                                    </pre>
                                );
                            });
                        } else {
                            return (
                                <pre style={styles.toolCallArgsPreStyles}>
                                    Expanding code chunks in{' '}
                                    <a onClick={() => openFile(expandCodeObj.file_path)} key={expandCodeObj.file_path}>
                                        {expandCodeObj.file_path}
                                    </a>
                                </pre>
                            );
                        }
                    default:
                        return (
                            <>
                                <pre style={styles.toolCallArgsPreStyles}>{args}</pre>
                            </>
                        );
                }
            } catch (error) {
                console.error('Error formatting tool call args:', error);
                return String(args);
            }
        },
        [openFile],
    );

    // Render chat message
    const renderChatMessage = (message: ChatMessage, index: number) => {
        const messageTypeStyles =
            message.author.toLowerCase() === 'user' ? styles.userMessageStyles : styles.agentMessageStyles;
        return (
            <div key={index} style={{ ...styles.chatMessageStyles, ...messageTypeStyles }}>
                <div style={styles.messageHeaderStyles}>
                    <span style={styles.messageAuthorStyles}>{message.author}</span>
                    <span style={styles.messageTimestampStyles}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                </div>
                <div style={styles.messageContentStyles}>{renderMessageContent(message.text)}</div>
            </div>
        );
    };

    return (
        <div style={styles.rovoDevContainerStyles}>
            <div style={styles.chatMessagesContainerStyles}>
                {chatHistory.map((msg, index) => {
                    if (msg.author === 'Tool') {
                        return renderMessageContent(msg.text);
                    } else {
                        return renderChatMessage(msg, index);
                    }
                })}

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
                            <span style={styles.messageAuthorStyles}>Agent</span>
                            <span style={styles.messageTimestampStyles}>{new Date().toLocaleTimeString()}</span>
                        </div>
                        <div style={styles.messageContentStyles}>{renderMessageContent(currentResponse)}</div>
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
                        <IconButton
                            style={{
                                color: 'var(--vscode-input-foreground) !important',
                                border: '1px solid var(--vscode-button-border) !important',
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
